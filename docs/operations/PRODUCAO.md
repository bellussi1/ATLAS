# Produção: roteiro de infraestrutura

Site: `https://atlasbr.vercel.app` (Vercel). Conteúdo: bucket R2 `atlas-public` (hoje em `r2.dev`).

**O repositório é público.** Nada sensível entra nele: tokens, chaves, IDs de conta e e-mails ficam em segredos do GitHub, em `~/.atlas/*.env` ou no painel do provedor. O CI roda o gitleaks sobre todo o histórico, o hook de pré-commit roda `gitleaks protect --staged` quando o gitleaks está instalado, e `.gitignore` bloqueia `.env*`, `*.pem`, `*.key` e `.vercel`.

## Como o deploy funciona

1. O CI valida (lint, tipos, testes, build, links, E2E) e gera o site em `dist/atlas/browser`.
2. `scripts/infra/vercel-config.mjs` (último passo do `npm run build`) escreve `dist/atlas/vercel.json` com os headers e a CSP com hashes do build, os redirecionamentos de `public/_redirects`, `cleanUrls` e cache longo para JS e CSS com hash.
3. O job `deploy` copia esse arquivo para a raiz e roda `vercel build` e `vercel deploy --prebuilt`: `master` vai para produção, pull requests viram pré-visualização. O job só roda quando a variável `VERCEL_PROJECT_ID` existe.

O `vercel.json` da raiz é versionado e cobre o deploy pelo Git enquanto o job `deploy` está inerte (falta `VERCEL_PROJECT_ID`). Ele fixa `framework: null` para desligar o preset Angular, que hoje responde `index.html` com status 200 em endereços desconhecidos, e repete `redirects`, `routes` e os headers de segurança. A CSP com os hashes do build fica só no arquivo gerado, porque os hashes mudam a cada build; `scripts/infra/vercel-config.spec.mjs` falha se as regras determinísticas dos dois arquivos divergirem.

`public/404.html` é servido pelo Vercel com status 404 para endereços desconhecidos. O `routes` termina em `{ "status": 404, "dest": "/404.html" }` depois de `handle: filesystem`, e `/verbete/*` continua na SPA para slugs não prerenderizados. Sem `framework: null` (ou seja, no preset Angular), o mesmo endereço devolve 200 com `index.html`; o `uptime.yml` detecta isso porque exige 404 no caminho inexistente.

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

## CDN de conteúdo (Worker)

O endereço público do conteúdo ainda é o `r2.dev`, que tem limite de taxa. O Worker
`atlas-content-delivery` serve o mesmo contrato sem expor o endpoint S3: `pointer.json`,
`c/<sha256>.json` e `m/<sha256>.<ext>`, com CORS, `ETag`, cache imutável para os artefatos e
`no-cache` para o ponteiro. O binding é somente leitura no bucket `atlas-public`; `atlas-drafts`
não entra no Worker.

Deploy (exige `CLOUDFLARE_API_TOKEN` com Workers Scripts:Edit e `CLOUDFLARE_ACCOUNT_ID`, ou
`npx wrangler login`):

```bash
npm run infra:content-worker
```

O endereço padrão fica em `https://atlas-content-delivery.atlas-bellussi.workers.dev`. Para um
domínio próprio, adicione o domínio ao Worker no painel da Cloudflare e use essa origem no passo
seguinte.

Depois de o Worker responder `GET /pointer.json`:

```bash
node scripts/infra/switch-content-domain.mjs https://atlas-content-delivery.atlas-bellussi.workers.dev --apply
npm run content:publish
npm run content:fetch
npm run build
gh variable set ATLAS_CDN_URL --body https://atlas-content-delivery.atlas-bellussi.workers.dev
```

O `switch-content-domain` troca a constante do app, o ponteiro local e a CSP; o
`content:publish` grava o `pointer.json` com a origem nova. O `publish-r2` usa
`DEFAULT_CONTENT_BASE_URL` como origem pública, então o `R2_PUBLIC_URL` do ambiente pode continuar
apontando para o endpoint S3; ele não é mais a URL pública do app.

Conferir:

```bash
curl -sI https://atlas-content-delivery.atlas-bellussi.workers.dev/pointer.json
curl -sI https://atlas-content-delivery.atlas-bellussi.workers.dev/c/<sha256>.json
```

O primeiro deve responder `Cache-Control: public, max-age=0, must-revalidate`; o segundo,
`public, max-age=31536000, immutable`. Ambos precisam de `Access-Control-Allow-Origin: *`.

## Armazenamento dos deployments

Os HTMLs estáticos incluíam cópias dos objetos do grafo via TransferState.
O repositório agora limita cada objeto embutido a 16.000 caracteres em todas
as rotas. Objetos maiores são baixados do release fixado no R2, conferidos por
SHA-256 e reutilizados pelo cache do navegador e pela instância do repositório.
O conteúdo HTML e o prerender continuam disponíveis para indexação.

A medição local em 06/11/2026 passou de aproximadamente 460 MB para 86 MB no diretório público, cerca de 81% de redução. A página de pessoas passou de cerca de 15 MB para 176 KB. Os valores dependem do release de conteúdo.

A redução vale para novos builds. Para reduzir o histórico retido, abrir
ATLAS → Settings → Build and Deployment → Deployment Retention Policy no Vercel.
Uma configuração inicial para este projeto é 1 dia para cancelados/com erro,
7 dias para previews e 7 dias para produção. Conferir as exceções que preservam
o deployment atual e os alvos de rollback antes de salvar.
Aplicar ao projeto ATLAS. O uso agregado da equipe pode incluir outros projetos.

Conferir o total dos arquivos em `dist/atlas/browser`, as rotas principais, a
hidratação e os links antes de publicar. Após o próximo deploy, comparar o
mesmo intervalo em Usage → Deployment Storage. A atualização do uso depende
da exclusão dos deployments antigos e da atualização das métricas.

Referência verificada em 06/11/2026 — [retenção de deployments](https://vercel.com/docs/deployment-retention).

## Capturas cruas no R2

As respostas JSON usadas para replay ficam em `raw/<sha256>.bin`. Em 06/11/2026 o bucket tinha
**16.058 objetos e 9,6 GB** (a maior parte em JSON sem compressão), perto do limite gratuito de
10 GB do R2. Após a migração gzip, o prefixo ficou em **1,58 GB**. Três medidas mantêm isso sob
controle:

1. **gzip**: `publish-raw` grava novos objetos com `Content-Encoding: gzip`; as capturas antigas
   podem ser recompactadas com `npm run ingest:compress-raw -- --apply`. A chave continua sendo o
   SHA-256 do JSON descomprimido; `fetch-raw` e o Worker continuam recebendo o corpo original.
2. **ciclo de vida de 90 dias**: a regra está em `scripts/infra/raw-lifecycle.json` e vale só para
   o prefixo `raw/`. Com um token de **Workers R2 Storage:Write**:

```bash
npx wrangler r2 bucket lifecycle set atlas-public --file scripts/infra/raw-lifecycle.json
```

O comando da API S3 (`npm run infra:raw-lifecycle -- --days 90 --apply`) só funciona se a chave
S3 também tiver permissão de lifecycle; hoje ela responde 403. A regra não apaga imediatamente
objetos recém-enviados: eles expiram 90 dias depois do upload. 3. **manter as N capturas mais recentes**: `npm run infra:raw-prune -- --keep 20` mostra o plano;
`--apply` apaga os objetos `raw/` que não são referenciados pelos manifests das N capturas mais
novas. Isso reduz o espaço agora, mas capturas antigas deixam de ser reexecutáveis por
`ingest:fetch-raw`; use apenas se a retenção menor for uma decisão editorial.

O ciclo de vida não toca `pointer.json`, `c/` nem `m/`. O `atlas-drafts` nunca entra nesse bucket.

## Capturas do CI

O Worker `atlas-raw-delivery` entrega somente GET e HEAD de `raw/<sha256>.bin`,
com binding para `atlas-public`. O código e os metadados estão em
`scripts/infra/raw-delivery*`. O endpoint é
`https://atlas-raw-delivery.atlas-bellussi.workers.dev` e a variável pública
`ATLAS_RAW_BASE_URL` do GitHub seleciona esse espelho para os downloads do CI.
O script continua verificando o hash por objeto e escrevendo o cache de forma atômica.
A URL usada pela aplicação continua definida no ponteiro do conteúdo.

Acompanhar o uso de Workers no painel Cloudflare e os limites do plano ativo.
Os downloads parciais verificados ficam no cache do Actions para a próxima tentativa.
