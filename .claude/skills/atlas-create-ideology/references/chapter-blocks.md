# Capítulos e blocos sugeridos

Os blocos são livres; esta tabela é ponto de partida, não template. Tipos e campos: `pageBlockSchema` em `ideology-page.schema.ts`.

| #   | `id`           | Pergunta-base                  | Blocos que costumam servir                                                           |
| --- | -------------- | ------------------------------ | ------------------------------------------------------------------------------------ |
| 01  | `introducao`   | Do que estamos falando?        | nenhum (abertura + narrativa)                                                        |
| 02  | `origens`      | Onde e por que surgiu?         | `entities` (`documents`)                                                             |
| 03  | `principios`   | No que acredita?               | `explorations` (`principles`)                                                        |
| 04  | `conceitos`    | Que palavras preciso entender? | `explorations`, `entities` (`concepts`)                                              |
| 05  | `epocas`       | Como mudou no tempo?           | `chronology`, `timeline`, `explorations`                                             |
| 06  | `pensadores`   | Quem formulou?                 | `entities` (`thinkers`): casa dos retratos                                           |
| 07  | `vertentes`    | Todos concordam?               | `explorations` (`schools`), `graph` (arestas tipadas em `content/graph/<slug>.json`) |
| 08  | `experiencias` | Onde foi tentado ou disputado? | `explorations`                                                                       |
| 09  | `debates`      | Quais as objeções?             | `debate` (defesa, crítica, resposta, limites), `explorations`                        |
| 10  | `conexoes`     | Com o que dialoga?             | `atlas` (acervo de descoberta), `graph`                                              |
| 11  | `leituras`     | O que ler depois?              | `reading-path` (com `kind`: primária, introdução, estudo, crítica)                   |
| 12  | `fontes`       | Como sei que é verdade?        | `sources`                                                                            |

Tipos de aresta e significado para o leitor: `src/app/features/ideologies/models/relation-types.ts`. Ligações enciclopédicas são `descoberta-enciclopedica`, nunca influência documentada.
