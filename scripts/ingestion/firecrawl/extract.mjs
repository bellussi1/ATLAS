#!/usr/bin/env node
/**
 * Extração local de fontes políticas, históricas, sociológicas e filosóficas via Firecrawl Local.
 *
 *   node scripts/ingestion/firecrawl/extract.mjs [--domain <domínio>] [--limit N] [--concurrency N] [--force]
 *
 * Os corpos em Markdown e metadados ficam em `generated/firecrawl-corpus/` (ignorado pelo Git),
 * preservando proveniência completa (`url`, `license`, `usagePolicy`, `sha256`, `scrapedAt`).
 * Nunca envia tráfego para o Firecrawl Cloud (`FIRECRAWL_CLOUD=off`).
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { z } from 'zod';

import { scrapeViaCli, scrapeViaHttp, startLocalServer } from './client.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(here, '../../..');
export const defaultSeedsPath = join(here, 'seeds.json');
export const defaultOutputDir = join(projectRoot, 'generated', 'firecrawl-corpus');

export const seedSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  domain: z.enum([
    'filosofia-politica',
    'sociologia',
    'historia-brasil',
    'historia-mundial',
    'documento-primario',
  ]),
  language: z.enum(['pt-BR', 'en', 'es', 'fr']),
  sourceName: z.string().min(1),
  url: z.url({ protocol: /^https$/ }),
  license: z.string().min(1),
  usagePolicy: z.enum(['open-reuse', 'reference-only']),
  atlasGap: z.string().nullable(),
  /** Campos opcionais preenchidos pela descoberta (`discover.mjs`). */
  origin: z.enum(['curated', 'discovery']).optional(),
  review: z.enum(['pending', 'approved']).optional(),
  discoveredFrom: z.string().min(1).optional(),
  discoveredAt: z.string().min(1).optional(),
  score: z.number().int().min(0).max(100).optional(),
});

export const seedsFileSchema = z.object({
  schemaVersion: z.literal(1),
  description: z.string().min(1),
  seeds: z.array(seedSchema).min(1),
});

export function extractHeadings(markdown) {
  const headings = [];
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
    if (match) headings.push(match[2].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim());
  }
  return headings.slice(0, 40);
}

export function countWords(markdown) {
  const cleaned = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`~|-]/g, ' ');
  const tokens = cleaned.trim().split(/\s+/).filter(Boolean);
  return tokens.length;
}

export function sha256Text(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function detectHttpOrSoftError(markdown, metadata = {}) {
  const statusCode = Number(metadata?.statusCode ?? metadata?.status_code ?? 0);
  if (statusCode >= 400) return `HTTP ${statusCode}`;
  const words = countWords(markdown);
  if (
    words < 60 &&
    /\b(404|not found|object not found|página não encontrada|page not found)\b/i.test(markdown)
  ) {
    return 'Página 404 / Not Found detectada no conteúdo';
  }
  return null;
}

export async function loadSeeds(seedsPath = defaultSeedsPath) {
  const raw = JSON.parse(await readFile(seedsPath, 'utf8'));
  return seedsFileSchema.parse(raw);
}

async function readExistingMeta(metaPath) {
  try {
    return JSON.parse(await readFile(metaPath, 'utf8'));
  } catch {
    return null;
  }
}

async function readJsonManifest(manifestPath) {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    return null;
  }
}

export async function runExtraction({
  seedsPath = defaultSeedsPath,
  outputDir = defaultOutputDir,
  domain = null,
  slug = null,
  limit = null,
  concurrency = 4,
  force = false,
  port = 3002,
} = {}) {
  const { seeds } = await loadSeeds(seedsPath);
  let selected = domain ? seeds.filter((s) => s.domain === domain) : seeds;
  if (slug?.length) {
    const wanted = new Set(slug);
    selected = selected.filter((s) => wanted.has(s.slug));
  }
  if (limit && limit > 0) selected = selected.slice(0, limit);

  await mkdir(outputDir, { recursive: true });

  let server = null;
  let useHttp = false;
  try {
    server = await startLocalServer({ port });
    useHttp = true;
    console.log(
      `[firecrawl-local] Servidor local ativo em ${server.apiUrl} (reused=${server.reused}, FIRECRAWL_CLOUD=off)`,
    );
  } catch (err) {
    console.warn(`[firecrawl-local] Aviso ao subir serve (${err.message}); usando fallback CLI.`);
  }

  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < selected.length) {
      const seed = selected[cursor++];
      const domainDir = join(outputDir, seed.domain);
      const mdPath = join(domainDir, `${seed.slug}.md`);
      const metaPath = join(domainDir, `${seed.slug}.meta.json`);

      if (!force) {
        const existing = await readExistingMeta(metaPath);
        if (existing?.status === 'ok' && existing.wordCount > 50) {
          console.log(`[skip] ${seed.domain}/${seed.slug} (${existing.wordCount} palavras)`);
          results.push(existing);
          continue;
        }
      }

      const startedAt = Date.now();
      try {
        const scraped = useHttp
          ? await scrapeViaHttp(seed.url, { apiUrl: server.apiUrl })
          : await scrapeViaCli(seed.url);
        const markdown = (scraped.markdown || '').trim();
        if (!markdown) throw new Error('Markdown vazio retornado pelo scraper');
        const softErr = detectHttpOrSoftError(markdown, scraped.metadata);
        if (softErr) throw new Error(softErr);

        await mkdir(domainDir, { recursive: true });
        await writeFile(mdPath, `${markdown}\n`, 'utf8');

        const entry = {
          ...seed,
          status: 'ok',
          scrapedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt,
          bytes: Buffer.byteLength(markdown, 'utf8'),
          wordCount: countWords(markdown),
          sha256: sha256Text(markdown),
          pageTitle: scraped.metadata?.title ?? null,
          headingsCount: extractHeadings(markdown).length,
          headingsSample: extractHeadings(markdown).slice(0, 10),
          localMarkdownPath: join(seed.domain, `${seed.slug}.md`).replace(/\\/g, '/'),
        };
        await writeFile(metaPath, `${JSON.stringify(entry, null, 2)}\n`, 'utf8');
        console.log(
          `[ok] ${seed.domain}/${seed.slug} — ${entry.wordCount} palavras (${entry.durationMs} ms)`,
        );
        results.push(entry);
      } catch (error) {
        const failed = {
          ...seed,
          status: 'error',
          scrapedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt,
          error: error.message,
        };
        console.error(`[erro] ${seed.domain}/${seed.slug}: ${error.message}`);
        results.push(failed);
      }
    }
  }

  try {
    const workers = Array.from({ length: Math.min(concurrency, selected.length || 1) }, () =>
      worker(),
    );
    await Promise.all(workers);
  } finally {
    server?.stop();
  }

  const okItems = results.filter((r) => r.status === 'ok');
  const totalWords = okItems.reduce((sum, item) => sum + (item.wordCount || 0), 0);
  const totalBytes = okItems.reduce((sum, item) => sum + (item.bytes || 0), 0);

  const manifestPath = join(outputDir, 'manifest.json');
  // Um lote parcial (`--slug`, `--domain`, `--limit`) não pode apagar o manifesto
  // do corpus inteiro: mescla os itens processados com os que já estavam em disco.
  const previous = await readJsonManifest(manifestPath);
  const mergedBySlug = new Map((previous?.items ?? []).map((item) => [item.slug, item]));
  for (const item of results) mergedBySlug.set(item.slug, item);
  const items = [...mergedBySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug, 'en'));
  const mergedOk = items.filter((item) => item.status === 'ok');

  const manifest = {
    schemaVersion: 1,
    kind: 'firecrawl-local-corpus',
    generatedAt: new Date().toISOString(),
    summary: {
      totalSeeds: items.length,
      succeeded: mergedOk.length,
      failed: items.length - mergedOk.length,
      totalWords: mergedOk.reduce((sum, item) => sum + (item.wordCount || 0), 0),
      totalBytes: mergedOk.reduce((sum, item) => sum + (item.bytes || 0), 0),
      byDomain: mergedOk.reduce((acc, item) => {
        acc[item.domain] = (acc[item.domain] || 0) + 1;
        return acc;
      }, {}),
      byUsagePolicy: mergedOk.reduce((acc, item) => {
        acc[item.usagePolicy] = (acc[item.usagePolicy] || 0) + 1;
        return acc;
      }, {}),
    },
    items,
  };

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(
    `\nResumo do lote: ${okItems.length}/${selected.length} extraídos | ${totalWords.toLocaleString('pt-BR')} palavras | corpus: ${manifest.summary.succeeded}/${manifest.summary.totalSeeds} fontes | manifest em ${manifestPath}`,
  );
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({
    options: {
      domain: { type: 'string' },
      slug: { type: 'string', multiple: true, default: [] },
      limit: { type: 'string' },
      concurrency: { type: 'string', default: '4' },
      force: { type: 'boolean', default: false },
      port: { type: 'string', default: '3002' },
    },
  });

  const manifest = await runExtraction({
    domain: values.domain ?? null,
    slug: values.slug.length > 0 ? values.slug : null,
    limit: values.limit ? Number.parseInt(values.limit, 10) : null,
    concurrency: Number.parseInt(values.concurrency, 10) || 4,
    force: values.force,
    port: Number.parseInt(values.port, 10) || 3002,
  });

  if (manifest.summary.succeeded === 0 && manifest.summary.totalSeeds > 0) {
    process.exitCode = 1;
  }
}
