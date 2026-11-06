// Gera o vercel.json de produção a partir do que o build já produziu: os headers de
// dist/atlas/browser/_headers (com os hashes da CSP) e os redirecionamentos de public/_redirects.
// Saída: dist/atlas/vercel.json (não versionado). O CI copia o arquivo para a raiz antes de
// `vercel build`, de modo que nenhum valor sensível nem hash de build entra no repositório.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function parseHeaders(text) {
  return text
    .split(/\r?\n/)
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const separator = line.indexOf(':');
      return { key: line.slice(0, separator).trim(), value: line.slice(separator + 1).trim() };
    });
}

export function parseRedirects(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [source, destination, status = '301'] = line.split(/\s+/);
      return { source, destination, statusCode: Number(status) };
    });
}

export function buildVercelConfig(headersText, redirectsText) {
  return {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    framework: null,
    installCommand: 'true',
    buildCommand: 'true',
    outputDirectory: 'dist/atlas/browser',
    cleanUrls: true,
    trailingSlash: false,
    redirects: parseRedirects(redirectsText),
    headers: [
      { source: '/(.*)', headers: parseHeaders(headersText) },
      {
        source: '/(.*)\\.(js|css)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/fonts/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000' }],
      },
    ],
  };
}

async function main() {
  const headers = await readFile(
    new URL('../../dist/atlas/browser/_headers', import.meta.url),
    'utf8',
  );
  const redirects = await readFile(new URL('../../public/_redirects', import.meta.url), 'utf8');
  const config = buildVercelConfig(headers, redirects);
  const out = new URL('../../dist/atlas/vercel.json', import.meta.url);
  await mkdir(new URL('./', out), { recursive: true });
  await writeFile(out, `${JSON.stringify(config, null, 2)}\n`);
  console.log(
    `Vercel: ${config.redirects.length} redirecionamentos e headers em dist/atlas/vercel.json.`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
