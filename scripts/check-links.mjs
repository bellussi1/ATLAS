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
      if (url.hash && !destination.ids.has(decodeURIComponent(url.hash.slice(1))))
        errors.push(`${file}: âncora ${href}`);
      continue;
    }
    try {
      if (!(await stat(target)).isFile()) throw new Error('Destino sem documento HTML');
    } catch {
      errors.push(`${file}: destino ${href}`);
    }
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log(`Links internos de ${files.length} páginas estáticas verificados.`);
