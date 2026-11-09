# INP de laboratório nas leituras

Status: medição inicial
Data: 09/11/2026

## Método

Chromium via Playwright, preview local de produção, viewport 1440×900, sem throttling de rede ou
CPU. A página `/leitura/marxismo/` foi aberta e, para cada interação, um `PerformanceObserver`
coletou `event` com `durationThreshold: 16`. O INP aproximado é a maior duração entre os eventos de
interação, excluindo eventos de hover (`pointerover`, `pointerenter`, `mouseover`, `pointerout` e
`pointerleave`), que não entram no INP.

O INP de laboratório não substitui o INP de campo: não há usuários reais, rede móvel nem aparelho
fraco nesta medição.

## Resultados

| Interação | Evento | Duração | Atraso de entrada |
| --- | --- | ---: | ---: |
| Abrir ficha de Karl Marx | `click` | 80 ms | 44 ms |
| Fechar a ficha com Escape | `keydown` | 288 ms | 97 ms |
| Fechar a ficha com Escape | `keyup` | 360 ms | 227 ms |
| Trocar a época em #épocas | `click` | 72 ms | 54 ms |
| Expandir uma obra no roteiro | `click` | 48 ms | 3 ms |
| Selecionar uma relação na ficha | `click` | 288 ms | 102 ms |

O pior evento foi o `keyup` do fechamento da ficha, **360 ms**, na faixa "precisa melhorar"
(200–500 ms). As demais interações ficaram entre 48 e 288 ms. A abertura da ficha, a troca de época
e a expansão da obra ficaram abaixo de 100 ms.

O fechamento da ficha inclui a animação de saída e o retorno do foco ao gatilho; a seleção de
relação re-renderiza a lista de conexões. A medição não separa animação de trabalho de script.

## Zoom de 200%

O teste de reflow em `e2e/responsive.spec.ts` cobre **640 px** de largura CSS, equivalente a uma
janela de 1280 px com zoom de 200%, além de 320, 390, 768, 1024 e 1440 px. Ele verifica que nenhum
elemento de `main` ultrapassa a viewport e que a página não rola na horizontal.

## Limitações

- Não foi testado em aparelho Android ou iOS real.
- Não há throttling de CPU ou rede; os valores tendem a ser melhores que os de campo.
- A medição é de uma execução local e não é um gate de CI; o teste de reflow a 640 px é o gate
  automatizado.
- Próximo passo: repetir com CPU 4× e rede 4G, com `prefers-reduced-motion: reduce`, para separar a
  animação de saída do custo de script.
