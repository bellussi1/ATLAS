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

## Bloqueio de modelo

A cobertura ainda falha porque o pipeline mede a tradição pela coleção `atlas-<slug>`, mas as
entidades aceitas que já existiam foram mescladas em outras coleções. O resultado é
**10/4/19 entidades** no atlas, contra **40/44/51 aceitos**; as lacunas de pessoas, relações,
fontes e imagens decorrem disso, não da extração.

O princípio do próprio pipeline diz que tradições são **lentes**, não coleções separadas. Falta
uma lista de pertencimento da tradição (QIDs/entity IDs) usada por cobertura, página e grafo. Sem
ela, mover o nó raiz para a coleção nova ou duplicar entidades violaria o grafo único.

Consequências:

- `nazismo` e `trabalhismo` passam o piso de imagens (11 e 17); `stalinismo` fica em 6 de 10
  porque as demais imagens estão em entidades mescladas.
- As três páginas foram apontadas para `atlas-<slug>`, com paleta e classificação do registro, e
  validam no `content:build`. Continuam rascunhos, com 12 capítulos, mas com poucos blocos e sem
  perguntas/ponte.
- O estágio 8 não gera leitura para rascunho não registrado, e o nó raiz (`Nazismo`,
  `Stalinismo`, `Trabalhismo`) está em `atlas-ideologias-principais`, não na coleção nova.

## Estado dos arquivos

- Código do pipeline corrigido em `cc1233d`: `--tradition`, `mergeAtlas` nas coleções ampliadas,
  remoção do filtro que apagava `src-wiki-*` nativos, glossário filtrado e erro de build com o
  slug da leitura.
- Conteúdo do piloto (16 coleções, manifesto, três páginas) está no working tree, não commitado.
- Nada foi publicado no R2; as três páginas seguem `published: false`.

## Próxima decisão

1. Criar a lista de pertencimento da tradição e usá-la em cobertura, página e grafo; ou
2. manter a coleção como unidade e decidir explicitamente mover/duplicar o nó raiz.

Sem essa decisão, gerar os 12 capítulos e fechar a cobertura seria maquiar a contagem.
