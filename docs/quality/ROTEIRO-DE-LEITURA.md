# Roteiro de leitura (Prompt 05)

Data: 02/11/2026. Revisão por agente, sem revisão humana.

## Antes (observado)

`ReadingPathComponent` já tinha três etapas (introdutório, intermediário, avançado) e filtro por tema que esmaece sem remover. Cada obra era um card alto com ano, tema, título, autor, justificativa, edição e botão sempre visíveis: 13 cards no Marxismo e 11 no Liberalismo. Não havia distinção entre texto da tradição e obra sobre ela, nem indicação de por onde começar.

## Modelos comparados

| Modelo                                     | Iniciante                              | Leitor experiente                         | Custo                                                    |
| ------------------------------------------ | -------------------------------------- | ----------------------------------------- | -------------------------------------------------------- |
| Trilha linear rígida                       | claro                                  | impõe ordem                               | baixo                                                    |
| Grafo de pré-requisitos                    | confuso sem dados reais de dependência | bom                                       | alto; exigiria pré-requisitos que não estão documentados |
| **Trilha guiada com escolhas (escolhida)** | primeiro passo explícito               | entra em qualquer etapa; filtros por tema | baixo; reaproveita o componente                          |

Wireframes considerados: (a) etapas conectadas com linhas compactas, que foi a escolhida porque mantém as três colunas e reduz a altura; (b) cartões em trilho horizontal com rolagem, rejeitado por criar rolagem interna, que o Prompt 01 removeu.

## Implementado

- **Tipo de obra** (`kind` no schema): primária, introdução, estudo ou crítica. Classificação pela autoria: textos dos próprios autores da tradição são primários; Singer e Freeden, introdução; Hobsbawm, Kołakowski e Fawcett, estudo; Polanyi, crítica externa ao liberalismo.
- **Primeiro passo sugerido**: a primeira obra introdutória ganha um rótulo.
- **Linhas compactas**: tipo, ano, tema, título e autor. Justificativa, edição e ficha aparecem sob demanda (`aria-expanded`, uma obra aberta por vez, sem mudar de rota).
- Contagem do filtro ("N de M obras em destaque", `aria-live`).
- No desktop, a linha tracejada passa pelos marcadores e o texto das etapas fica abaixo.
- Nenhuma capa e nenhum progresso salvo.

## Não feito

- Edições brasileiras, ISBN, número de páginas e tempo de leitura: nada disso foi verificado, então nada foi acrescentado.
- Os links obra → pensador → conceito existem só quando há `entityId`; obras sem registro no acervo não ganham ficha.

## Testes

- `reading-path.component.spec.ts`: primeiro passo, tipos, expansão única e filtro não destrutivo.
- E2E `pages.spec.ts`: teclado, expansão e filtro nas duas rotas.
