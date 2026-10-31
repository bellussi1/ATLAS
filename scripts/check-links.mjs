import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = resolve('dist/atlas/browser');
async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? htmlFiles(join(directory, entry.name)) : entry.name.endsWith('.html') ? [join(directory, entry.name)] : []))).flat();
}
const errors = [];
const files = await htmlFiles(root);
if (!files.length) throw new Error('Nenhum HTML encontrado; execute npm run build antes da verificação.');
const quiet = new VirtualConsole();
for (const file of files) {
  const dom = new JSDOM(await readFile(file, 'utf8'), { virtualConsole: quiet });
  for (const link of dom.window.document.querySelectorAll('a[href]')) {
    const href = link.getAttribute('href');
    if (!href) continue;
    let url;
    try { url = new URL(href, `https://atlas.invalid/${file.slice(root.length + 1).replaceAll('\\', '/').replace(/index\.html$/, '')}`); }
    catch { errors.push(`${file}: URL inválida ${href}`); continue; }
    if (url.origin !== 'https://atlas.invalid') continue;
    let target = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (target !== root && !target.startsWith(root + sep)) { errors.push(`${file}: ${href}`); continue; }
    try {
      if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
      const content = await readFile(target, 'utf8');
      if (url.hash && !new JSDOM(content, { virtualConsole: quiet }).window.document.getElementById(decodeURIComponent(url.hash.slice(1)))) errors.push(`${file}: âncora ${href}`);
    } catch { errors.push(`${file}: destino ${href}`); }
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Links internos de ${files.length} páginas estáticas verificados.`);
