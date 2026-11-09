# Selo de revisão por IA

Status: atual
Última verificação: 09/11/2026

## Regra

A revisão feita pelo assistente é identificada como IA. Nenhum texto declara revisão humana sem
registro de revisor e data, e nenhum selo de IA aparece sem um registro `assistant` correspondente.

- `content:build` falha se uma tradução aprovada não tiver revisor, data ou referência.
- `content:build` falha se uma tradução `assistant` não marcar a IA na nota.
- `content:build` falha se uma revisão concluída de afirmação ou leitura não tiver revisor e data.
- O status `verified` é neutro: "Verificada após revisão registrada", sem afirmar revisão humana.
- O verbete mostra a tradução revisada por IA com o método, o revisor e a data.
- O selo editorial de um verbete com síntese por IA e estado pendente diz "Inclui síntese por IA ·
  revisão humana não registrada".

A verificação está em `scripts/content/review-seals.mjs`, chamada por
`scripts/content/build-content.mjs` e coberta por `scripts/content/review-seals.spec.mjs`.

## Cobertura em 09/11/2026

| Item | Quantidade | Selo |
| --- | ---: | --- |
| Traduções aprovadas com `method: assistant` | 4 | "assistida por IA" no verbete, com revisor e data |
| Páginas de leitura publicadas | 4 | `rascunho`/`com-fontes`, sem revisão registrada |
| Páginas de leitura em rascunho fora do catálogo | 56 | sem publicação e sem selo |
| Revisões de afirmação `verified` | 0 | — |
| Revisões humanas sem revisor/data | 0 | — |

As quatro traduções são de `country-brazil`, `country-portugal` e das duas entradas seguintes do
catálogo `content/translations/catalogue.json`; todas usam `Codex (IA)`, data `2026-11-01`,
referência `ATLAS-TR-...` e nota com "assistida por IA" e "Sem revisão humana registrada".

O e2e `e2e/editorial-i18n.spec.ts` abre `/verbete/brasil?idioma=en` e verifica o selo
"assistida por IA" e a ressalva "Sem revisão humana registrada". O e2e de erro de conteúdo cobre a
recuperação quando o objeto do release não está disponível.

## Limites

- O selo de IA de uma afirmação individual não é renderizado separadamente: a ficha mostra o
  estado editorial da afirmação e a revisão da tradução. A auditoria cobre o registro de dados.
- O campo `reviewer` é texto livre; a auditoria reconhece `IA`, `assistant`, `assistente` e
  `Codex (IA)`, mas não substitui a identificação editorial.
- Não houve revisão humana real das leituras; os estados `rascunho` e `com-fontes` permanecem
  explícitos e o build não os apresenta como revisados.
- A revisão por IA não valida afirmações históricas nem autoriza publicação sozinha.
