Status: resultado
Última verificação: 09/11/2026

# Piloto das três tradições — 09/11/2026

Nazismo, stalinismo e trabalhismo. Extração paga executada com teto por tradição e teto total
de US$ 6,06 no razão do checkout.

## Extração

| Caso | Artigos | Estimado | Pior caso | Gasto real |
| --- | ---: | ---: | ---: | ---: |
| Nazismo | 40 | US$ 0,595 | US$ 1,131 | **US$ 0,164** |
| Stalinismo | 44 | US$ 0,652 | US$ 1,241 | **US$ 0,178** |
| Trabalhismo | 51 | US$ 0,751 | US$ 1,434 | **US$ 0,192** |
| **Total** | **135** | **US$ 1,998** | **US$ 3,806** | **US$ 0,534** |

Todos os estágios 5 fecharam: 40/40, 44/44 e 51/51 artigos com rascunho rico, contrato válido,
citações literais reverificadas, revisão `assistant` e relações confirmadas na segunda passada.

Ajustes editoriais durante a extração:

- 5 rascunhos vieram sem `oneLine` (`autoritarismo`, `luta de classes`, `República de Weimar`,
  `Guerra Civil Chinesa`, `Revolução Russa de 1917`); a linha foi preenchida a partir da primeira
  frase do resumo, sem afirmação nova.
- `Josef Stalin` estourou `max_tokens` por causa do pensamento (9.085 de 12.000). Foi repetido com
  `--effort low` só para essa entidade; o restante ficou em Haiku 5.5 medium.

## Consolidação

- 16 coleções no grafo; `content:build` passou.
- Novas coleções: `atlas-nazismo` (10 entidades), `atlas-stalinismo` (4) e
  `atlas-trabalhismo` (19).
- Boa parte dos 40/44/51 aceitos já existia no grafo por QID e foi **mesclada** em coleções
  compartilhadas (`atlas-verbetes-citados`, `atlas-ideologias-principais`, `atlas-marx-valor`,
  `atlas-outras-ideologias`, `atlas-social-democracia`), como manda o princípio de um grafo só.
- Correções de tipo para a mesclagem: `Positivismo` passou a ideologia, `Holocausto` a
  acontecimento e `Alemanha Nazista` a lugar (categoria país).
- Glossário: 65/71/73 termos ligados; 0 termos sem entidade no atlas depois do filtro.

## Lente de pertencimento (09/11)

Decisão: a tradição é uma lente, não uma coleção. `content/traditions/<slug>.json` guarda
`belonging.qids` com os QIDs aceitos; `rootQid` entra sempre na resolução. As entidades continuam
nas coleções onde a consolidação as deixou.

- `scripts/tradicao/belonging.mjs` resolve os QIDs no grafo inteiro e devolve ids, entidades e QIDs
  ausentes, sem mover nem duplicar nó.
- `coverage.mjs` mede entidades, relações, fontes e imagens da lente. A fonte-verbete de cada
  entidade entra mesmo quando ela foi mesclada em outra coleção, sem contar a coleção inteira.
- Estágio 6 verifica que a lente lista todos os aceitos e que os QIDs aceitos resolvem no grafo.
- Estágio 7 liga glossário e hovers ao id real da entidade: o id provisório da extração pode ter
  sido unido a `person-…` na consolidação.
- Estágio 8 procura a raiz no grafo inteiro, usa o índice global de evidências para relações de
  outras coleções e escreve a página na coleção focal (`atlas-<slug>`) com a paleta do registro.

Cobertura depois da lente (`npm run tradicao:coverage`):

| Tradição | Entidades | Relações | Fontes | Imagens | QIDs |
| --- | ---: | ---: | ---: | ---: | --- |
| Nazismo | 41 | 16 | 42 | 35 | 41/41 |
| Stalinismo | 46 | 68 | 49 | 53 | 45/45 |
| Trabalhismo | 50 | 16 | 52 | 44 | 50/51 |

Estágios 6 e 7 passam nas três. O estágio 8 passa em dry-run para nazismo e stalinismo. O
trabalhismo continua bloqueado: o `rootQid` Q25447221 (`trabalhismo no Brasil`) não está no grafo;
o único "Trabalhismo" é a desambiguação Q125378958, sem afirmações. É preciso capturar e consolidar
a raiz antes de gerar a leitura.

Estimativa com a página gerada em memória, sem escrever:

| Tradição | Entidades | Relações | Fontes citadas | Capítulos com blocos | Imagens |
| --- | ---: | ---: | ---: | ---: | ---: |
| Nazismo | 44 | 22 | 1 | 9/12 | 38 |
| Stalinismo | 48 | 80 | 2 | 6/12 | 55 |

A lente fecha entidades e imagens, mas não o piso inteiro: relações entre aceitos (nazismo), fontes
citadas e capítulos/blocos ainda dependem da geração e da edição. O piso exige 10 capítulos com
blocos, 6 completos, 7 tipos de bloco e 11 fontes citadas; a leitura montada do grafo não produz
todos esses tipos sozinha. Isso é trabalho dos estágios 9 e 10, não da lente.

## Estado dos arquivos

- Código do pipeline corrigido em `cc1233d`: `--tradition`, `mergeAtlas` nas coleções ampliadas,
  remoção do filtro que apagava `src-wiki-*` nativos, glossário filtrado e erro de build com o
  slug da leitura.
- Conteúdo do piloto (16 coleções, manifesto, três páginas e os três registros com a lente) foi
  commitado em **`7a9e60e`**; nada foi publicado no R2 e as três páginas seguem `published: false`.
- As capturas brutas do piloto (12 manifestos e blobs) ficam locais em `scripts/ingestion/wiki-extract/raw/`
  e fora do git; o worker de raw não tem esses objetos. Publicar o raw é uma decisão separada.

## Próxima decisão

1. Gerar os capítulos de nazismo e stalinismo (grátis) e revisar a leitura; o estágio 8 já passa
   em dry-run para as duas.
2. Tratar o trabalhismo: capturar a raiz Q25447221 (grátis) e extrair o verbete (pago, com
   estimativa e aprovação) antes de gerar a leitura.
3. Fechar as lacunas de piso que não são da lente (fontes citadas, capítulos/blocos e tipos de
   bloco) na edição do estágio 9 e na montagem editorial, sem baixar o piso.
