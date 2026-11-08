Status: atual
Última verificação: 08/11/2026

# Auditoria de dependências — 31/10/2026

- `npm audit --json`: 33 entradas moderadas. `npm audit --omit=dev --json`: zero. São cadeias de ferramentas de desenvolvimento, não evidência de exploração no site estático.
- `npm audit fix --dry-run --json`: zero alterações; 33 entradas mantidas. Nenhuma atualização forçada aplicada.
- Causas do relatório: [minimatch, negação de serviço por padrões glob](https://github.com/advisories/GHSA-g3hv-75wg-m249) e [glob, cancelamento que pode continuar percorrendo o sistema de arquivos](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4). O risco no ATLAS aparece ao rodar ferramentas de desenvolvimento ou instalação sobre entradas e padrões não confiáveis; a aplicação estática não recebe padrões glob do público.

| Grupo | Diretas e transitivas afetadas | Correção e risco |
|---|---|---|
| Angular CLI e instalação | Direta `@angular/cli`; transitivas `pacote`, `@npmcli/package-json`, `@npmcli/run-script`, `cacache`, `ignore-walk`, `npm-packlist`, `npm-registry-fetch`, `make-fetch-happen`, `@sigstore/sign`, `@sigstore/tuf`, `@tufjs/models`, `sigstore`, `tuf-js`, `glob`, `minimatch` | Sem correção automática no relatório. Trocar ou forçar transitivas pode quebrar CLI e instalação; acompanhar versões compatíveis do Angular e repetir a auditoria. |
| ESLint | Diretas `eslint` e `@eslint/js`; transitivas `@eslint-community/eslint-utils`, `@eslint/config-array`, `minimatch` | Sem correção automática para `eslint`; sugestão de major para `@eslint/js`, com risco de incompatibilidade de regras e plugins. Não aplicar sem migração e testes. |
| Angular ESLint | Direta `angular-eslint`; transitivas `@angular-eslint/builder`, `…/eslint-plugin`, `…/eslint-plugin-template`, `…/schematics`, `…/template-parser`, `…/utils` | Algumas transitivas indicam correção, mas a direta segue sem correção automática. Alterar versões isoladamente pode quebrar compatibilidade com Angular e ESLint. |
| TypeScript ESLint | Direta `typescript-eslint`; transitivas `@typescript-eslint/eslint-plugin`, `…/parser`, `…/type-utils`, `…/typescript-estree`, `…/utils` | Sugestão de major da direta; risco de incompatibilidade com TypeScript e Angular ESLint. Não aplicar sem migração coordenada. |

Os grupos compartilham transitivas, por isso não somam contagens independentes. A classificação vem do lockfile atual; nova instalação ou advisory pode mudar os resultados.

**Workflow:** reproduzido localmente com lint, typecheck, testes, build, verificação de links e Playwright. Execução real no GitHub Actions não foi possível: sem remoto configurado, `gh auth status` sem autenticação e `act` ausente. `playwright install --with-deps` no Ubuntu não foi reproduzido neste Windows.

**Atualização posterior:** os avisos oficiais confirmam versões corrigidas `minimatch` 11.0.1 e `glob` 14.0.2, mas as cadeias instaladas exigem versões principais anteriores. Troca global por `overrides` atravessaria os intervalos declarados pelos consumidores e não foi aplicada. O CI passou a verificar vulnerabilidades moderadas ou superiores nas dependências de produção, com token somente leitura. As 33 entradas de desenvolvimento seguem pendentes de atualizações compatíveis dos pacotes que as incorporam.
