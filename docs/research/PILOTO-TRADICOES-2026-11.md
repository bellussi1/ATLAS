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
| Raiz do trabalhismo (Q25447221) | 1 | US$ 0,013 | US$ 0,028 | **US$ 0,0058** |
| **Total** | **136** | **US$ 2,011** | **US$ 3,834** | **US$ 0,540** |

Todos os estágios 5 fecharam: 40/40, 44/44, 51/51 e a raiz do trabalhismo (1/1) com rascunho
rico, contrato válido, citações literais reverificadas, revisão `assistant` e relações confirmadas
na segunda passada.

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
| Trabalhismo | 51 | 19 | 53 | 44 | 51/51 |

Estágios 6 e 7 passam nas três. O estágio 8 passou nas três. A raiz do trabalhismo foi capturada
(QID Q25447221, artigo `Trabalhismo brasileiro`, revisão 73386437) e extraída por **US$ 0,0058**
(teto de US$ 0,03): 3 relações confirmadas. A consolidação criou a entidade
`wiki-ideologia-trabalhismo-brasileiro` em `atlas-trabalhismo`, e a leitura foi gerada em
`content/ideologies/trabalhismo/page.json`, com título "Trabalhismo" e o slug do registro.

Cobertura com a página gerada e o preenchimento pela lente:

| Tradição | Entidades | Relações | Fontes citadas | Capítulos com blocos | Imagens |
| --- | ---: | ---: | ---: | ---: | ---: |
| Nazismo | 44 | 22 | 36 | 11/12 | 38 |
| Stalinismo | 48 | 80 | 31 | 9/12 | 55 |
| Trabalhismo | 51 | 19 | 45 | 11/12 | 44 |

O preenchimento pela lente (commit **`10b668b`**, páginas em **`8ed3f9f`**) adicionou aos capítulos
as entidades aceitas que não tinham aresta com a raiz — pensadores, vertentes, experiências,
conexões, conceitos e obras — e anexou a fonte-verbete de cada uma. Fontes citadas passaram a
**36/31/45** e capítulos pendentes a **0/2/0**.

Restam três lacunas:
- **Tipos de bloco (4/7 nas três)**: exige bloco editorial (roteiro de leitura, atlas ou debate).
- **Relações (nazismo 22 e trabalhismo 19, contra 37)**: exige mais extração ou curadoria.
- **Stalinismo (9/10 capítulos com blocos, 2 pendentes)**: `origens` e `principios` não têm seção
  correspondente na raiz; o artigo da raiz precisa de nova extração ou de conteúdo editorial.

## Edição (estágio 9)

As três leituras receberam pergunta e ponte em todos os capítulos preenchidos, e os gates do
estágio 9 passaram. O estágio revisa tom, pergunta e ponte; ele **não** adiciona fontes, tipos de
bloco nem preenche capítulos pendentes. Isso foi feito depois pelo preenchimento pela lente.

As perguntas e pontes são genéricas e ainda pedem revisão de tom. Para os 7 tipos de bloco, é
preciso um bloco editorial; para o stalinismo, a raiz carece de seções de origem e princípios.

## Estado dos arquivos

- Código do pipeline corrigido em `cc1233d`: `--tradition`, `mergeAtlas` nas coleções ampliadas,
  remoção do filtro que apagava `src-wiki-*` nativos, glossário filtrado e erro de build com o
  slug da leitura.
- Conteúdo do piloto (16 coleções, manifesto, três páginas e os três registros com a lente) foi
  commitado em **`7a9e60e`**; nada foi publicado no R2 e as três páginas seguem `published: false`.
- A raiz do trabalhismo foi capturada e extraída localmente; o artigo e a captura ficam em
  `generated/` e `scripts/ingestion/wiki-extract/raw/` (fora do git). A coleção e a página foram
  commitadas em **`bf8054a`**; os capítulos de nazismo e stalinismo, em **`11a13bc`**.
- As capturas brutas do piloto (12 manifestos e blobs) ficam locais em `scripts/ingestion/wiki-extract/raw/`
  e fora do git; o worker de raw não tem esses objetos. Publicar o raw é uma decisão separada.

## Próxima decisão

1. Revisar o tom das três leituras; o estágio 9 já adicionou pergunta e ponte, e o preenchimento
   pela lente já anexou as fontes.
2. Fechar os 7 tipos de bloco com edição editorial (roteiro de leitura, atlas ou debate); ampliar
   relações de nazismo e trabalhismo; decidir se o stalinismo recebe nova extração da raiz para
   `origens` e `principios`.
3. Decidir a publicação do conteúdo do piloto no R2; hoje a navegação foi publicada, mas o conteúdo
   do piloto não.
