import './content/register-source-modules.mjs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { readSourceGraph } from './content/source-graph.mjs';

const { isUnlistedReading, readingRegistry } =
  await import('../src/app/core/content/editorial/public-readings.ts');
const { entityMedia } = await import('../src/app/core/content/media/asset-license.ts');
const { readingRootNodeId } = await import('../src/app/core/content/queries/cross-links.ts');

// Pós-build: canonical absoluto por página, Open Graph/Twitter Cards, noindex em prévias,
// sitemap.xml, linha Sitemap no robots.txt e links absolutos no llms.txt.
// O endereço público é o mesmo de `src/app/core/routing/site-url.ts`;
// ATLAS_SITE_URL só é necessária para publicar em outro domínio.
const DEFAULT_SITE_URL = 'https://atlas-bellussi.pages.dev';

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? collect(join(directory, entry.name))
          : entry.name.endsWith('.html')
            ? [join(directory, entry.name)]
            : [],
      ),
    )
  ).flat();
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export async function applySeo({
  rootDir = resolve('dist/atlas/browser'),
  siteUrl = process.env.ATLAS_SITE_URL || DEFAULT_SITE_URL,
  redirectsPath = resolve('public/_redirects'),
  pointerPath = resolve('content/content-pointer.json'),
  ideologiesDir = resolve('content/ideologies'),
  graph,
} = {}) {
  const site = siteUrl.trim().replace(/\/+$/, '');
  if (site && !/^https:\/\/[^/\s]+$/.test(site))
    throw new Error('ATLAS_SITE_URL deve ser uma origem https, sem caminho.');

  const root = resolve(rootDir);
  const fallbackImage = `${site}/brand/atlas-logo.png`;
  const pointer = await readFile(resolve(pointerPath), 'utf8')
    .then((raw) => JSON.parse(raw))
    .catch(() => null);
  const mediaKeyByPath = new Map(
    (pointer?.media ?? [])
      .filter((item) => item?.path && item?.key)
      .map((item) => [item.path, item.key]),
  );
  const mediaBase = (pointer?.baseUrl ?? '').trim().replace(/\/+$/, '');

  const resolveSocialImage = (assetPath) => {
    if (!assetPath || /\.svg(\?|$)/i.test(assetPath)) return fallbackImage;
    if (/^https?:\/\//i.test(assetPath)) return assetPath;
    const key = mediaKeyByPath.get(assetPath);
    if (key && mediaBase) return `${mediaBase}/${key}`;
    return fallbackImage;
  };

  const resolvedGraph = graph ?? (await readSourceGraph());
  const entityImageBySlug = new Map();
  for (const atlas of resolvedGraph.atlases ?? []) {
    for (const entity of atlas.entities ?? []) {
      if (entityImageBySlug.has(entity.slug)) continue;
      const asset = entityMedia(resolvedGraph, entity);
      if (asset?.assetPath) entityImageBySlug.set(entity.slug, resolveSocialImage(asset.assetPath));
    }
  }

  const readingImageBySlug = new Map();
  for (const entry of readingRegistry) {
    const page = await readFile(join(ideologiesDir, entry.slug, 'page.json'), 'utf8')
      .then((raw) => JSON.parse(raw))
      .catch(() => null);
    const portraitPath = page?.portrait?.assetPath;
    const rootId = readingRootNodeId(entry.slug);
    const rootAsset = rootId ? entityMedia(resolvedGraph, { id: rootId })?.assetPath : undefined;
    readingImageBySlug.set(entry.slug, resolveSocialImage(portraitPath ?? rootAsset));
  }

  // O Pages serve cada rota como diretório com barra final (`/fontes/`); o sitemap e o canonical
  // precisam usar a mesma forma para não competir com o redirecionamento do host.
  const routeOf = (file) => {
    const path = relative(root, file).split(sep).join('/');
    if (path === 'index.html') return '/';
    if (path.endsWith('/index.html')) return `/${path.slice(0, -'index.html'.length)}`;
    return `/${path.replace(/\.html$/, '')}`;
  };

  const redirects = new Set(
    (await readFile(resolve(redirectsPath), 'utf8').catch(() => ''))
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split(/\s+/)[0].replace(/\/$/, '')),
  );
  // Preview readings are reachable by direct URL but stay out of the sitemap and carry noindex.
  const previews = new Set(
    readingRegistry
      .filter((entry) => isUnlistedReading(entry.slug))
      .map((entry) => `/leitura/${entry.slug}`),
  );

  const pages = [];
  for (const file of await collect(root)) {
    const route = routeOf(file);
    const cleanRoute = route.replace(/\/$/, '') || '/';
    if (
      route === '/404' ||
      route === '/index.csr' ||
      route.endsWith('/index.csr') ||
      redirects.has(cleanRoute)
    ) {
      continue;
    }

    const isArticle = /^\/(leitura|verbete)\/[^/]+$/.test(cleanRoute);
    const ogType = isArticle ? 'article' : 'website';
    const imageUrl = cleanRoute.startsWith('/verbete/')
      ? (entityImageBySlug.get(cleanRoute.slice('/verbete/'.length)) ?? fallbackImage)
      : cleanRoute.startsWith('/leitura/')
        ? (readingImageBySlug.get(cleanRoute.slice('/leitura/'.length)) ?? fallbackImage)
        : fallbackImage;

    let html = await readFile(file, 'utf8');
    html = html
      .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
      .replace(/<meta\s+property="og:url"[^>]*>\s*/gi, '')
      .replace(/<meta\s+property="og:type"[^>]*>\s*/gi, '')
      .replace(/<meta\s+property="og:image"[^>]*>\s*/gi, '')
      .replace(/<meta\s+name="twitter:image"[^>]*>\s*/gi, '')
      .replace(/<meta\s+name="twitter:card"[^>]*>\s*/gi, '');

    if (previews.has(cleanRoute)) {
      html = html
        .replace(/<meta\s+name="robots"[^>]*>\s*/gi, '')
        .replace(
          '</head>',
          `<meta name="robots" content="noindex, follow">` +
            `<meta property="og:type" content="${ogType}">` +
            `<meta property="og:image" content="${escapeAttr(imageUrl)}">` +
            `<meta name="twitter:card" content="summary_large_image">` +
            `<meta name="twitter:image" content="${escapeAttr(imageUrl)}"></head>`,
        );
      await writeFile(file, html);
      continue;
    }

    const url = `${site}${route}`;
    html = html.replace(
      '</head>',
      `<link rel="canonical" href="${escapeAttr(url)}">` +
        `<meta property="og:url" content="${escapeAttr(url)}">` +
        `<meta property="og:type" content="${ogType}">` +
        `<meta property="og:image" content="${escapeAttr(imageUrl)}">` +
        `<meta name="twitter:card" content="summary_large_image">` +
        `<meta name="twitter:image" content="${escapeAttr(imageUrl)}"></head>`,
    );
    pages.push(url);
    await writeFile(file, html);
  }

  pages.sort();
  await writeFile(
    join(root, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
      .map((url) => `  <url><loc>${url}</loc></url>`)
      .join('\n')}\n</urlset>\n`,
  );
  const robots = await readFile(join(root, 'robots.txt'), 'utf8').catch(() => null);
  if (robots !== null) {
    const cleaned = robots.replace(/\r?\n*Sitemap:[^\r\n]*/g, '').trimEnd();
    await writeFile(join(root, 'robots.txt'), `${cleaned}\n\nSitemap: ${site}/sitemap.xml\n`);
  }
  const llms = await readFile(join(root, 'llms.txt'), 'utf8').catch(() => null);
  if (llms !== null) {
    await writeFile(
      join(root, 'llms.txt'),
      llms.replace(/\]\((\/[^)]*)\)/g, (_, path) => `](${site}${path})`),
    );
  }
  return { pages, site };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { pages, site } = await applySeo();
  console.log(`SEO: ${pages.length} páginas no sitemap de ${site}.`);
}
