# Métricas e popularidade

Status: operação inicial
Última verificação: 18/11/2026

O site mede audiência sem backend e sem cookies. A ordem de leituras e itinerários vem de um snapshot de 30 dias versionado em `metrics/popularity.json`.

## Peças

| Peça                     | Papel                                           | Custo                           |
| ------------------------ | ----------------------------------------------- | ------------------------------- |
| GoatCounter              | page views, visitantes únicos por dia e cliques | gratuito para uso não comercial |
| Cloudflare Web Analytics | page views, referrers, Core Web Vitals          | gratuito                        |
| GitHub Actions           | coleta diária e PR semanal                      | gratuito em repositório público |
| `uptime.yml`             | site, 404 real, `health.json` e `pointer.json`  | gratuito                        |

## Configuração

Credenciais configuradas no código, na Cloudflare e no GitHub (`bellussi1/ATLAS`):

- **GoatCounter (`bellussi`):** site criado em `https://bellussi.goatcounter.com`, variável `GOATCOUNTER_SITE` cadastrada no GitHub e em `~/.atlas/r2.env`, e segredo `GOATCOUNTER_API_KEY` cadastrado no GitHub Actions. (Para rodar `node scripts/metrics/sync.mjs` localmente incluindo o GoatCounter, adicione opcionalmente `GOATCOUNTER_API_KEY` em `~/.atlas/r2.env`.)
- **Cloudflare Web Analytics:** site `atlas-bellussi.pages.dev` ativo (`site_tag` `94fa753bc9574661ac5d72a80e654732`), vinculado ao projeto Pages `atlas-bellussi`, com `CLOUDFLARE_ANALYTICS_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` cadastrados como variáveis no GitHub e em `~/.atlas/r2.env`.
- **Cloudflare GraphQL Analytics:** token de conta `atlas-analytics-read` (`Account Analytics Read`) criado e cadastrado no segredo `CLOUDFLARE_ANALYTICS_API_TOKEN` do GitHub e em `~/.atlas/r2.env`.

Não há pendências manuais de credenciais. No build do CI (`ci.yml`), `GOATCOUNTER_SITE` e `CLOUDFLARE_ANALYTICS_TOKEN` já entram em `analytics-config.js`; a coleta em produção começa assim que `develop` for publicado na `master`. Em desenvolvimento local sem essas variáveis, nada é carregado.

## Como funciona

1. `scripts/metrics/sync.mjs` consulta os serviços com credenciais ativas (GoatCounter e/ou Cloudflare, aceitando `~/.atlas/r2.env` localmente) e grava `metrics/popularity.json` e `metrics/history/AAAA-MM.json`.
2. O workflow diário salva um artefato. Na segunda-feira, abre um PR com o snapshot.
3. O build lê o JSON e ordena antes do prerender. Sem dados, mantém a ordem editorial.
4. O ranking usa 30 dias, mínimo de 20 visitantes, prior editorial e uma vaga de curadoria na home.

## Regras de ranking

- visitantes únicos por dia, não page views;
- mínimo de 20 visitantes para entrar;
- prior editorial para desempatar e evitar um clique isolado;
- `/`, `/acervo` (raiz), bots, previews `unlisted` e tráfego de desenvolvimento ficam fora;
- home: três populares + uma vaga editorial.

## Privacidade

- sem cookies, sem perfil entre sites e sem texto de página nos eventos;
- GoatCounter e Cloudflare processam o IP para contar; o ATLAS não guarda IP;
- retenção agregada de até 12 meses;
- a página `/privacidade` explica a medição e como bloquear.

## Limites conhecidos

- GoatCounter é fair use e sem SLA; uso comercial exige revisão.
- Cloudflare Web Analytics não tem eventos customizados; cliques ficam no GoatCounter.
- O dashboard da Cloudflare mostra 30 dias; o histórico depende do snapshot.
- GitHub Actions agenda em melhor esforço; atraso não é falha do site.
- Ad blockers reduzem os números; trate como direção, não censo.
