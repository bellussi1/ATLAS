import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = resolve('dist/atlas/browser');
async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? htmlFiles(join(directory, entry.name))
          : entry.name.endsWith('.html')
            ? [join(directory, entry.name)]
            : [],
      ),
    )
  ).flat();
}
const errors = [];
const files = await htmlFiles(root);
if (!files.length)
  throw new Error('Nenhum HTML encontrado; execute npm run build antes da verificação.');
// `/fontes` is paginated, so a source anchor may live beyond the prerendered first page. Validate it
// against the published release instead of the first page's HTML.
async function releasedSourceAnchors() {
  const directory = resolve('generated/content');
  try {
    const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
    const ids = new Set();
    for (const collection of manifest.collections ?? []) {
      const data = JSON.parse(await readFile(join(directory, collection.file), 'utf8'));
      for (const source of data.sources ?? []) ids.add(`source-${source.id}`);
    }
    return ids;
  } catch {
    return new Set();
  }
}
const sourceAnchors = await releasedSourceAnchors();
const isReleasedSource = (hash) =>
  hash.startsWith('source-') && sourceAnchors.has(decodeURIComponent(hash));
const quiet = new VirtualConsole();
const documents = new Map();
for (const file of files) {
  const dom = new JSDOM(await readFile(file, 'utf8'), { virtualConsole: quiet });
  documents.set(file, {
    links: [...dom.window.document.querySelectorAll('a[href]')].map((link) =>
      link.getAttribute('href'),
    ),
    ids: new Set([...dom.window.document.querySelectorAll('[id]')].map((element) => element.id)),
  });
  dom.window.close();
}
for (const [file, document] of documents) {
  for (const href of document.links) {
    if (!href) continue;
    let url;
    try {
      url = new URL(
        href,
        `https://atlas.invalid/${file
          .slice(root.length + 1)
          .replaceAll('\\', '/')
          .replace(/index\.html$/, '')}`,
      );
    } catch {
      errors.push(`${file}: URL inválida ${href}`);
      continue;
    }
    if (url.origin !== 'https://atlas.invalid') continue;
    const target = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (target !== root && !target.startsWith(root + sep)) {
      errors.push(`${file}: ${href}`);
      continue;
    }
    const destination = documents.get(target) ?? documents.get(join(target, 'index.html'));
    if (destination) {
      const anchor = url.hash ? decodeURIComponent(url.hash.slice(1)) : '';
      const paginatedSource =
        url.pathname === '/fontes' && url.hash && isReleasedSource(url.hash.slice(1));
      if (anchor && !destination.ids.has(anchor) && !paginatedSource)
        errors.push(`${file}: âncora ${href}`);
      continue;
    }
    try {
      if (!(await stat(target)).isFile()) throw new Error('Destino sem documento HTML');
      if (url.hash) {
        const asset = new JSDOM(await readFile(target, 'utf8'), { virtualConsole: quiet });
        if (!asset.window.document.getElementById(decodeURIComponent(url.hash.slice(1))))
          errors.push(`${file}: âncora ${href}`);
        asset.window.close();
      }
    } catch {
      errors.push(`${file}: destino ${href}`);
    }
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log(`Links internos de ${files.length} páginas estáticas verificados.`);
