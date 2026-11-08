import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

// Pós-build: canonical absoluto por página, sitemap.xml, linha Sitemap no robots.txt e links
// absolutos no llms.txt. O endereço público é o mesmo de `src/app/core/routing/site-url.ts`;
// ATLAS_SITE_URL só é necessária para publicar em outro domínio.
const DEFAULT_SITE_URL = 'https://atlas-bellussi.pages.dev';
const root = resolve('dist/atlas/browser');
const site = (process.env.ATLAS_SITE_URL || DEFAULT_SITE_URL).trim().replace(/\/+$/, '');
if (site && !/^https:\/\/[^/\s]+$/.test(site))
  throw new Error('ATLAS_SITE_URL deve ser uma origem https, sem caminho.');

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

// O Pages serve cada rota como diretório com barra final (`/fontes/`); o sitemap e o canonical
// precisam usar a mesma forma para não competir com o redirecionamento do host.
const routeOf = (file) => {
  const path = relative(root, file).split(sep).join('/');
  if (path === 'index.html') return '/';
  if (path.endsWith('/index.html')) return `/${path.slice(0, -'index.html'.length)}`;
  return `/${path.replace(/\.html$/, '')}`;
};

const pages = [];
for (const file of await collect(root)) {
  const route = routeOf(file);
  if (route === '/404') continue;
  let html = await readFile(file, 'utf8');
  html = html
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:url"[^>]*>\s*/gi, '');
  const url = `${site}${route}`;
  html = html.replace(
    '</head>',
    `<link rel="canonical" href="${url}"><meta property="og:url" content="${url}"></head>`,
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
const robots = await readFile(join(root, 'robots.txt'), 'utf8');
await writeFile(join(root, 'robots.txt'), `${robots.trimEnd()}\n\nSitemap: ${site}/sitemap.xml\n`);
const llms = await readFile(join(root, 'llms.txt'), 'utf8');
await writeFile(
  join(root, 'llms.txt'),
  llms.replace(/\]\((\/[^)]*)\)/g, (_, path) => `](${site}${path})`),
);
console.log(`SEO: ${pages.length} páginas no sitemap de ${site}.`);
