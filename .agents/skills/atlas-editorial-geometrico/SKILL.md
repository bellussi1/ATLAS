---
name: atlas-editorial-geometrico
description: Projetar e revisar a identidade, o design system e as interações do ATLAS, com três registros (leitura, mesa, cartaz), paleta de pigmentos brasileiros, selo perfurado, retícula e geometria informacional. Usar em telas, componentes, tokens, leitura e exploração do ATLAS; não aplicar esta identidade a outros projetos.
---

# ATLAS editorial geométrico · v2 (19/11/2026)

Direção artística do ATLAS, aprovada pelo responsável do projeto. O produto é um acervo educacional público de história, política, economia e sociedade. Toda interface abre uma descoberta compreensível e um próximo caminho.

A v2 funde a base aprovada (mesa de pesquisa, modernismo suíço, atlas editorial, museografia digital) com a gramática da gráfica popular brasileira: selo postal, carimbo, retícula de impressão, grão de papel e cor com procedência territorial. A versão anterior, com o histórico datado das rodadas de outubro e novembro, está em `docs/archive/2026-11/skill-editorial-geometrico-v1.md`.

## 1. Fontes de verdade

1. Tokens e componentes reais em `src/styles.scss` e `src/app/shared/ui` mandam no que existe hoje.
2. Esta skill define o alvo. Os tokens de pigmento (`--pig-*`) e os registros só passam a existir quando a migração os implementar; até lá, não referenciá-los no código.
3. `references/` traz os detalhes: [paleta e tokens](references/tokens.md), [o que as referências de 11/2026 acrescentaram](references/referencias-2026-11.md), [contrato de exploração](references/ideology-interaction.md) e [a mesa aprovada](references/mesa-aprovada.png).
4. Imagens de referência são inspiração, nunca ativos. Não copiar peças, lettering, ilustrações ou símbolos de terceiros. As peças da Feira Afro ficam em `references/feira-afro/` (fora do git); antes de desenhar selo, cor ou retícula, abrir as imagens e comparar o resultado renderizado com elas.

## 2. Três registros

Cada tela declara um registro. Família visual comum, intensidade diferente.

| Registro | Onde | Caráter | Proibido |
|---|---|---|---|
| **Leitura** | leituras, verbete, fontes, páginas institucionais | papel claro, texto estável, cor só em suportes e ações | fundo escuro, grão sob texto corrido, selo em todo parágrafo |
| **Mesa** | acervo, grafo, mapa, itinerários | neutra; a cor codifica famílias e seleção | cor decorativa que concorra com a codificação |
| **Cartaz** | home, aberturas de capítulo, header, footer, 404, perfis de pessoa | denso, chapado, pode usar faixas escuras de terra, grão e mosaico | texto longo, dado fingido, loop automático |

Um registro cartaz pode aparecer como faixa dentro de uma tela de leitura (abertura de capítulo), mas não o contrário. Não existe modo escuro global: o fundo escuro é superfície de cartaz.

## 3. Paleta de pigmentos

A cor tem procedência: cada família nomeia um pigmento ou material ligado à história brasileira. Os nomes ficam nos tokens; a interface não explica a paleta ao leitor (`docs/design/GUIA-DE-VOZ.md`).

| Família | Material | Papel |
|---|---|---|
| `cal` | papel, cal | fundo e texto sobre escuro |
| `tinta` | tinta de impressão | texto e linhas |
| `pau-brasil` | corante do pau-brasil | ação, foco, seleção; superfície de cartaz |
| `urucum` | pigmento do urucum | suporte quente |
| `ocre` | terra ocre | suporte; texto sobre escuro |
| `mata` | verde de mata (substitui o teal) | suporte; texto grande |
| `jenipapo` | tinta do jenipapo (absorve o índigo) | superfície forte, texto sobre claro |
| `rosa` | rosa | suporte |
| `terra` | terra roxa | fundo escuro do cartaz |

Valores, rampas e pares de contraste medidos estão em [tokens.md](references/tokens.md). Regras:

- `#B81D16` (`pau-brasil-700`) continua sendo o vermelho de texto, link e foco. `pau-brasil-500` é só superfície: com tinta dá 3,7:1 e sobre terra 3,3:1.
- `mata-500` aceita texto claro apenas grande (3,8:1); texto corrido em verde usa `mata-700`.
- Proporção indicativa: leitura ≈ 70% papel · 20% tinta · 8% suporte · 2% ação; cartaz ≈ 50% fundo · 35% blocos · 10% texto claro · 5% ação.
- Categoria nunca é comunicada só por cor: rótulo textual e motivo acompanham.
- Brasilidade vem da procedência e da gráfica, não de verde-amarelo, bandeira, fauna ou folclore. O foco é internacional e brasileiro: evitar vermelho e verde lado a lado como par dominante (lê-se como a bandeira de Portugal). O mosaico da casa (`atlas`) não tem verde; quando os dois aparecem juntos, separar por ocre, papel, rosa ou jenipapo.
- O verde de suporte é sempre o `mata-500` (#339A65); os verdes pastel e o teal antigo saíram.

## 4. Tipografia

Fontes locais existentes, sem dependência nova:

- **Zilla Slab** (400, 400 itálico, 600, 700): texto corrido e títulos de leitura. Slab de baixo contraste, parente da slab de cartaz das referências.
- **Archivo** variável (`wght` 100–900, `wdth` 62–125): display de cartaz (900, `wdth` 110–125), números grandes (datas, contagens reais) e rótulos curtos em versalete condensado (`wdth` 75, caixa alta, tracking +0,12em).
- Não há fonte mono real: `--font-mono` aponta para a Zilla. Metadados usam Archivo condensada, não uma mono simulada.

Regras: caixa normal em textos de interface; versalete condensado só em rótulos curtos e assinaturas. Alternar pesos na mesma frase é permitido apenas em títulos display, nunca no corpo, onde negrito seria confundido com termo navegável. Números grandes só para valores reais e datados. A escala atual (`--text-micro` a `--text-display`) continua.

## 5. Materiais

Cada material tem uma função; nenhum é textura genérica.

- **Selo perfurado** (`app-stamp`): moldura de objetos citáveis e destacáveis, como ficha, fonte, verbete ou cartão de leitura. Como nas referências (`references/feira-afro/02.webp` e `07.webp`, locais): papel chapado em cor saturada (tons 500), sem sombra por padrão, furos redondos com vão igual ao diâmetro, grão opcional. Não usar em containers de layout, formulários ou blocos de texto. A perfuração usa `mask`; foco e sombra ficam no elemento pai (`outline` e `filter: drop-shadow`), porque a máscara corta os dois.
- **Uso contido do selo:** o selo marca o que se destaca ou se cita (card de registro, porta de catálogo, card de leitura ou itinerário, parada). Não é moldura padrão: botões, filtros, campos, avisos, placas explicativas e portas do herói usam outros componentes. Texto corrido e cards com várias linhas ficam em papel claro dentro do selo, com a cor em faixa ou bloco (como a prancha `07.webp`: margem creme + bloco de cor); selo inteiro saturado só para rótulos curtos. A sombra de tinta é permitida.
- **Portas e atalhos:** amostra de pigmento à esquerda com o glifo e rótulo em papel claro, borda de tinta e sombra deslocada; sem perfuração.
- **Carimbo** (`app-seal`): estado editorial e de revisão ("Com fontes · revisão pendente", revisão de IA). Texto real, nunca só ícone; não sugere aprovação que não existe.
- **Retícula**: sombra e degradê de formas geométricas e duotone de retratos. Para fotos, só em licenças que permitem adaptação (nunca ND), aplicada em tempo de render, com "imagem com tratamento de cor" registrado na área de fontes; alt text inalterado; original acessível pela fonte.
- **Grão**: SVG estático pequeno, opacidade baixa, só em superfícies chapadas de cartaz; nunca sob texto corrido; desligado na impressão.
- **Fio**: linha contínua que liga peças relacionadas. É a figura de "relação" do ATLAS (base em `pages/home/poster-loom`). Só liga o que tem relação real ou destino real.
- **Sombra sólida deslocada**: tinta, três tamanhos (3, 5 e 8 px); sem sombras difusas.

## 6. Geometria, imagem e iconografia

- `AtlasGeometricMosaicComponent` e `AtlasEditorialMarkComponent` seguem como motivos: SVG original, determinístico por `seed`, `aria-hidden` quando o rótulo já dá o sentido. Podem ganhar retícula e grão no registro cartaz. Não codificam dados.
- Grade de selos: módulos retangulares deslocados, com sobreposição pequena no desktop; fluxo simples no mobile. Conteúdo e foco nunca ficam cobertos.
- Sem ilustração figurativa de assuntos, mascotes ou ícones de objetos: risco de caricatura em conteúdo político e de dado fingido. A expressividade fica na geometria, na tipografia e nos materiais.
- Não usar símbolos culturais com significado próprio (Adinkra, grafismos indígenas, emblemas religiosos) como ornamento. Datas de vida em formato neutro ("1938–2020"), sem cruz.
- Ícones de tipo (`kind-icon`) continuam geométricos, com rótulo.

## 7. Composição e mesa de pesquisa

Preservar a mesa: índice, ficha selecionada, trecho legível, contexto e continuidade. Não reproduzir a mesma mesa em todas as telas: artigo pede leitura estável, grafo pede relações e seleção, mapa pede tempo e espaço. Selecionar uma ficha atualiza título, resumo, trecho, prévia e destino juntos.

Rejeitados: dashboards de números, sequência de cards iguais, painéis minúsculos, rótulos numerados decorativos, símbolos genéricos e UI de outros projetos. Variar a composição por assunto e capítulo; compartilhar tipografia, paleta, navegação e motion. Leituras seguem `docs/design/PAGE_STANDARD.md`.

Container comum: `--grid-max` (90rem com padding) e `--grid-gutter` alinham header, breadcrumbs, páginas e footer; o texto usa as medidas de leitura dentro dele.

## 8. Interação e motion

Verbos concretos: selecionar ficha, aproximar leitura, investigar fonte, seguir relação, continuar no texto. Reutilizar `KnowledgeTextComponent` e `KnowledgeContextComponent` (CDK Dialog com foco, Escape e retorno) em vez de criar mecanismos equivalentes. Termo interativo é botão ou link com pista persistente; ênfase estática usa `strong`/`em`. O contrato completo está em [ideology-interaction.md](references/ideology-interaction.md).

Motion: 120/240/480 ms, `cubic-bezier(.2,.7,.2,1)`, seleção em 180 ms. `appReveal` revela blocos uma vez; View Transitions na troca de rota. Teclado e movimento reduzido são imediatos. Não mover texto em leitura, não reiniciar a entrada em busca ou âncora, sem loop automático. Hover não muda o fluxo. Recomposições de cartaz são acionadas pela pessoa. Estabilidade é critério de aceite: reservar mídia, estados e geometria de painel.

## 9. Marca, header e footer

A marca é a assinatura tipográfica ATLAS (letras pesadas e próximas, ponto vermelho), em `public/brand`: `atlas-logo.svg`, `atlas-logo-inverse.svg` (fundo escuro), `atlas-logo-mono.svg`, `atlas-logo-white.svg`, `atlas-symbol.svg` e favicon. Não recriar em CSS, não deformar, não animar. O ponto usa o vermelho de ação.

Header e footer entram no registro cartaz: podem usar faixa escura de terra, grão, selos e fio, mantendo destinos, ordem de foco, link de pular conteúdo e a altura publicada em `--header-offset`.

## 10. Nunca

- Copiar peças, lettering, ilustrações ou paletas exatas de referências de terceiros.
- Afirmar dado, relação, data, licença ou revisão humana inexistentes; números grandes sem fonte.
- Comunicar categoria só por cor; usar `pau-brasil-500` ou `mata-500` para texto corrido.
- Fundo escuro em registro de leitura; grão sob texto.
- Ilustração figurativa ou símbolo cultural como ornamento.
- Declarar conformidade WCAG integral sem auditoria.

## 11. Checklist de aceite de UI

1. Registro declarado e respeitado.
2. Só tokens semânticos no componente (sem hex, sombra, raio ou z-index literais).
3. Pares de contraste cobertos por `ui-contrast.spec.ts`.
4. Foco visível de 3 px não cortado por máscara; alvos de ~44 px; operação por teclado e toque.
5. Reduced motion imediato; nenhuma mudança de layout após input.
6. Sem estouro em 375, 768 e 1366 px; reflow em 320 px.
7. Licença e tratamento de imagem registrados na área de fontes.
8. Composição comparada com esta skill e com a mesa aprovada; captura da interface quando o visual mudou.
9. `lint`, `typecheck`, `test`, `build` e E2E pertinentes executados e relatados.
