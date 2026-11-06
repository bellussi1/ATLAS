# Produção: roteiro de infraestrutura

Site: `https://atlasbr.vercel.app` (Vercel). Conteúdo: bucket R2 `atlas-public` (hoje em `r2.dev`).

**O repositório é público.** Nada sensível entra nele: tokens, chaves, IDs de conta e e-mails ficam em segredos do GitHub, em `~/.atlas/*.env` ou no painel do provedor. O CI roda o gitleaks sobre todo o histórico, o hook de pré-commit roda `gitleaks protect --staged` quando o gitleaks está instalado, e `.gitignore` bloqueia `.env*`, `*.pem`, `*.key` e `.vercel`.

## Como o deploy funciona

1. O CI valida (lint, tipos, testes, build, links, E2E) e gera o site em `dist/atlas/browser`.
2. `scripts/infra/vercel-config.mjs` (último passo do `npm run build`) escreve `dist/atlas/vercel.json` com os headers e a CSP com hashes do build, os redirecionamentos de `public/_redirects`, `cleanUrls` e cache longo para JS e CSS com hash.
3. O job `deploy` copia esse arquivo para a raiz e roda `vercel build` e `vercel deploy --prebuilt`: `master` vai para produção, pull requests viram pré-visualização. O job só roda quando a variável `VERCEL_PROJECT_ID` existe.

`public/404.html` é servido pelo Vercel com status 404 para endereços desconhecidos.

## O que fica a cargo de uma pessoa

1. **Token do Vercel:** Vercel → Account Settings → Tokens → criar token com escopo no time do projeto.
2. **IDs do projeto:** `vercel link` na raiz cria `.vercel/project.json` (ignorado pelo git) com `orgId` e `projectId`.
3. **Segredos e variáveis do GitHub** (o valor do token é lido da entrada padrão, nunca vai para arquivo nem para o chat):

```bash
gh secret set VERCEL_TOKEN
gh secret set VERCEL_ORG_ID
gh variable set VERCEL_PROJECT_ID --body <projectId>
gh variable set ATLAS_SITE_URL --body https://atlasbr.vercel.app
gh variable set ATLAS_ANALYTICS --body vercel
```

4. **Painel do Vercel:** em Settings → Git, desligar o deploy automático do Git (o CI passa a ser o único caminho, para os headers sempre vencerem) e ativar Web Analytics.
5. **Alerta de disponibilidade:** definir a variável `ATLAS_CDN_URL` com o endereço público do conteúdo para ativar o `uptime.yml`.

## O que cada peça faz

| Peça            | Onde                           | Efeito                                                                                                  |
| --------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| SEO             | `scripts/seo.mjs`              | canonical absoluto por página, `sitemap.xml`, `Sitemap:` no `robots.txt`, links absolutos no `llms.txt` |
| Analytics       | `ATLAS_ANALYTICS=vercel`       | script do Vercel Web Analytics servido pela própria origem (a CSP não muda)                             |
| Disponibilidade | `uptime.yml`                   | a cada 15 minutos testa o site, o 404 real e o `pointer.json`; falha avisa por e-mail                   |
| Dependências    | `dependabot.yml`, `codeql.yml` | atualizações semanais e análise estática                                                                |
| Segredos        | job `secrets` do CI            | gitleaks sobre todo o histórico                                                                         |

## Domínio próprio do conteúdo (quando houver domínio)

O `r2.dev` é endereço de desenvolvimento do R2 e tem limite de taxa. Com um domínio na Cloudflare, ligar um subdomínio ao bucket e trocar o endereço em um passo:

```bash
npm run infra:switch-cdn -- https://cdn.exemplo.org          # plano
npm run infra:switch-cdn -- https://cdn.exemplo.org --apply  # constante do app, ponteiro local e CSP
npm run content:publish                                      # republica o pointer.json
```

## Pendências

- Espelhar no R2 as imagens da Wikimedia com licença de reprodução (hoje há hotlink).
- Hoje o `vercel.json` gerado nunca rodou contra o Vercel real: o primeiro deploy de pré-visualização é o teste.
