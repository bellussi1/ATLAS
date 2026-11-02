# Camada de posições estimadas (análise separada do acervo)

Data: 02/11/2026. Revisão por agente, sem revisão humana. Registros novos seguem `editorialStatus: pending`.

## O que é

Uma camada analítica que compara leituras de uma tradição em seis eixos. Cada posição é estimada a partir de **afirmações atribuídas e com fonte**, nunca a partir de um questionário respondido por modelo nem de um rótulo. Ela fica dentro de uma leitura, num bloco `positions`, e rotulada como estimativa.

Não é o acervo histórico: as relações do grafo continuam tipadas e com proveniência (`relation-types.ts`). Proximidade entre posições não vira influência, origem ou causa.

## Eixos (definições de trabalho)

| Eixo          | Polo −1                | Polo +1                |
| ------------- | ---------------------- | ---------------------- |
| `propriedade` | coletiva ou pública    | privada                |
| `mercado`     | planejamento central   | mercado                |
| `igualdade`   | igualdade material     | liberdade individual   |
| `poder`       | poder estatal ampliado | limites institucionais |
| `escala`      | internacionalismo      | soberania nacional     |
| `revolucao`   | ruptura revolucionária | reforma gradual        |

Os eixos são definições de trabalho para comparar leituras, não uma tipologia aceita. Qualquer eixo novo passa por revisão editorial. Não reaproveitamos eixos de outros projetos.

## Afirmação

Cada registro em `supplement.positions` (`src/content/graph/<slug>.json`) tem: `entityId`, `axisId`, `value` (−1 a +1), `confidence` (alta, média ou baixa), `classification` (tese atribuída, interpretação ou hipótese), `statement` (paráfrase em português que o texto da fonte sustente), `sourceIds` (obrigatório) e `editorialStatus` (sempre `pending` até revisão). O validador recusa fonte inexistente, valor fora da escala, eixo desconhecido e status revisado sem revisão.

## Cálculo e estados

- Peso por confiança: alta 1, média 0,6, baixa 0,3. O valor é a média ponderada.
- **insuficiente**: nenhuma afirmação sobre o eixo. Não se preenche com neutro.
- **indicativa**: uma afirmação, ou afirmações que dependem de uma só fonte. Mostra o valor com contagem de afirmações e fontes.
- **estimada**: duas ou mais afirmações de duas ou mais fontes, com amplitude menor que 1. Mostra valor e intervalo.
- **divergente**: duas ou mais fontes com amplitude de 1 ou mais. Mostra o intervalo, sem média escondendo a divergência.

## Dados semeados (verificados antes de entrar)

| Entidade         | Eixo        | Valor | Fonte                                                   | Verificação                                                                            |
| ---------------- | ----------- | ----- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Eduard Bernstein | revolucao   | 0,8   | Prefácio de 1899                                        | Citação "o movimento significa tudo" conferida no texto                                |
| Eduard Bernstein | revolucao   | 0,7   | Crítica de Luxemburg (interpretação atribuída à autora) | Citação "fazer das reformas sociais ... o seu objetivo" conferida                      |
| Rosa Luxemburg   | revolucao   | −0,8  | Reforma ou revolução (introdução)                       | Citação "a luta pelas reformas é seu meio; a revolução social, seu objetivo" conferida |
| Karl Marx        | propriedade | −0,8  | Manifesto (1848)                                        | Citação "abolição da propriedade privada" conferida                                    |

Resultado: Bernstein tem uma posição **estimada** (0,76, intervalo 0,7 a 0,8, duas fontes). Luxemburg e Marx têm posições **indicativas**. Os demais eixos estão **insuficientes**.

Tentativa descartada: a Stanford Encyclopedia of Philosophy não foi usada para a propriedade de Marx, porque o trecho lido não sustentou a afirmação. Não usar a fonte para essa afirmação.

## Limites

- Poucas afirmações: a camada está montada, mas os dados são o gargalo. Cada posição precisa de duas fontes distintas.
- A paráfrase do `statement` é editorial. Quem revisa confere o texto da fonte, não só a paráfrase.
- Não há cálculo de proximidade na interface. A função `largestPairDifference` mostra apenas a maior diferença estimada entre entidades do mesmo bloco.
- Os vetores de 12 eixos do projeto de referência não foram usados como dados. A camada aqui vem de afirmações com fonte, não de respostas de modelo a um questionário.

## Próximos passos

1. Escolher uma tradição e, para cada entidade, listar eixos com pelo menos duas fontes distintas.
2. Escrever cada afirmação com a citação conferida e a classificação correta.
3. Revisão humana antes de qualquer status diferente de `pending`.
