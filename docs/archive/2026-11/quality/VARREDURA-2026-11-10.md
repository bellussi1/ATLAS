Status: histórico
Última verificação: 10/11/2026

# Varredura do ATLAS — 10/11/2026

Varredura de código, conteúdo, acessibilidade, performance, SEO, testes e operação depois da
publicação das prévias de nazismo, stalinismo e trabalhismo (PR #74, release `5923d2e`).

## Estado observado

- `master` em `9501f7a`; `develop` em `82c5ae1`; release `5923d2e` no R2.
- 16 coleções e 7 leituras compiladas (4 curadas e 3 prévias).
- Produção: `/leitura/nazismo/`, `/leitura/stalinismo/` e `/leitura/trabalhismo/` respondem 200
  com selo de rascunho; fora da home e da busca.
- Build: 1.275 rotas prerenderizadas e 1.250 URLs no sitemap.
- Verificações: 364 unitários, 199 de conteúdo, 181 e2e no CI, 1.277 páginas no `check:links`;
  `lint` e `typecheck` exit 0; `npm audit --omit=dev` com 0 vulnerabilidades.

## Achados

| # | Prioridade | Achado | Evidência | Issue |
| --- | --- | --- | --- | --- |
| 1 | P1 | Prévias indexáveis e sem `noindex` | Produção com `robots: index, follow`; `published: false`; links em `/verbete/nazismo` e `/verbete/stalinismo` | #75 |
| 2 | P1 | Redirects não cobrem barra final | `/marxismo` 301, `/marxismo/` 200; `/nazismo/` 200 e no sitemap; `seo.mjs` remove a barra antes de comparar | #76 |
| 3 | P1 | Fixture anuncia 7 leituras e entrega 4 | `manifest.ideologies` com 7; assets das 3 prévias ausentes | #77 |
| 4 | P1 | Bibliografia incompleta | 38/32/45 fontes citadas contra 1 no bloco `fontes` | #78 |
| 5 | P1 | Stalinismo com 2 capítulos pendentes | 9/12 com blocos; `origens` e `principios` vazios | #79 |
| 6 | P1 | Piso do piloto | Relações: nazismo 22 e trabalhismo 19 contra 37; tipos de bloco 4/7 nas três | #80 |
| 7 | P2 | `unlisted` não é estado de primeira classe | Só `homeStats` e o fixture leem o campo; `seo.mjs` e `record.component.ts` têm listas manuais | #81 |
| 8 | P2 | Cobertura de rotas públicas incompleta | Faltam `/acervo/estados`, `/acervo/cidades`, `/acervo/locais` e `/grafos` | #82 |
| 9 | P2 | Proveniência bruta fora do git e do worker | `.gitignore` 66–70; capturas locais; `ingest:verify` falha em checkout novo | #83 |
| 10 | P2 | Estado vivo e relatório defasados | Release, coleções, rotas, testes e links antigos | #84 |
| 11 | P2 | Open Graph sem imagem e sem `twitter:card` | Home, leitura e verbete sem `og:image`, `twitter:image` e `twitter:card` | #85 |
| 12 | P2 | Sitemap publica `/index.csr` | 1.250 URLs; única sem barra final; rota interna de CSR | #86 |
| 13 | P1 | Densidade das prévias | 454–1.021 palavras contra 2.909–4.847; 36–64 strings de prosa contra 147–234 | #87 |
| 14 | P2 | Leitura baixa bundle de 29,78 MB | 29.780.495 bytes crus; 2.792.072 em brotli; carga antes de hidratar | #88 |

## Ordem sugerida

1. Corrigir os P1 de SEO e testes: #75, #76 e #77.
2. Fechar os gates editoriais do piloto: #78, #79, #80 e #87.
3. Tornar `unlisted` um estado único (#81) antes de adicionar outra prévia.
4. Completar a cobertura de rotas (#82), a proveniência raw (#83), o Open Graph (#85), o sitemap (#86) e o bundle da leitura (#88).

## Limitações

- Não houve auditoria com leitor de tela real; o issue #13 continua aberto.
- Não foi medido INP de campo; a referência de Lighthouse é local.
- Não houve revisão humana do conteúdo; as três leituras seguem como rascunho.
- A varredura não alterou conteúdo editorial nem executou expansão paga.
