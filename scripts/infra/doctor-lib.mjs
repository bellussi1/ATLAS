// Checks behind `npm run infra:doctor`. Each check returns { name, ok, detail, fix } and never
// carries a secret value: only key names, versions, hashes and HTTP statuses are reported.
import { parseEnvFile } from '../content/r2-content.mjs';

export const requiredEnvKeys = [
  'R2_ENDPOINT',
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
];
export const optionalEnvKeys = ['R2_DRAFTS_ACCESS_KEY_ID', 'R2_DRAFTS_SECRET_ACCESS_KEY'];
export const requiredGithubSecrets = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'];

const result = (name, ok, detail, fix) => ({ name, ok, detail, ...(ok ? {} : { fix }) });

/** The env file is read for key names and emptiness only. */
export function checkEnvFile(text, path = '~/.atlas/r2.env') {
  if (text == null)
    return result(
      'credenciais R2',
      false,
      `${path} não existe`,
      `crie ${path} com ${requiredEnvKeys.join(', ')} (veja docs/operations/PRODUCAO.md)`,
    );
  const values = parseEnvFile(text);
  const missing = requiredEnvKeys.filter((key) => !values[key]);
  if (missing.length)
    return result(
      'credenciais R2',
      false,
      `chaves ausentes ou vazias: ${missing.join(', ')}`,
      `preencha ${missing.join(', ')} em ${path}`,
    );
  const draftsMissing = optionalEnvKeys.filter((key) => !values[key]);
  return result(
    'credenciais R2',
    true,
    draftsMissing.length
      ? `${requiredEnvKeys.length} chaves presentes (sem token dedicado de rascunhos: usa a chave pública)`
      : `${requiredEnvKeys.length + optionalEnvKeys.length} chaves presentes`,
  );
}

export function checkLivePointer({ status, body, local, url }) {
  const name = 'Worker de conteúdo';
  if (status !== 200)
    return [
      result(
        name,
        false,
        `GET ${url}/pointer.json respondeu ${status ?? 'sem resposta'}`,
        'confira o deploy do Worker (npm run infra:content-worker) e o bucket atlas-public',
      ),
    ];
  let live;
  try {
    live = JSON.parse(body);
  } catch {
    return [
      result(
        name,
        false,
        'pointer.json não é JSON válido',
        'republique com npm run content:publish',
      ),
    ];
  }
  const checks = [
    result(name, true, `pointer.json responde (release ${String(live.release).slice(0, 8)})`),
  ];
  checks.push(
    live.release === local.release
      ? result('ponteiro do repositório', true, 'confere com o do R2')
      : result(
          'ponteiro do repositório',
          false,
          `repositório ${local.release.slice(0, 8)} ≠ R2 ${String(live.release).slice(0, 8)}`,
          'rode npm run content:publish (se o conteúdo é novo) ou git pull (se o ponteiro é de outra máquina)',
        ),
  );
  return checks;
}

/** Secret names from `gh secret list` output (name<TAB>updated); values are never listed. */
export function parseGhNames(output) {
  return new Set(
    output
      .split(/\r?\n/)
      .map((line) => line.split(/\s+/)[0])
      .filter(Boolean),
  );
}

export function checkGithubSecrets(output, error) {
  const name = 'segredos do GitHub';
  if (error)
    return result(
      name,
      false,
      `gh secret list falhou: ${error}`,
      'rode gh auth login e confirme o acesso ao repositório',
    );
  const present = parseGhNames(output);
  const missing = requiredGithubSecrets.filter((secret) => !present.has(secret));
  return missing.length
    ? result(
        name,
        false,
        `ausentes: ${missing.join(', ')}`,
        `gh secret set ${missing[0]}  (o valor é lido da entrada padrão)`,
      )
    : result(name, true, requiredGithubSecrets.join(', '));
}

/** Version printed in the footer (`v0.3.0`) of the served home page. */
export function extractFooterVersion(html) {
  const footer = /<footer[\s\S]*?<\/footer>/i.exec(html)?.[0] ?? html;
  return /\bv(\d+\.\d+\.\d+)\b/.exec(footer)?.[1] ?? null;
}

export function checkSite({ status, html, version, url }) {
  const name = 'site publicado';
  if (status !== 200)
    return result(
      name,
      false,
      `GET ${url} respondeu ${status ?? 'sem resposta'}`,
      'confira o deploy do Pages (job deploy-pages do CI)',
    );
  const served = extractFooterVersion(html);
  if (!served)
    return result(
      name,
      false,
      'rodapé sem versão',
      'o build não imprimiu a versão; confira o rodapé',
    );
  return served === version
    ? result(name, true, `rodapé mostra v${served}, igual ao package.json`)
    : result(
        name,
        false,
        `rodapé mostra v${served}, package.json está em v${version}`,
        'o deploy da master ainda não terminou ou não rodou; veja o job deploy-pages no GitHub Actions',
      );
}
