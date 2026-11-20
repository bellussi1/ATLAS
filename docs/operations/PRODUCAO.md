Status: atual
Última verificação: 08/11/2026

# Produção: roteiro de infraestrutura

Site: `https://atlas-bellussi.pages.dev` (Cloudflare Pages, Direct Upload). O CI publica o build verificado na `master`; o R2 continua sendo a origem do conteúdo. O Vercel não é mais usado como origem.

**O repositório é público.** Nada sensível entra nele: tokens, chaves, IDs de conta e e-mails ficam em segredos do GitHub, em `~/.atlas/*.env` ou no painel do provedor. O CI roda o gitleaks sobre todo o histórico, o hook de pré-commit roda `gitleaks protect --staged` quando o gitleaks está instalado, e `.gitignore` bloqueia `.env*`, `*.pem`, `*.key` e `.vercel`.

## Como o deploy funciona

1. O CI valida (lint, tipos, testes, build, links, E2E) e gera o site em `dist/atlas/browser`.
2. O build produz `_headers` (com a CSP e os hashes dos scripts inline), `_redirects` e `404.html`, que são o contrato nativo do Pages.
3. O job `deploy-pages` baixa o artefato verificado e roda `wrangler pages deploy` somente em push para a `master`. Pull requests não publicam.

`public/404.html` é servido pelo Pages com status 404 para endereços desconhecidos; `/verbete/*` continua na SPA para slugs não prerenderizados. O `uptime.yml` exige 404 no caminho inexistente.

## Roteiro de uma publicação (um comando)

`npm run release` orquestra o roteiro. Sem `--apply` ele só verifica e imprime o plano; nunca faz push nem deploy.

```powershell
npm run infra:doctor                 # credenciais, Worker, ponteiro, segredos do GitHub e rodapé do site
npm run release                      # no develop: lint, typecheck, testes, test:content, test:ingestion, build, check:links e plano
npm run release -- --apply          # no develop: content:publish (só se o hash mudou), sobe a versão e commita
```

1. No `develop` o comando confere a árvore, roda as verificações e compara o hash que `content:build` calcula com `content/content-pointer.json`. Só chama `content:publish` se mudou (com `--apply`), sugere `minor` (há `feat`, `perf` ou mudança incompatível) ou `patch` (`--bump` força) e cria dois commits: `chore(content): publica release <hash>` e `chore(release): sobe a versao do app`.
2. Depois, à mão: `git push origin develop`, PR para a `master` (`gh pr create --base master --head develop`) e merge. O CI valida e o job `deploy-pages` publica o Pages.
3. Na `master`, após o merge: `git pull` e `npm run release -- --apply` cria a tag anotada `vX.Y.Z` no commit de merge; `git push origin vX.Y.Z` a envia.
4. `npm run infra:doctor` confirma que o rodapé do site mostra a versão nova (falha enquanto o deploy não termina).

`--skip a,b` ignora verificações pelo nome (aparece como aviso). Os assuntos dos commits seguem o hook: `tipo(escopo): resumo`, minúsculo e sem ponto final.

Toda publicação em produção sobe a versão em `package.json` e `package-lock.json` (semver) e tem a tag `vX.Y.Z`; o rodapé mostra `v{{ version }}`. **A tag `v0.2.0` nunca foi criada**: o repositório tem `v0.1.0` e `v0.3.0`. Não crie `v0.2.0` retroativamente; o histórico só tem esse salto.

Sem o comando, o equivalente manual é `npm version X.Y.Z --no-git-tag-version`, commit, PR, `git tag -a vX.Y.Z -m vX.Y.Z` na `master` e `git push origin vX.Y.Z`.

## O que fica a cargo de uma pessoa

1. **Token da Cloudflare:** My Profile → API Tokens → Create Token, com a permissão **Account → Cloudflare Pages → Edit** no escopo da conta.
2. **Segredos do GitHub** (o valor do token é lido da entrada padrão, nunca vai para arquivo nem para o chat):

```bash
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
gh variable set ATLAS_SITE_URL --body https://atlas-bellussi.pages.dev
```

3. **Vercel:** se o projeto antigo ainda existir, desconectar a integração Git e excluir o projeto no painel para não manter uma segunda origem.
4. **Alerta de disponibilidade:** definir a variável `ATLAS_CDN_URL` com o endereço público do conteúdo para ativar o `uptime.yml`.

## O que cada peça faz

| Peça            | Onde                           | Efeito                                                                                                  |
| --------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| SEO             | `scripts/seo.mjs`              | canonical absoluto por página, `sitemap.xml`, `Sitemap:` no `robots.txt`, links absolutos no `llms.txt` |
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

- Rodar `npm run infra:mirror-media` (sem `--dry-run`) e `npm run content:publish` para efetivar o espelho das imagens da Wikimedia (hoje o código está pronto e o app cai no hotlink até o ponteiro ter `mirror`).
- Rodar `npm run infra:backup-drafts` e guardar o resultado (o bucket privado ainda não tem cópia de `experiments/rag/eval`).
- O deploy do Pages depende dos segredos `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`; sem eles o job `deploy-pages` falha na `master`. O `infra:doctor` confere a presença.
- As credenciais do R2 existem só em `~/.atlas/r2.env` desta máquina. Guarde uma cópia no gerenciador de senhas; sem ela, perder a máquina impede publicar conteúdo (a produção continua no ar).

## Espelho das imagens da Wikimedia

As ~1.080 imagens licenciadas eram servidas direto do `thumb.wikimedia.org`. `npm run infra:mirror-media` copia para o `atlas-public` as que a licença permite reproduzir (`reproducibleAsset`: licença conhecida, reprodução permitida; ND e uso justo ficam de fora) como objetos imutáveis `m/<sha256>.<ext>`, sem reencodar os bytes. O registro com criador, licença, URL de origem, página do arquivo e dimensões fica em `content/media-mirror.json` (versionado). É incremental: o que já está no arquivo não é baixado de novo.

```powershell
npm run content:build
npm run infra:mirror-media -- --dry-run     # candidatos e exclusões, sem rede
npm run infra:mirror-media -- --limit 25    # teste pequeno
npm run infra:mirror-media                  # todas as novas
npm run content:publish                     # fixa o índice do espelho no ponteiro (mirror) e verifica cada objeto no R2
```

O `content:publish` publica o índice compacto como artefato `media-mirror.<sha>.json` e o fixa no ponteiro; ele recusa o release se algum objeto espelhado faltar no bucket. O app lê o índice junto do bundle e `ContentMediaPipe` troca o endereço da Wikimedia pelo do espelho (`mirrorUrl`); sem espelho, mantém o hotlink. O `infra:prune-releases` nunca apaga chave citada em `content/media-mirror.json` (nem em versões antigas dele).

## Backup dos rascunhos

`experiments/rag/eval/queues/` e `runs/` (saída de modelos ainda não aprovada, fora do git) são espelhados no bucket **privado** `atlas-drafts`, por hash, em `backup/objects/<sha256>` com um índice `backup/<conjunto>/index.json`. Nunca toca o `atlas-public`.

```powershell
npm run infra:backup-drafts -- --dry-run
npm run infra:backup-drafts
npm run infra:backup-drafts -- --restore queues --to experiments/rag/eval/queues
```

A restauração baixa o índice do conjunto, confere o SHA-256 de cada arquivo e recusa caminhos fora do destino. Em outra máquina, restaure para um diretório vazio e depois mova; ela sobrescreve arquivos de mesmo nome.

## Diagnóstico

`npm run infra:doctor` não imprime segredos: confere as chaves de `~/.atlas/r2.env`, o `pointer.json` do Worker, se o ponteiro do repositório bate com o do R2, os segredos do GitHub (`gh secret list`) e se o rodapé do site mostra a versão do `package.json`. Cada falha traz a ação sugerida.

## Desempenho

`npm run build` seguido de `npm run perf` mede o peso inicial (JS bruto/gzip/brotli), os maiores chunks, o tamanho do release e, com Playwright, LCP e CLS (mediana de 3) em `/`, `/leitura/marxismo`, `/mapa` e `/grafos`. `--static` pula o navegador; `--out arquivo.json` grava o relatório.

## CDN de conteúdo (Worker)

O endereço público do conteúdo ainda é o `r2.dev`, que tem limite de taxa. O Worker
`atlas-content-delivery` serve o mesmo contrato sem expor o endpoint S3: `pointer.json`,
`c/<sha256>.json` e `m/<sha256>.<ext>`, com CORS, `ETag`, cache imutável para os artefatos e
`no-cache` para o ponteiro. O binding é somente leitura no bucket `atlas-public`; `atlas-drafts`
não entra no Worker.

O ponteiro também publica `bundle` e `networkBundle`. O primeiro reúne grafo, busca, adjacência,
layouts e leituras; o segundo reúne a projeção do grafo e os layouts. Com isso, uma navegação de
leitura ou catálogo baixa o ponteiro e **um** artefato, em vez de percorrer as 13 coleções e os
índices. Releases antigos sem esses campos continuam funcionando pelo manifesto.

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

## Retenção de releases no R2

Cada `content:publish` grava objetos imutáveis novos e pode deixar releases antigos no bucket.
`npm run infra:prune-releases` mantém o ponteiro atual e os três releases anteriores distintos,
lendo o histórico de `content/content-pointer.json` no git. O padrão é simulação:

```bash
npm run infra:prune-releases
npm run infra:prune-releases -- --keep 4 --apply
```

O `--apply` apaga somente objetos de `c/` e `m/` que nenhum dos ponteiros retidos referencia;
`pointer.json`, `raw/` e `atlas-drafts` não entram. Reduzir para menos de quatro releases remove
a possibilidade de rollback para um release mais antigo, então a decisão é editorial. Em
06/11/2026 a primeira execução removeu **92 objetos / 19,9 MB** e deixou **30 objetos em `c/` e 3
em `m/`**.

## Cloudflare Pages (host estático)

O build em `dist/atlas/browser` já contém `_headers`, `_redirects` e `404.html`, que são o
contrato nativo do Pages: cache dos assets, cabeçalhos de segurança, redirecionamentos e a
página de rota desconhecida. O conteúdo continua vindo do R2; o Pages serve o app e as mídias
locais.

O plano gratuito do Pages não cobra requisições nem banda e aceita até 20.000 arquivos e 25 MiB
por arquivo. Em 06/11/2026 o build tinha **1.242 arquivos, 133,7 MB** e o maior arquivo era
`marxismo/index.html` com **0,86 MB**, dentro dos limites.

O caminho normal é o CI: o job `deploy-pages` publica o artefato verificado quando a `master`
avança. Para publicar manualmente em uma emergência:

```bash
npm run build
npm run infra:pages:check   # valida limites e mostra o comando
npm run infra:pages         # publica em atlas-bellussi.pages.dev
```

O projeto é Direct Upload, criado com:

```bash
npx wrangler pages project create atlas-bellussi --production-branch master
```

O Pages usa barra final nas rotas de diretório (`/fontes/`). O `scripts/seo.mjs` gera canonical
e sitemap nessa mesma forma para não duplicar a URL, usando
`https://atlas-bellussi.pages.dev` como origem padrão. Para usar domínio próprio, adicione o
domínio ao projeto no painel e defina `ATLAS_SITE_URL`; o `ATLAS_CDN_URL` continua apontando
para o Worker de conteúdo.

## Armazenamento dos deployments

Os HTMLs estáticos incluíam cópias dos objetos do grafo via TransferState.
O repositório agora limita cada objeto embutido a 16.000 caracteres em todas
as rotas. Objetos maiores são baixados do release fixado no R2, conferidos por
SHA-256 e reutilizados pelo cache do navegador e pela instância do repositório.
O conteúdo HTML e o prerender continuam disponíveis para indexação.

A medição local em 06/11/2026 passou de aproximadamente 460 MB para 86 MB no diretório público, cerca de 81% de redução. A página de pessoas passou de cerca de 15 MB para 176 KB. Os valores dependem do release de conteúdo.

A redução vale para novos builds. No Pages, cada deploy guarda o conjunto de arquivos enviado;
revisar a lista em **Deployments** e excluir versões antigas quando o uso crescer, preservando o
deploy atual e pelo menos um alvo de rollback. Conferir o total dos arquivos em
`dist/atlas/browser`, as rotas principais, a hidratação e os links antes de publicar.

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

No CI, a variável pública `ATLAS_RAW_BASE_URL` do GitHub aponta para o domínio público nativo do
bucket `atlas-public` (`https://pub-8c938ef778c64292a6ac1a79b25a9233.r2.dev`). Como o download dos
16 mil objetos `raw/<sha256>.bin` usa operações Classe B do R2 (10 milhões grátis/mês) com
concorrência limitada a `4` em `scripts/ingestion/fetch-raw.mjs`, as execuções de CI não consomem
a cota diária de 100 mil invocações/dia do plano gratuito de Workers, preservada exclusivamente para
o tráfego de leitores em `atlas-content-delivery`.

O Worker `atlas-raw-delivery` (`scripts/infra/raw-delivery*`,
`https://atlas-raw-delivery.atlas-bellussi.workers.dev`) permanece como espelho opcional caso seja
necessário rotear via Worker. O script `fetch-raw.mjs` segue conferindo o SHA-256 por objeto e
gravando o cache de forma atômica, e a aplicação continua usando a URL de conteúdo definida no
ponteiro `content/content-pointer.json`.

Os downloads parciais verificados ficam no cache do Actions (`actions/cache`) condicionados às
mudanças em `scripts/ingestion/`, `scripts/verify-ingestion.mjs` ou `.github/workflows/ci.yml`.
