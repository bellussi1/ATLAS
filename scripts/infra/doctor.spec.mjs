import assert from 'node:assert/strict';
import test from 'node:test';

import {
  checkEnvFile,
  checkGithubSecrets,
  checkLivePointer,
  checkSite,
  extractFooterVersion,
} from './doctor-lib.mjs';

const fullEnv = [
  'R2_ENDPOINT=https://x.example',
  'R2_BUCKET=atlas-public',
  'R2_ACCESS_KEY_ID=abc',
  'R2_SECRET_ACCESS_KEY=super-secreto',
].join('\n');

test('o arquivo de credenciais é conferido sem vazar valores', () => {
  const ok = checkEnvFile(fullEnv);
  assert.ok(ok.ok);
  assert.ok(!JSON.stringify(ok).includes('super-secreto'));
  const missing = checkEnvFile('R2_ENDPOINT=https://x.example\nR2_BUCKET=');
  assert.ok(!missing.ok);
  assert.match(missing.detail, /R2_BUCKET/);
  assert.ok(!JSON.stringify(missing).includes('x.example'));
  assert.match(checkEnvFile(null).fix, /r2\.env/);
});

test('o ponteiro vivo precisa responder e bater com o do repositório', () => {
  const local = { release: 'a'.repeat(64) };
  const url = 'https://cdn.example';
  const same = checkLivePointer({ status: 200, body: JSON.stringify(local), local, url });
  assert.ok(same.every((item) => item.ok));
  const other = checkLivePointer({
    status: 200,
    body: JSON.stringify({ release: 'b'.repeat(64) }),
    local,
    url,
  });
  assert.ok(!other[1].ok);
  assert.match(other[1].fix, /content:publish/);
  assert.ok(!checkLivePointer({ status: 503, body: '', local, url })[0].ok);
  assert.ok(!checkLivePointer({ status: 200, body: '<html>', local, url })[0].ok);
});

test('os segredos do GitHub são conferidos pelo nome', () => {
  const listing = 'CLOUDFLARE_API_TOKEN\t2026-11-01\nCLOUDFLARE_ACCOUNT_ID\t2026-11-01\n';
  assert.ok(checkGithubSecrets(listing).ok);
  const partial = checkGithubSecrets('CLOUDFLARE_API_TOKEN\t2026-11-01\n');
  assert.ok(!partial.ok);
  assert.match(partial.detail, /CLOUDFLARE_ACCOUNT_ID/);
  assert.ok(!checkGithubSecrets('', 'not logged in').ok);
});

test('a versão do rodapé é comparada com o package.json', () => {
  const html = '<main>v9.9.9 no texto</main><footer><span>ATLAS v0.3.0</span></footer>';
  assert.equal(extractFooterVersion(html), '0.3.0');
  assert.ok(checkSite({ status: 200, html, version: '0.3.0', url: 'https://s' }).ok);
  const stale = checkSite({ status: 200, html, version: '0.4.0', url: 'https://s' });
  assert.ok(!stale.ok);
  assert.match(stale.fix, /deploy-pages/);
  assert.ok(!checkSite({ status: null, html: '', version: '0.3.0', url: 'https://s' }).ok);
});
