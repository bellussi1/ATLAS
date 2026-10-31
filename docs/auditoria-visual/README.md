# Auditoria visual — 31/10/2026

Capturas locais do build em 1440 × 900 e 390 × 844, com movimento reduzido, obtidas por `scripts/capture-visual-audit.mjs`. Registram o estado da página, sem avaliar leitor de tela ou a qualidade de animações em movimento normal.

- [Estudo desktop](estudo-desktop.png): a prática fica abaixo da apresentação do formato e tem grande área vazia à direita. Os controles de resposta e transferência precisam de hierarquia visual mais clara. Componentes: `pages/study-page.ts`.
- [Tempo mobile](tempo-mobile.png): a lista textual cresce bastante antes do contexto selecionado; a tabela comparativa exige rolagem horizontal e o recorte não indica claramente a continuação. Componentes: `shared/historical-visualizations.html` e `.scss`.
- [Home mobile](home-mobile.png): a rede lista muitos registros antes da mesa editorial, criando uma página longa e adiando outros caminhos de exploração. Componentes: `pages/home-page.html`, `shared/evidence-network.html` e `.scss`.
- [Verbete desktop](verbete-desktop.png): relações e backlinks repetem o mesmo registro em seções próximas, aumentando a extensão da leitura. Componentes: `features/entry/entry-page.ts`.

As imagens [home desktop](home-desktop.png), [estudo mobile](estudo-mobile.png), [tempo desktop](tempo-desktop.png) e [verbete mobile](verbete-mobile.png) complementam o registro. A revisão de motion e transições em preferência normal permanece para a etapa visual dedicada.

## Correções posteriores

A [home móvel](home-mobile-depois.png) limita a altura da lista da rede e informa que ela pode ser rolada; a lista completa continua acessível por teclado. Na [linha do tempo móvel](tempo-mobile-depois.png), o contexto selecionado aparece junto ao registro e o comparador indica rolagem horizontal e oferece foco à região rolável. O [verbete](verbete-desktop-depois.png) deixa de repetir em backlinks relações já mostradas, preservando os demais backlinks. A [prática de estudo](estudo-desktop-depois.png) destaca feedback e hierarquia dos controles. Testes automatizados verificam a transição de página em movimento normal e reduzido e a seleção de um registro da lista compacta pelo teclado. As demais capturas com sufixo `-depois` registram as páginas após as correções; não representam uma auditoria integral de acessibilidade.
