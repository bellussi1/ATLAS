# Épocas e relações (Prompt 04)

Data: 02/11/2026. Revisão por agente, sem revisão humana.

## O que já funcionava

O `EraChartComponent` põe épocas, vidas e marcadores na mesma escala, com posições tiradas apenas dos anos registrados. A seleção é feita por botão e setas, o painel de detalhe é `aria-live`, e a nota avisa que barras não indicam influência. O grafo de vertentes tem coordenadas pré-calculadas no build (`content:build`) e tabela alternativa.

## Problemas observados

- **Épocas:** os marcadores datados estavam só no gráfico `aria-hidden`. Leitores de tela e o celular não tinham lista dos registros da época. Pessoas e registros sem ano sumiam em silêncio.
- **Grafo:** o tipo aparecia como identificador técnico (`divergencia-ou-critica`), não havia legenda e todas as linhas eram iguais. Assim, influência, crítica e link de descoberta não se distinguiam.

## Taxonomia de relações

Definida em `src/app/features/ideologies/models/relation-types.ts`. Cada tipo tem rótulo, significado, estilo de linha e uma marcação de histórico ou não:

| Tipo                                                  | Linha      | Histórica                                                                |
| ----------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| Influência documentada, Desenvolvimento, Continuidade | contínua   | sim                                                                      |
| Crítica ou divergência                                | tracejada  | sim                                                                      |
| Associação temática, Link de descoberta               | pontilhada | não; o painel diz explicitamente que não é relação histórica documentada |

Nenhum tipo implica causalidade. "Participação" (pessoa em evento/instituição) fica para quando o grafo de vertentes tiver arestas desse tipo; hoje só existem as três primeiras categorias nos dados (Marxismo: 3 críticas; Liberalismo: 4 influências, 1 desenvolvimento, 3 críticas).

## Comparação de abordagens

- **SVG próprio com coordenadas no build (mantido):** preciso, determinístico, sem dependência nova e acessível com tabela. A desvantagem é a manutenção manual de layout.
- **Engine externa (D3-force, Cytoscape):** layout automático, mas posições instáveis entre filtros e mais de 100 kB de JS para 10 nós. Rejeitada.

## Implementado

1. **#épocas:** a lista "Registros datados na época" fica no painel acessível, e a nota explica marcadores e informa quantos registros ficam fora da escala por falta de data.
2. **Vertentes:** legenda "Como ler as linhas", filtro com rótulos legíveis, estilo de linha por tipo, frase de significado na relação selecionada e esmaecimento dos nós não relacionados, sem mover nenhum (`opacity`; sem transição com `prefers-reduced-motion`).

Os dois componentes são compartilhados e valem nas duas leituras.

## Testes

- `era-chart.component.spec.ts`: registros por época e contagem de registros sem data.
- E2E `pages.spec.ts`: lista datada, legenda, significado, coordenadas estáveis na seleção e dois nós relacionados, nas duas rotas.

## Pendências

- O gráfico ignora `temporalExtent.precision`: datas de década ou século aparecem como ano exato.
- Não houve teste de zoom 200% nem de toque real.
- A genealogia de vertentes do Marxismo segue limitada a três críticas documentadas.
