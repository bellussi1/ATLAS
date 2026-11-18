# Métricas e popularidade

Status: operação inicial
Última verificação: 17/11/2026

O site mede audiência sem backend e sem cookies. A ordem de leituras e itinerários vem de um snapshot de 30 dias versionado em `metrics/popularity.json`.

## Peças

| Peça                     | Papel                                           | Custo                           |
| ------------------------ | ----------------------------------------------- | ------------------------------- |
| GoatCounter              | page views, visitantes únicos por dia e cliques | gratuito para uso não comercial |
| Cloudflare Web Analytics | page views, referrers, Core Web Vitals          | gratuito                        |
| GitHub Actions           | coleta diária e PR semanal                      | gratuito em repositório público |
| `uptime.yml`             | site, 404 real, `health.json` e `pointer.json`  | gratuito                        |

## Configuração manual

Site criado em `https://bellussi.goatcounter.com` (código `bellussi`). O restante continua manual:

1. Gere uma API key em `Usuário → API`.
2. Ative o Cloudflare Web Analytics para o site.
3. Crie um token Cloudflare com `Account Analytics Read`.
4. Cadastre no GitHub:
   - variável `GOATCOUNTER_SITE` = `bellussi` (já cadastrada);
   - segredo `GOATCOUNTER_API_KEY`;
   - segredo `CLOUDFLARE_API_TOKEN`;
   - variável `CLOUDFLARE_ACCOUNT_ID`.
5. No deploy dos Pages, a variável `GOATCOUNTER_SITE` já entra pelo workflow; `CLOUDFLARE_ANALYTICS_TOKEN` é opcional. Sem elas, nada é carregado.

## Como funciona

1. `scripts/metrics/sync.mjs` consulta os dois serviços e grava `metrics/popularity.json` e `metrics/history/AAAA-MM.json`.
2. O workflow diário salva um artefato. Na segunda-feira, abre um PR com o snapshot.
3. O build lê o JSON e ordena antes do prerender. Sem dados, mantém a ordem editorial.
4. O ranking usa 30 dias, mínimo de 20 visitantes, prior editorial e uma vaga de curadoria na home.

## Regras de ranking

- visitantes únicos por dia, não page views;
- mínimo de 20 visitantes para entrar;
- prior editorial para desempatar e evitar um clique isolado;
- `/`, `/acervo`, bots, previews `unlisted` e tráfego de desenvolvimento ficam fora;
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
