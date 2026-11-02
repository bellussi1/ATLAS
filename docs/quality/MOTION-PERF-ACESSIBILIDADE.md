# Motion, estabilidade e acessibilidade (Prompt 06)

Data: 02/11/2026. As medições são de laboratório (Playwright/Chromium, build de produção servido localmente), não dados de campo.

## Medições

Página percorrida até o fim com a roda do mouse, observando `layout-shift` e `largest-contentful-paint` e rodando axe (WCAG 2 A/AA):

| Rota | 320 | 390 | 768 | 1440 |
| --- | --- | --- | --- | --- |
| `/`: CLS / LCP | 0 / 228 ms | 0 / 208 ms | 0 / 156 ms | 0 / 168 ms |
| `/marxismo/`: CLS / LCP | 0 / 444 ms | 0 / 448 ms | 0 / 472 ms | 0 / 536 ms |
| `/liberalismo/`: CLS / LCP | 0 / 232 ms | 0 / 376 ms | 0 / 380 ms | 0 / 468 ms |

- Nenhuma violação axe A/AA e nenhum overflow horizontal em nenhuma combinação.
- INP não foi medido. CLS após interação já é coberto por painéis de altura reservada (Prompt 01) e pelo grafo, que não move nós (Prompt 04).

## Problemas encontrados

| P | Problema | Correção |
| --- | --- | --- |
| P1 | Alvos de toque abaixo de 24 px (WCAG 2.5.8): botões e links de licença na galeria do acervo (17 a 19 px), crédito do retrato de abertura e links de fonte na relação selecionada | `min-height: 1.5rem` em `inline-flex`, sem mudar o texto |
| P3 | Uma transição com valores fixos (`180ms ease`) nos cards do acervo | Passou a usar os tokens `--motion-selection` e `--ease-out` |
| P3 | Aviso de build `js-comment-in-css` por `fill 0//0 100vmax` em `border-image` | Escrito explicitamente como `fill 0 / 1 / 0 100vmax`, com o mesmo valor computado |

## Inventário de motion

- **Tokens** em `src/styles.scss`: `--motion-fast` 120 ms, `--motion-selection` 180 ms, `--motion-standard` 240 ms, `--motion-slow` 480 ms e `--ease-out`.
- Todas as transições das leituras usam esses tokens.
- `prefers-reduced-motion: reduce` e o botão "Reduzir movimento" (`html.atlas-reduced-motion`) zeram durações globalmente. As revelações e o painel contextual só animam com `no-preference`.

## Direção escolhida

- **Sóbrio funcional:** só feedback de estado, como foco, seleção e pressão. Mais claro, mas perde a continuidade entre capítulos.
- **Expressivo guiado:** revelações e transições narrativas. Mais rico, com risco de atrasar a leitura.
- **Escolha: meio-termo, que é o estado atual.** As revelações são curtas e só com `no-preference`. As seleções usam `opacity` e cor, sem mudar a geometria. A única animação de propriedade geométrica é a faixa de foco do gráfico de épocas (`left`/`width`, 480 ms), mantida porque mostra a continuidade entre épocas e é desligada pelo reduced motion.

## Regressão

`e2e/quality.spec.ts` cobre Marxismo e Liberalismo a 390 e 1440 px: CLS < 0,1 ao percorrer a página inteira, ausência de overflow, nenhum controle isolado abaixo de 24 px e zero violações axe A/AA.

## Não feito

- Zoom de 200%, toque real e leitor de tela real.
- Medição de INP.
- Desempenho de rolagem em aparelho fraco.
