#!/usr/bin/env node
// Expira as capturas cruas do prefixo raw/ no R2. A regra é aplicada no bucket, não no checkout:
// objetos deixam de ser cobrados e o Worker deixa de servi-los depois do prazo.
//   node scripts/infra/raw-lifecycle.mjs --days 90 --apply
import { createHash } from 'node:crypto';

import { loadR2Config, r2 } from '../content/r2-content.mjs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const daysIndex = args.indexOf('--days');
const days = daysIndex >= 0 ? Number(args[daysIndex + 1]) : 90;
if (!Number.isInteger(days) || days < 1) throw new Error('--days deve ser um inteiro positivo.');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<LifecycleConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Rule>
    <ID>expire-raw-captures</ID>
    <Filter><Prefix>raw/</Prefix></Filter>
    <Status>Enabled</Status>
    <Expiration><Days>${days}</Days></Expiration>
  </Rule>
</LifecycleConfiguration>
`;

if (!apply) {
  console.log(xml);
  console.log('Plano apenas. Use --apply para gravar a regra no bucket.');
  process.exit(0);
}

const config = await loadR2Config();
const body = Buffer.from(xml);
const contentMd5 = createHash('md5').update(body).digest('base64');
const put = await r2(config, 'PUT', '', {
  query: 'lifecycle',
  body,
  contentType: 'application/xml',
  contentMd5,
});
if (!put.ok) {
  const detail = (await put.text()).slice(0, 300);
  if (put.status === 403)
    throw new Error(
      'A chave S3 não gerencia ciclo de vida. Use um token Workers R2 Storage:Write com ' +
        '`npx wrangler r2 bucket lifecycle set atlas-public --file scripts/infra/raw-lifecycle.json`. ' +
        detail,
    );
  throw new Error(`Falha ao gravar o ciclo de vida: HTTP ${put.status} ${detail}`);
}
const check = await r2(config, 'GET', '', { query: 'lifecycle' });
if (!check.ok)
  throw new Error(
    `Falha ao reler o ciclo de vida: HTTP ${check.status} ${(await check.text()).slice(0, 300)}`,
  );
console.log(`Regra de ${days} dias aplicada ao prefixo raw/.`);
console.log(await check.text());
