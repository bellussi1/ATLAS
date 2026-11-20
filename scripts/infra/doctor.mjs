#!/usr/bin/env node
// Read-only health check of the publishing setup; prints key names and statuses, never values.
//   npm run infra:doctor
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import { defaultEnvFile } from '../content/r2-content.mjs';
import { checkEnvFile, checkGithubSecrets, checkLivePointer, checkSite } from './doctor-lib.mjs';

const root = new URL('../../', import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const get = async (url) => {
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
    return { status: response.status, text: await response.text() };
  } catch {
    return { status: null, text: '' };
  }
};

const pointer = await readJson('content/content-pointer.json');
const { version } = await readJson('package.json');
const siteUrl = (process.env.ATLAS_SITE_URL ?? 'https://atlas-bellussi.pages.dev').replace(
  /\/$/,
  '',
);

const results = [];
const envPath = defaultEnvFile();
results.push(checkEnvFile(await readFile(envPath, 'utf8').catch(() => null), '~/.atlas/r2.env'));

const live = await get(`${pointer.baseUrl}/pointer.json`);
results.push(
  ...checkLivePointer({
    status: live.status,
    body: live.text,
    local: pointer,
    url: pointer.baseUrl,
  }),
);

let ghOutput = '';
let ghError = null;
try {
  ghOutput = execFileSync('gh', ['secret', 'list'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (error) {
  ghError = String(error.stderr || error.message).split(/\r?\n/)[0];
}
results.push(checkGithubSecrets(ghOutput, ghError));

const site = await get(`${siteUrl}/`);
results.push(checkSite({ status: site.status, html: site.text, version, url: siteUrl }));

for (const item of results) {
  console.log(`${item.ok ? 'ok    ' : 'FALHOU'}  ${item.name}: ${item.detail}`);
  if (!item.ok) console.log(`        ação: ${item.fix}`);
}
const failed = results.filter((item) => !item.ok).length;
console.log(failed ? `\n${failed} verificação(ões) com falha.` : '\nTudo certo.');
process.exitCode = failed ? 1 : 0;
