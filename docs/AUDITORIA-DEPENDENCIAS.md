# Auditoria de dependências — 31/10/2026

`npm audit --json` identificou 33 entradas moderadas; `npm audit --omit=dev --json` retornou zero. São cadeias de ferramentas de desenvolvimento, não evidência de exploração no site estático. `npm audit fix --dry-run --json` indicou zero alterações e manteve 33 entradas. Não foi aplicada atualização forçada.

As duas causas identificadas no relatório são [minimatch: negação de serviço por padrões glob](https://github.com/advisories/GHSA-g3hv-75wg-m249) e [glob: cancelamento que pode continuar a percorrer o sistema de arquivos](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4). O risco no ATLAS aparece ao executar ferramentas de desenvolvimento ou instalação sobre entradas e padrões não confiáveis; a aplicação estática não recebe padrões glob do público.

| Grupo | Diretas e transitivas afetadas | Correção e risco |
| --- | --- | --- |
| Angular CLI e instalação | Direta `@angular/cli`; transitivas `pacote`, `@npmcli/package-json`, `@npmcli/run-script`, `cacache`, `ignore-walk`, `npm-packlist`, `npm-registry-fetch`, `make-fetch-happen`, `@sigstore/sign`, `@sigstore/tuf`, `@tufjs/models`, `sigstore`, `tuf-js`, `glob`, `minimatch` | O relatório não oferece correção automática para essas cadeias. Trocar ou forçar transitivas pode quebrar o CLI e a instalação; acompanhar versões compatíveis do Angular e repetir auditoria. |
| ESLint | Diretas `eslint` e `@eslint/js`; transitivas `@eslint-community/eslint-utils`, `@eslint/config-array` e `minimatch` | O relatório não oferece correção automática para `eslint`; sugere mudança major para `@eslint/js`, com risco de incompatibilidade das regras e plugins. Não aplicar sem migração e testes. |
| Angular ESLint | Direta `angular-eslint`; transitivas `@angular-eslint/builder`, `@angular-eslint/eslint-plugin`, `@angular-eslint/eslint-plugin-template`, `@angular-eslint/schematics`, `@angular-eslint/template-parser`, `@angular-eslint/utils` | Algumas transitivas indicam correção, mas a dependência direta continua sem correção automática. Alterar versões isoladamente pode quebrar compatibilidade com Angular e ESLint. |
| TypeScript ESLint | Direta `typescript-eslint`; transitivas `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `@typescript-eslint/type-utils`, `@typescript-eslint/typescript-estree`, `@typescript-eslint/utils` | O relatório sugere alteração major da dependência direta; há risco de incompatibilidade com TypeScript e Angular ESLint. Não aplicar sem migração coordenada. |

Esses grupos compartilham dependências transitivas, por isso não somam contagens independentes. A classificação vem do relatório do lockfile atual; uma nova instalação ou advisory pode mudar os resultados.

O workflow foi reproduzido localmente com lint, typecheck, testes, build, verificação de links e Playwright. A execução real no GitHub Actions não foi possível: não há remoto configurado, `gh auth status` não encontrou autenticação e `act` não está instalado. A instalação de dependências do sistema realizada por `playwright install --with-deps` no Ubuntu não foi reproduzida neste Windows.
