#!/usr/bin/env node
/**
 * Pauta local da série do LinkedIn.
 *
 *   node docs/social/linkedin/schedule.mjs [--today AAAA-MM-DD] [--write] [--json]
 *
 * Lê `calendario.md` e cada `posts/<pasta>/post.txt`, confere os três links
 * obrigatórios, a barra final antes do UTM, o carrossel e as quatro imagens,
 * e mostra o que está pronto, o que falta e a próxima data. Não publica nada.
 *
 * `--write` grava `pauta.md` e `pauta.json` na pasta `linkedin/` (ignorada pelo Git).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
export const linkedinDir = here;
const postsDir = join(here, 'posts');

const LINK_PATTERNS = {
  site: /https:\/\/atlas-bellussi\.pages\.dev\/\S*/,
  github: /https:\/\/github\.com\/bellussi1\/ATLAS\S*/,
  portfolio: /https:\/\/bellussi\.vercel\.app\/?/,
};

const IMAGE_NAMES = ['01-capa.jpg', '02-evidencia.jpg', '03-mecanica.jpg', '04-cta.jpg'];

/** Extrai as linhas da tabela do calendário. */
export function parseCalendar(markdown) {
  const rows = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((cell) => cell.trim());
    if (cells.length < 6) continue;
    if (!/^\d{2}$/.test(cells[0])) continue;
    rows.push({
      number: cells[0],
      date: cells[1],
      title: cells[2],
      goal: cells[3],
      campaign: cells[4],
      task: cells[5],
    });
  }
  return rows;
}

/** Separa título, metadados e seções de um `post.txt`. */
export function parsePostFile(markdown) {
  const sections = {};
  let current = 'meta';
  const buffer = [];
  const flush = () => {
    sections[current] = buffer.join('\n').trim();
    buffer.length = 0;
  };
  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      current = heading[1].trim().toLowerCase();
      continue;
    }
    buffer.push(line);
  }
  flush();

  const meta = {};
  for (const line of (sections.meta ?? '').split(/\r?\n/)) {
    const match = /^([A-Za-zÀ-ÿ ]+):\s*(.+)$/.exec(line.trim());
    if (match) meta[match[1].trim().toLowerCase()] = match[2].trim();
  }

  return {
    title: (/^#\s+(.+)$/m.exec(markdown)?.[1] ?? '').trim(),
    meta,
    text: sections.texto ?? '',
    hashtags: sections.hashtags ?? '',
    carousel: sections['carrossel (4 páginas)'] ?? sections.carrossel ?? '',
    blockIf: sections['não publicar se'] ?? sections['nao publicar se'] ?? '',
  };
}

/** URL de sub-rota precisa de barra final antes da query string. */
export function hasTrailingSlashBeforeUtm(url) {
  if (!url.includes('?utm_')) return false;
  const [path] = url.split('?');
  if (!path.startsWith('https://atlas-bellussi.pages.dev')) return false;
  return path === 'https://atlas-bellussi.pages.dev/' || path.endsWith('/');
}

/** Confere o texto público de um post sem alterá-lo. */
export function validatePostText(text) {
  const issues = [];
  const site = LINK_PATTERNS.site.exec(text)?.[0] ?? '';
  const github = LINK_PATTERNS.github.exec(text)?.[0] ?? '';
  const portfolio = LINK_PATTERNS.portfolio.exec(text)?.[0] ?? '';

  if (!site) issues.push('falta o link de produção com UTM');
  else if (!hasTrailingSlashBeforeUtm(site))
    issues.push('o link do site precisa de barra final antes do UTM');
  if (!site.includes('utm_source=linkedin'))
    issues.push('o link do site não tem utm_source=linkedin');
  if (!github) issues.push('falta o link do GitHub');
  if (!portfolio) issues.push('falta o link do portfólio');

  if (text.includes('—')) issues.push('travessão no texto (usar dois-pontos, vírgula ou ponto)');
  if (/[\u{1F300}-\u{1FAFF}]/u.test(text)) issues.push('emoji no texto');
  if (/\blink na descri[çc][ãa]o\b/i.test(text))
    issues.push('"link na descrição" é proibido pela regra de tom');
  if (text.length > 3000)
    issues.push('texto acima de 3.000 caracteres (limite prático do LinkedIn)');
  if (text.length < 200) issues.push('texto curto demais para um post de engenharia');

  return { issues, links: { site, github, portfolio } };
}

export async function listPostFolders(dir = postsDir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

export function resolvePostFolder(folders, number) {
  return folders.find((folder) => folder.startsWith(`${number}-`)) ?? null;
}

function parseBrDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function isoToday(provided) {
  if (provided) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(provided)) throw new Error(`--today inválido: ${provided}`);
    return provided;
  }
  return new Date().toISOString().slice(0, 10);
}

async function fileExists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

/** Monta a pauta com estado de cada post e a próxima publicação. */
export async function buildReadiness({ today = isoToday(), dir = linkedinDir } = {}) {
  const calendar = parseCalendar(await readFile(join(dir, 'calendario.md'), 'utf8'));
  const folders = await listPostFolders(join(dir, 'posts'));
  const items = [];

  for (const row of calendar) {
    const isoDate = parseBrDate(row.date);
    const folder = resolvePostFolder(folders, row.number);
    const item = {
      number: row.number,
      date: isoDate,
      title: row.title,
      goal: row.goal,
      campaign: row.campaign,
      task: row.task,
      folder,
      published: /publicado/i.test(row.goal),
      due: Boolean(isoDate && isoDate <= today && !/publicado/i.test(row.goal)),
      issues: [],
      links: {},
      chars: 0,
    };

    if (!folder) {
      item.issues.push('pasta do post não encontrada');
      items.push(item);
      continue;
    }

    const postPath = join(dir, 'posts', folder, 'post.txt');
    if (!(await fileExists(postPath))) {
      item.issues.push('post.txt ausente');
      items.push(item);
      continue;
    }
    const post = parsePostFile(await readFile(postPath, 'utf8'));
    const validation = validatePostText(post.text);
    item.issues.push(...validation.issues);
    item.links = validation.links;
    item.chars = post.text.length;
    item.hashtags = post.hashtags;

    if (!(await fileExists(join(dir, 'posts', folder, 'carrossel.pdf')))) {
      item.issues.push('carrossel.pdf ausente');
    }
    for (const image of IMAGE_NAMES) {
      if (!(await fileExists(join(dir, 'posts', folder, 'imagens', image)))) {
        item.issues.push(`imagem ausente: ${image}`);
      }
    }

    items.push(item);
  }

  const pending = items
    .filter((item) => !item.published && item.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const ready = pending.filter((item) => item.issues.length === 0);
  const next = ready[0] ?? pending[0] ?? null;

  return {
    generatedAt: new Date().toISOString(),
    today,
    total: items.length,
    published: items.filter((item) => item.published).length,
    ready: ready.length,
    blocked: pending.filter((item) => item.issues.length > 0).length,
    next,
    items,
  };
}

export function renderPauta(report) {
  const lines = [
    '# Pauta do LinkedIn',
    '',
    `Gerada em ${report.generatedAt.slice(0, 10)} · hoje ${report.today}`,
    '',
    `Posts no calendário: ${report.total} · publicados: ${report.published} · prontos: ${report.ready} · bloqueados: ${report.blocked}`,
    '',
  ];
  if (report.next) {
    lines.push(
      `**Próximo:** ${report.next.number} ${report.next.title} (${report.next.date ?? 'sem data'})`,
      '',
    );
  }
  lines.push('| # | Data | Post | Estado | Pendências |', '|---|---|---|---|---|');
  for (const item of report.items) {
    const state = item.published
      ? 'publicado'
      : item.issues.length === 0
        ? 'pronto'
        : item.due
          ? 'atrasado'
          : 'pendente';
    lines.push(
      `| ${item.number} | ${item.date ?? '?'} | ${item.title} | ${state} | ${
        item.issues.length ? item.issues.join('; ') : 'nada'
      } |`,
    );
  }
  lines.push(
    '',
    '## Como usar',
    '',
    '1. Corrija as pendências acima (links, barra final, carrossel, imagens).',
    '2. Rode `node docs/social/linkedin/render-carousels.mjs` para regerar os arquivos.',
    '3. Publique com `node docs/social/linkedin/publish.mjs --post <pasta> --dry-run` e depois `--publish`.',
    '',
  );
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({
    options: {
      today: { type: 'string' },
      write: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
    },
  });

  try {
    const report = await buildReadiness({ today: isoToday(values.today) });
    if (values.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(renderPauta(report));
    }
    if (values.write) {
      await writeFile(join(linkedinDir, 'pauta.md'), `${renderPauta(report)}\n`, 'utf8');
      await writeFile(
        join(linkedinDir, 'pauta.json'),
        `${JSON.stringify(report, null, 2)}\n`,
        'utf8',
      );
      console.log(`\nPauta gravada em ${join(linkedinDir, 'pauta.md')} e pauta.json`);
    }
    if (report.next && report.next.due && report.next.issues.length > 0) {
      process.exitCode = 2;
    }
  } catch (error) {
    console.error(`[pauta] Falhou: ${error.message}`);
    process.exitCode = 1;
  }
}
