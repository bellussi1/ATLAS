# Tokens do design system · alvo v2

Estado: **aprovado, não implementado**. Até a migração, `src/styles.scss` é a fonte do que existe. Quando os tokens forem implementados, esta tabela deve ser regenerada a partir deles.

## Camadas

```
src/styles/tokens/
  _primitives.scss   valores brutos por pigmento (--pig-*)
  _semantic.scss     intenção de uso; mantém os nomes atuais (--color-accent, --color-ink...)
  _registers.scss    [data-register='reading'|'desk'|'poster'] remapeia os semânticos
```

Componentes usam só semânticos. Primitivos aparecem apenas em `_semantic.scss` e `_registers.scss`. Sem dependência nova (SCSS emitindo custom properties). `ui-contrast.spec.ts` lê os primitivos e valida cada par semântico declarado.

## Primitivos

| Token | Valor | Observação |
|---|---|---|
| `--pig-cal-50` | `#FBF8F1` | atual `--color-canvas` |
| `--pig-cal-100` | `#F3ECDF` | superfície sutil quente |
| `--pig-tinta-900` | `#141211` | atual `--color-ink` |
| `--pig-terra-900` | `#241B19` | fundo escuro do cartaz |
| `--pig-pau-brasil-500` | `#D42A1F` | só superfície |
| `--pig-pau-brasil-700` | `#B81D16` | atual `--color-accent` |
| `--pig-pau-brasil-900` | `#811F1A` | atual `--color-accent-hover` |
| `--pig-urucum-300` | `#F6B27A` | |
| `--pig-urucum-500` | `#EF8A3A` | atual `--color-orange-paper` |
| `--pig-urucum-800` | `#9A4A0C` | atual `--color-orange-strong` |
| `--pig-ocre-300` | `#F2D48A` | |
| `--pig-ocre-500` | `#E8B84E` | substitui `#EEC35A` |
| `--pig-ocre-800` | `#8A5F00` | texto ocre sobre claro |
| `--pig-mata-300` | `#9CCBA6` | substitui `--color-teal-paper` |
| `--pig-mata-500` | `#2E8F5E` | superfície; texto claro só grande |
| `--pig-mata-700` | `#1E6B44` | texto verde |
| `--pig-mata-900` | `#12422B` | |
| `--pig-jenipapo-500` | `#4A5079` | |
| `--pig-jenipapo-700` | `#363A5F` | atual `--color-indigo` |
| `--pig-jenipapo-900` | `#1F2238` | |
| `--pig-rosa-300` | `#EAB0C2` | atual `--color-rose-paper` |
| `--pig-rosa-700` | `#9C3558` | texto rosa |

Os estados (`info`, `success`, `warning`, `danger`) mantêm os valores atuais até revisão própria.

## Contraste medido (fórmula WCAG sRGB, 19/11/2026)

| Texto / fundo | Razão | Uso |
|---|--:|---|
| tinta / cal-50 | 17,61 | corpo |
| pau-brasil-700 / cal-50 | 6,14 | link, ação, foco |
| pau-brasil-700 / cal-100 | 5,54 | link em superfície sutil |
| mata-700 / cal-50 | 6,11 | texto verde |
| ocre-800 / cal-50 | 5,33 | texto ocre |
| urucum-800 / cal-50 | 5,89 | texto laranja |
| rosa-700 / cal-50 | 6,46 | texto rosa |
| jenipapo-700 / cal-50 | 10,27 | texto |
| tinta / urucum-300, urucum-500 | 10,29 · 7,44 | texto sobre suporte |
| tinta / ocre-300, ocre-500 | 12,95 · 10,14 | texto sobre suporte |
| tinta / mata-300 · rosa-300 | 10,23 · 10,22 | texto sobre suporte |
| **tinta / pau-brasil-500** | **3,69** | só texto grande |
| cal-50 / pau-brasil-500 | 4,77 | texto claro sobre cartaz vermelho |
| cal-50 / pau-brasil-700 · 900 | 6,14 · 9,23 | botão, faixa |
| **cal-50 / mata-500** | **3,80** | só texto grande |
| cal-50 / mata-700 · 900 | 6,11 · 10,76 | |
| cal-50 / jenipapo-500 · 700 · 900 | 7,29 · 10,27 · 14,73 | |
| cal-50 / terra-900 | 15,89 | texto do cartaz escuro |
| ocre-300 · ocre-500 / terra-900 | 11,69 · 9,15 | destaque no escuro |
| urucum-300 · urucum-500 / terra-900 | 9,29 · 6,72 | |
| mata-300 · rosa-300 / terra-900 | 9,24 · 9,22 | |
| **pau-brasil-500 / terra-900** | **3,33** | não usar para texto |
| ocre-300 / mata-700 | 4,49 | não usar para texto pequeno |
| ocre-300 / jenipapo-700 | 7,55 | |

## Semânticos novos

| Token | Leitura | Cartaz |
|---|---|---|
| `--surface-page` | cal-50 | terra-900 |
| `--text-primary` | tinta-900 | cal-50 |
| `--text-accent` | pau-brasil-700 | ocre-300 |
| `--surface-stamp-a..e` | urucum-300, ocre-300, mata-300, rosa-300, cal-100 | pau-brasil-500, ocre-500, mata-500, jenipapo-700, urucum-500 |
| `--text-on-stamp` | tinta-900 | cal-50 (exceto ocre: tinta) |

Mesa usa os valores de leitura; as famílias do grafo e do mapa mantêm tokens próprios com `stroke-dasharray`.

## Escalas não cromáticas

| Grupo | Tokens |
|---|---|
| Forma | `--radius-none: 0`, `--radius-tight: .125rem`, `--radius-panel: .25rem`, `--radius-pill: 999px`, `--radius-circle: 50%` |
| Perfuração | `--perforation-size`, `--perforation-gap` |
| Elevação | `--shadow-offset-sm: 3px 3px 0`, `--shadow-offset-md: 5px 5px 0`, `--shadow-offset-lg: 8px 8px 0` (cor sempre tinta) |
| Camada | `--z-base: 0`, `--z-raised: 10`, `--z-sticky: 30`, `--z-popover: 40`, `--z-overlay: 50`, `--z-toast: 60` |
| Material | `--grain-opacity`, `--halftone-cell` |
| Tipo | `--font-text` (Zilla Slab), `--font-display` e `--font-numeric` (Archivo), `--font-label` (Archivo `wdth` 75) |
| Espaço | escala atual + `--space-24` |
| Motion | atual (120/180/240/480 ms, `--ease-out`) |

## Matriz de substituição

| Legado | Destino |
|---|---|
| `--color-teal-paper`, `--tint-2` | `--pig-mata-300` via `--surface-stamp-c` |
| `--color-indigo` | `--pig-jenipapo-700` |
| `--color-orange-paper` / `-strong` | `--pig-urucum-500` / `-800` |
| `--color-ochre-paper` / `-strong` | `--pig-ocre-500` / `-800` |
| `--paper`, `--ink`, `--signal`, `--rule`, `--serif` etc. | removidos ao fim da migração |
| `box-shadow: 2–8px … var(--color-ink)` (6 variações em 29 arquivos) | `--shadow-offset-{sm,md,lg}` |
| z-index literais (0–60) | `--z-*` |
| `border-radius: 50%` / `999px` | `--radius-circle` / `--radius-pill` |
| 15 hex literais em SCSS de componentes (8 em `ideology-page`) | semânticos |
| borda 3px + sombra das fichas | `app-stamp` |
| selo de revisão em texto solto | `app-seal` |

## Componentes base

| P | Componente | Origem |
|---|---|---|
| 0 | `app-stamp` | novo |
| 0 | `app-seal` | extrai de cards e leituras |
| 0 | utilitários `.atlas-grain`, `.atlas-halftone` | novo |
| 0 | `app-halftone-figure` | envolve `licensed-asset` |
| 1 | `app-thread` | generaliza `poster-loom` |
| 1 | `record-card`, `knowledge-context`, `pagination`, `select-menu`, `text-field`, `section-switcher` | reskin |
| 1 | `atlas-band-heading`, botões, links, `KnowledgeText` | reskin leve |
| 2 | `app-portrait-plate` | novo |
| 2 | composição de cartaz (mosaico + grade de selos) | evolui `geometric-mosaic` |

## Ordem de migração

Um commit por etapa. Cada etapa roda `lint`, `typecheck`, `test`, `build`, E2E pertinente e capturas em 375, 768 e 1366 px.

1. Tokens em camadas sem mudança visual (aliases, hex, sombras, z-index, raios).
2. Valores da paleta atrás dos semânticos, com o spec de contraste ampliado.
3. Primitivos P0.
4. Cards e contexto compartilhados.
5. Home (cartaz).
6. Leituras (leitura).
7. Acervo e verbete.
8. Header e footer (cartaz).
9. Grafo e mapa (mesa).
10. Remoção de aliases e CSS morto.
