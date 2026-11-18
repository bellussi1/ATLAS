import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve('dist/atlas/browser');
const config = {
  goatcounter: process.env.GOATCOUNTER_SITE?.trim() || null,
  cloudflare: process.env.CLOUDFLARE_ANALYTICS_TOKEN?.trim() || null,
};

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

await writeFile(
  join(root, 'analytics-config.js'),
  `window.__ATLAS_ANALYTICS__ = ${JSON.stringify(config)};\n`,
);

const tag = '<script src="/analytics-config.js"></script>';
let pages = 0;
for (const file of await collect(root)) {
  const html = await readFile(file, 'utf8');
  if (html.includes('/analytics-config.js')) continue;
  if (!html.includes('</head>')) continue;
  await writeFile(file, html.replace('</head>', `  ${tag}\n  </head>`));
  pages += 1;
}

const enabled = [config.goatcounter && 'GoatCounter', config.cloudflare && 'Cloudflare']
  .filter(Boolean)
  .join(' + ');
console.log(
  enabled
    ? `Analytics: ${enabled} em ${pages} páginas.`
    : `Analytics: desligado (nenhuma credencial); config em ${pages} páginas.`,
);
