# Auditoria UX/UI, usabilidade e direção artística do ATLAS

- **Data:** 2026-11-02 · **Baseline:** `f99d01a` (branch `feat/atlas-carrosseis-e-exploracao`, após `79f4dbc` em master; 52 arquivos, +1711/−1391).
- **Escopo:** `src/`, `src/content`, documentação e captura visual em `ng serve` (porta 4303).
- **Natureza:** diagnóstico somente leitura. Este relatório era o único arquivo alterado.
- **Marcações:** [medido] (navegador) · [observado] (captura) · [código] (`arquivo:linha`) · [hipótese] (não verificado).
- **Status atualizado:** os status de implementação (seção 10 da versão original) estão na linha de cada achado.

---

## 1. Método e limites

- **Análise por código:** seis subagentes em paralelo (navegação, UX/IA, responsividade, motion, direção artística, acessibilidade/técnica).
- **Captura visual:** um subagente com navegador integrado, 23 capturas em 390, 768, 1024×768 e 1440 px.
- **Verificações do orquestrador em `f99d01a`:** `npm run typecheck` (exit 0); `npm test` (36 arquivos, 170 testes, exit 0); `npm run lint` (exit 0; inclui 6/6 testes de limites de arquitetura, Biome e Prettier).
- **Greps de confirmação:** divergência de tokens doc/CSS; ausência de `@media print`; contraste lendo só `src/styles.scss`; `--measure-*` sem uso; `scroll-behavior: smooth` em `src/styles.scss:144`; `scrollPositionRestoration` em `src/app/app.config.ts:22`; reduced-motion do carrossel só via `matchMedia` (`card-carousel.component.ts:236-238`).
- **Limites:** aba oculta durante a captura, então transições, rolagem suave, revelações e `requestAnimationFrame` não foram validados. Sem leitor de tela, toque físico, zoom 200/400%, build de produção ou INP. Contrastes calculados pelos tokens.
- **Ajustes de severidade:** MOT-01 e ART-05 rebaixados de alta para média (efeito não validado; `/rede` redireciona). UX-05 para média. ART-02 mantido em alta (decisão de direção de arte, ver AUD-08).

---

## 2. Resumo executivo

### 2.1 Diagnóstico

Base técnica e editorial forte: arquitetura por feature com limites verificados por lint; prerender e SSR; conteúdo com schemas Zod; skip link; diálogos com foco restaurado; carrossel operável por teclado; reduced-motion em várias camadas; testes passando e axe nas páginas principais. Honestidade editorial clara (marcações de certeza, nota "data não implica causalidade", aviso de vínculos importados).

A identidade é **parcial**. Há personalidade real na marca, no título condensado, nos números geométricos, nas "portas" do cabeçalho e nos cartazes de mosaico. Ela se dilui em três pontos: componentes viraram caixas com contorno e sombra dura (mais neobrutalismo que modernismo suíço); o vermelho acumula cinco funções; e Conhecimento e Rede lembram painel mestre-detalhe. A home não mostra o acervo nem figura, mapa ou documento.

Na usabilidade, a leitura das ideologias é rica mas sobrecarregada: um capítulo pode ter três ou quatro conjuntos de controles equivalentes; o "+" tem quatro significados; no mobile, o índice sticky ocupa 124–160 px e cobre o destino das âncoras, e o grafo de polêmicas perde as relações.

Falha transversal mais grave: **não há gestão de foco nem anúncio na troca de rota** (AUD-01).

### 2.2 Qualidades a preservar

- **Arquitetura:** `IdeologyPageComponent` e `IdeologyReadingComponent` atendem às duas tradições; limites de feature verificados por `npm run lint:architecture`.
- **Carrossel único:** setas de 2,75 rem, arraste, Home/End/setas, reduced-motion (`card-carousel.component.ts`). Aplica a preferência de scroll horizontal como carrossel.
- **Diálogo de contexto:** foco restaurado, `aria-expanded`, `aria-controls`, `aria-haspopup` (`knowledge-context.directive.ts`).
- **Honestidade editorial:** marcações de certeza, legenda de direção das setas, nota de causalidade, aviso de vínculos importados.
- **Roteiro de leitura:** cartões expansíveis, uma obra aberta por vez, contagem com `aria-live` (`reading-path.component.html`).
- **Adaptações de contexto:** lista no lugar do cronograma no mobile (`historical-visualizations.component.scss:302-312`); texto no lugar do atlas abaixo de 672 px; seletor nativo de capítulos no celular.
- **Base de acessibilidade:** skip link, `lang="pt-BR"`, foco de 3 px, `prefers-reduced-motion`, redirecionamento de rotas aposentadas.
- **Movimento progressivo sem ocultar no SSR:** `reveal.directive.ts:23-26`; view transitions desligadas para teclado e reduced-motion (`app.config.ts:28-34`).
- **Fontes locais** com licenças OFL em `public/fonts/`.

### 2.3 Os 10 problemas de maior impacto

| # | ID | Problema | Por que pesa | Esforço | Status |
|---|---|---|---|---|---|
| 1 | AUD-01 | Sem foco nem anúncio na troca de rota | Todas as páginas; teclado e leitor de tela | Pequeno | feito |
| 2 | AUD-02 | Índice sticky cobre âncoras; até 160 px no mobile | [medido] 390 px; navegação por seção | Pequeno a médio | feito |
| 3 | AUD-03 | Grafo de polêmicas quebrado no mobile | Bloco central do capítulo perde relações | Médio | feito |
| 4 | AUD-04 | Grade de 12 colunas comprime cartões entre 761 e 1000 px | Tablet, fora de qualquer teste | Médio | feito |
| 5 | AUD-05 | Três a quatro conjuntos de controles equivalentes por capítulo | Carga cognitiva alta | Médio | parcial |
| 6 | AUD-06 | "+" e vocabulário de destino com significados diferentes | Ação imprevisível | Pequeno a médio | feito |
| 7 | AUD-07 | Vermelho com cinco funções | Sinal de ação diluído | Médio | parcial |
| 8 | AUD-08 | Contorno e sombra dura como linguagem de componente | Define a leitura visual (decisão) | Médio | parcial |
| 9 | AUD-09 | Documento de design, tokens e logos divergem | Fonte de verdade quebrada | Pequeno | decidido |
| 10 | AUD-10 | Home sem acervo e com jargão | Descoberta do leitor novo | Pequeno a médio | parcial |

### 2.4 Oportunidades artísticas e interativas

1. **Planos e registro suíços:** planos chapados, filetes e grade; contorno só no estado ativo (AUD-08).
2. **Placa de atlas:** figura numerada, legenda em coluna, crédito e escala, para imagens e documentos (AUD-22).
3. **Cartazes compostos à mão por assunto** (Marxismo, Liberalismo, Atlas), com recomposição aleatória como recurso secundário (AUD-11).
4. **Rede como mapa relacional:** nós posicionados e legenda, com lista equivalente operável por teclado (AUD-36).
5. **Serif de display nas perguntas dos capítulos**, contrastando com o condensado. Preferência de design: avaliar peso e carregamento.
6. **Home com prova do acervo:** retrato licenciado com legenda acima da dobra e faixa "Explorar por tipo" (AUD-10).

### 2.5 Melhorias estruturais

- **Camada de rota:** foco, anúncio, página não encontrada e metadados numa configuração só (AUD-01, AUD-13, AUD-14); elimina os ramos por path no shell.
- **Tokens:** cor com função, escala tipográfica de 6–7 degraus, 3–4 breakpoints (ou container queries), medida de leitura e movimento unificados (AUD-07, AUD-09, AUD-24, AUD-25, AUD-47).
- **Três tipos de controle:** ação, filtro/seleção e navegação, com estados definidos em `ui-primitives.scss` (AUD-06, AUD-12).
- **Template de capítulo com regras de densidade:** um conjunto de seleção por capítulo; estado de revisão declarado uma vez por página (AUD-05, AUD-20).
- **Contrato de mídia:** `alt` descritivo, legenda, crédito e dimensões no schema Zod (AUD-22, AUD-53).
- **Testes por rota:** axe em todas as rotas públicas, teste de foco na troca, varredura em 390/768/1024/1440 (AUD-35).
- **Fontes em WOFF2 com subset** e política de `font-display` documentada (AUD-34).

### 2.6 As ideologias: a estrutura facilita novas tradições?

**Facilita:** capítulos e blocos vêm de `IdeologyPageComponent` e `IdeologyBlockComponent`, com configuração própria do atlas; registro de snapshots explícito (`published-ideologies.ts`); Marxismo e Liberalismo simétricos em rota, título e estrutura.

**Dificulta:**
- Ramos fixos por path para Marxismo e Liberalismo no shell (`app-shell.component.ts:73-79`); a descrição da rota de Liberalismo é ignorada (AUD-14). Cada nova tradição exigiria editar o shell.
- `value-debate` tem texto e link no template (AUD-50); `study-exercise` aponta para `/marxismo#fontes` (AUD-51). Conteúdo específico está fora dos dados, contra `ARCHITECTURE.md` ("dados específicos em data").
- Controles de seleção fixos por bloco; uma nova tradição herda a duplicação (AUD-05).

**Recomendação:** resolver AUD-14, AUD-50, AUD-51 e AUD-05 antes de criar a próxima tradição (Social-democracia ou Anarquismo).

---

## 3. Achados de severidade alta

Formato: **Onde** (rota/componente) · **Evidência** · **Impacto** · **Recomendação** (alternativa entre parênteses) · **Esforço** · **Aceite**.

### AUD-01 · Foco e anúncio na troca de rota — feito (Fase 1)
- **Agentes:** NAV-01, A11Y-01, A11Y-02 (e MOT-03).
- **Onde:** todas. `app-shell.component.ts:36-45,63-65`; `app.config.ts:22-35`; `site-header.component.ts:54-58`.
- **Tipo/status original:** acessibilidade. [código] foco só movido pelo skip link e pelo retry; [hipótese] efeito em leitor de tela (validar com NVDA/VoiceOver).
- **Evidência:** nenhum `NavigationEnd` move o foco. Ao ativar um link do menu mobile, `close(true)` devolve o foco ao botão "Menu" (`site-header.component.html:34,47,60`; `site-header.component.ts:54-58`).
- **Impacto:** título muda sem anúncio; teclado e leitor de tela precisam percorrer o cabeçalho de novo a cada navegação; no celular, o foco volta ao botão de menu.
- **Recomendação:** no `NavigationEnd`, quando o path mudar, focar `#conteudo` ou o `h1` com `preventScroll`. Nos links do menu, `close(false)`; `close(true)` só para Escape. Opcional: região `role="status"` com o título. (Alternativa: focar só em navegação por teclado, `data-input="keyboard"`.)
- **Esforço:** pequeno.
- **Aceite:** E2E de `/` para `/marxismo`: `document.activeElement` é `h1` ou `#conteudo`; Enter num link do menu mobile não deixa o foco no toggle; mudar só `?q=` não move o foco.

### AUD-02 · Índice sticky cobre âncoras e ocupa altura excessiva — feito
- **Agentes:** RSP-03, VIS-01, VIS-02. **Onde:** `/marxismo`, `/liberalismo`; `reading-index.component.scss:3-4,239-300`; `ideology-page.component.scss:247`; `ideology-atlas-interaction.scss:135`.
- **Status original:** [medido] barra de 124–150 px em 390 px, com o título "05 Épocas" sob a barra; [medido] 778 px de altura em 1024×768, com "Reduzir movimento" cortado; [código] `scroll-margin-top: 9rem` (144 px).
- **Impacto:** ao pular para um capítulo, o título fica encoberto; em telas baixas, o último controle é inalcançável; no celular, 15–18% da área útil vai para uma barra permanente.
- **Recomendação:** `scroll-margin-top` igual à altura real da barra (`--reading-bar-h`, medida). No mobile, uma linha (select e progresso fino). "Ponto anterior" e "Reduzir movimento" num `details` recolhido. `max-height: calc(100dvh - 2rem)` com `overflow: auto`. (Alternativa: a barra some ao descer e volta ao subir.)
- **Esforço:** pequeno a médio.
- **Aceite:** em 390 px, `h2.getBoundingClientRect().top >= barra.bottom + 8` para cada item; barra com até 6 rem; em 1024×768 e 1366×768 todos os controles alcançáveis.

### AUD-03 · Grafo de polêmicas no mobile: linhas somem e nós ficam soltos — feito
- **Agentes:** RSP-01. **Onde:** `/marxismo`, `/liberalismo`, bloco `graph`. `ideology-block.component.scss:370-372`; `ideology-block.component.html:227-244`; `ideology-exploration.scss:125-151`; `ideology-relations.scss:100-105`.
- **Status original:** [código] confirmado; [hipótese] aparência exata.
- **Evidência:** até 650 px o SVG é oculto (`display: none`), mas os botões `.genealogy-node` continuam posicionados em % sobre canvas `aspect-ratio 900/380`, sem setas. Rótulos das relações somem em outro breakpoint (42 rem).
- **Impacto:** em 351 px de coluna, cada nó tem ~98×72 px sobre canvas de ~300 px, com risco de sobreposição. A relação ("A critica B") não aparece e "Investigar conexões +" fica com ~11 px.
- **Recomendação:** no mobile, ocultar o canvas e mostrar a lista de relações, aberta por padrão. A relação escrita entre os nós. (Alternativa: nós empilhados verticalmente, com a relação entre eles.)
- **Esforço:** médio.
- **Aceite:** em 390 px não há `.genealogy-node` absoluto; relações acessíveis sem abrir `details`; sem overflow horizontal; um só breakpoint governa a troca.

### AUD-04 · Grade de 12 colunas comprime cartões entre 761 e 1000 px — feito
- **Agentes:** RSP-02, RSP-04. **Onde:** `.portraits`, `.documents`, `.principles` (`ideology-block.component.scss:93-125`); coluna do índice (`ideology-reading.component.scss:25,36-39`).
- **Status original:** [código] aritmética: em 768 px a área é ~467 px e um span de 3 colunas ~102 px; [hipótese] resultado visual.
- **Evidência:** colapsos só em `max-width: 650px` (`ideology-block.component.scss:336`). Índice muda em 760 px (`reading-index.component.scss:239`), layout em 750 px (`ideology-reading.component.scss:48`). Em 751–760 px, o seletor mobile aparece numa coluna de desktop.
- **Impacto:** no tablet, títulos com ~21 px e `overflow-wrap: anywhere` quebra palavras; em 1024 px, span de 3 colunas com ~142 px.
- **Recomendação:** container queries em `.chapter-sequence` (`container-type: inline-size`, `@container (max-width: 40rem)`). Um breakpoint de leitura (48 rem) para índice e layout. (Alternativa: subir o colapso para 1000 px.)
- **Esforço:** médio.
- **Aceite:** em 768 e 1024 px nenhum cartão com menos de 11 rem; nenhum título quebra no meio da palavra; 751 e 760 px com padrão único de índice.

### AUD-05 · Controles de seleção repetidos no mesmo capítulo — parcial
- **Agentes:** UX-01. **Onde:** `/marxismo`, `/liberalismo`; `ideology-atlas.component.html:61-79,108-117,230-251,256-293,326-393`; `ideology-block.component.html:265-276,301-336`.
- **Evidência:** no atlas há grafo, carrossel de fichas, "Conexões desta ficha", lista textual aberta por padrão no modo contínuo, filtro, seletor de período, carrossel de linha do tempo e stepper. No bloco `graph`, há grafo, legenda, filtro, N botões "A → B" e um carrossel que repete os mesmos botões, cada cartão com `details` de evidência.
- **Impacto:** o iniciante não sabe por onde começar; a mesma relação é escolhida de três modos; o avançado ganha pouco com a duplicação.
- **Recomendação:** grafo como entrada e ficha como destino; lista textual recolhida mas acessível por teclado e leitor de tela; remover os botões "A → B" quando o carrossel de relações existir (ou o inverso). (Alternativa: se a lista for o equivalente acessível, mantê-la e ocultar visualmente o resto.)
- **Esforço:** médio.
- **Aceite:** no máximo um conjunto de controles de seleção visível por padrão por capítulo; lista textual operável por teclado; E2E de seleção por relação continua passando.
- **Status:** lista textual do atlas fechada em telas largas e aberta abaixo de 42 rem; índice, grafo e linha do tempo mantêm controles próprios.

### AUD-06 · "+" e vocabulário de destino com significados diferentes — feito
- **Agentes:** UX-02, UX-07 (em parte). **Onde:** transversal; `ideology-block.component.html:44,242,322,370`; `ideology-atlas.component.html:73`; `knowledge-context.component.html:47,68`; `record.component.html:16`.
- **Evidência:** "Abrir contexto +" abre diálogo; "Selecionar contexto +" só marca ficha; "Destacar no grafo +" muda seleção local; "Investigar conexões +" e "Explorar fundamento e fontes +" completam o conjunto. Destino aparece como "contexto", "ficha", "registro", "verbete" e "página permanente". No diálogo, "abre aqui →" substitui o "+".
- **Impacto:** o leitor não sabe se a ação abre painel, muda seleção ou sai da página.
- **Recomendação:** dois sinais fixos: "+ Abrir ficha" para painel sobre a leitura; seleção sem "+" (estado pressionado). Um substantivo para o destino: "ficha", em telas e diálogo.
- **Esforço:** pequeno a médio.
- **Aceite:** um grep nos templates mostra no máximo dois padrões de rótulo de ação; "ficha" é o único termo para painel e página.
- **Status:** "Abrir ficha +" para painel; "Selecionar ficha", "Destacar no grafo" e "Ver conexões" sem "+"; "Abrir ficha de … →" para a página.

### AUD-07 · Vermelho com cinco funções — parcial
- **Agentes:** ART-03. **Onde:** `ideology-page.component.scss:13-16` (link); `home-page.component.scss:243` (CTA); `ideology-page.component.scss:143` (número de capítulo); `home-page.component.scss:156-159`; `explorer.component.scss:160-162` (hover); `styles.scss:188-191` (seleção e marca); `ui-primitives.scss:73-76` (hover secundário usa `--color-danger`).
- **Evidência:** `--color-danger` (`#82251f`) e `--color-accent-hover` (`#811f1a`) quase iguais; cinco pastéis em `styles.scss:73-84`; washes por tonalidade (`styles.scss:76-80`, `home-page.component.scss:3-6`); até sete cores em `mosaic-tiles.ts:39-48`.
- **Impacto:** o vermelho deixa de significar "clique aqui" ou "atual"; ação e erro ficam indistinguíveis; "preto, vermelho e branco quente" vira arco-íris.
- **Recomendação:** vermelho só para ação primária, estado atual e marca; taxonomias por forma, contorno e rótulo; no máximo dois pastéis como apoio; tom de erro separado do acento.
- **Esforço:** médio.
- **Aceite:** `--color-accent` só em elementos interativos, atuais ou de marca; hover secundário não usa token de erro.
- **Status:** hover secundário com tinta, não com token de erro. Vermelho ainda decorativo em sombras e bordas de estado; decisão de produto registrada em 11.

### AUD-08 · Contorno e sombra dura como linguagem de componente — parcial
- **Agentes:** ART-02. **Onde:** `home-page.component.scss:184-185` (borda 3 px e sombra `.75rem .75rem 0`); `ideology-page.component.scss:71-73`; `ui-primitives.scss:215-219`; `explorer.component.scss:32,36`; `ideology-block.component.scss:48`.
- **Tipo:** decisão de design. Leitura estética é julgamento do agente.
- **Impacto:** vira assinatura neobrutalista e afasta o ATLAS da referência 01 (planos chapados, sem contorno).
- **Recomendação:** sombra e contorno só para estado ativo ou selecionado; restante em planos e filetes na grade. (Alternativa: manter o contorno só na ficha de leitura.)
- **Esforço:** médio.
- **Aceite:** no máximo um componente por página com sombra dura; revisão contra a referência 01 com a decisão registrada por quem responde pela identidade.
- **Status:** sombras de repouso removidas de cinco componentes; sombras ativas, de hover e de diálogo ficam.

### AUD-09 · Documento de design, tokens, logos e fontes divergem — decidido
- **Agentes:** ART-01, ART-12, TEC-02 (em parte). **Onde:** `docs/design/SISTEMA-DE-DESIGN.md:21-40`; `src/styles.scss:49-64`; `public/brand/atlas-logo.svg`; `docs/brand/atlas-identity.svg`.
- **Evidência:** documento cita `#FBFAF7`, `#B4231D`, `#1C1C1A` e IBM Plex Sans; CSS usa `#fbf8f1` e Archivo; logos usam `#1c1c1a` e `#b4231d`. Wordmark em Plex Bold, interface em Archivo condensado.
- **Impacto:** marca não bate com o site; não há fonte de verdade.
- **Recomendação:** escolher valores e regenerar SVG e PNG; reescrever a tabela com razões de contraste calculadas; decidir se o wordmark é redesenhado sobre Archivo.
- **Esforço:** pequeno.
- **Aceite:** teste compara fills dos SVGs aos tokens; documento lista só as famílias carregadas.
- **Status:** documento alinhado ao CSS; logos mantidos por decisão de marca.

---

## 4. Achados de severidade média

### AUD-10 · Home sem acervo, com jargão e seção metodológica discreta — parcial
- **Agentes:** UX-04, ART-07, NAV-10. **Onde:** `/` (`home-page.component.html:43-106`; `:23-25`, `:105`, `:47`; `home-page.component.scss:250-254`).
- **Evidência:** após hero e busca, só duas leituras. "Recompor o cartaz", "Na mesa:" e "Escolha uma capa para aproximar a leitura" usam jargão. "Busca e ferramentas" só tem busca. "Como ler" tem título de 0,8 rem em mono e quatro colunas iguais sem prova visual.
- **Impacto:** o leitor novo não sabe o que o acervo contém; pessoas, países e regimes ficam só no rodapé.
- **Recomendação:** faixa "Explorar por tipo" com 4–6 catálogos e contagens, reaproveitando `catalogues`; trocar "mesa" e "cartaz" por "Escolha uma leitura"; "Como ler" no mesmo display das outras bandas; uma imagem licenciada e legendada acima da dobra; links para catálogos e verbetes nas leituras (NAV-10).
- **Esforço:** pequeno a médio.
- **Aceite:** home dá acesso a catálogos além de Marxismo e Liberalismo; nenhum rótulo visível com "mesa" ou "cartaz"; "Como ler" com pelo menos 2 rem.
- **Status:** faixa "Explorar por tipo" com seis catálogos, sem contagens (exigiriam carregar o grafo na home).

### AUD-11 · Mosaicos aleatórios em vez de composições com autoria — feito
- **Agentes:** ART-08. **Onde:** home, cabeçalho, rodapé e explorer. `mosaic-tiles.ts:4-16,54-67` (12 motivos com cores sorteadas); "Recompor o cartaz" randomiza (`home.html:23`).
- **Impacto:** composições repetidas perdem peso; a referência 01 usa poucas formas em escala monumental.
- **Recomendação:** 2–3 cartazes compostos por assunto (Marxismo, Liberalismo, Atlas) em grade fixa; recomposição como recurso secundário, com no máximo um mosaico aleatório por página.
- **Esforço:** médio.
- **Aceite:** cada rota principal tem composição determinística e nomeada.
- **Status:** composições fixas por rota; recomposição como ação secundária do rodapé e da home.

### AUD-12 · Botões e estados sem sistema — parcial
- **Agentes:** ART-10. **Onde:** transversal. Botão primário vermelho com raio 0,125 rem (`ui-primitives.scss:35-53`); botão vermelho quadrado na home (`home-page.component.scss:98-106,236-248`); primário preto que vira vermelho no hover (`explorer.component.scss:154-162`); `gallery-toggle` contornado (`ideology-block.component.scss:34-46`); seleção em índigo (`ideology-block.component.scss:299-302`); `reading-preview-trigger` mono e contornado (`styles.scss:213-221`); `:hover` sem `@media (hover: hover)` em `explorer.component.scss:97,160` e `ideology-block.component.scss:43`.
- **Impacto:** o usuário não aprende o que é ação, filtro ou seleção.
- **Recomendação:** três tipos. Ação: vermelho cheio. Filtro e seleção: tinta invertida. Navegação: link sublinhado. Estados definidos uma vez em `ui-primitives.scss`.
- **Esforço:** médio.
- **Aceite:** grep de `button {` fora de `ui-primitives` retorna só exceções documentadas; todo `:hover` sob `(hover: hover)`.
- **Status:** `:hover` sob `(hover: hover)` em dez regras; taxonomia de botões ainda não consolidada.

### AUD-13 · Rota inexistente e rotas aposentadas: silêncio e documentação desatualizada — feito
- **Agentes:** NAV-03, A11Y-03, VIS-05, NAV-11. **Onde:** `**` (`app.routes.ts:15`); `/rede` e `/comparar` (`exploration.routes.ts:12-14`); `/verbete/<slug>` inexistente (`route-resolvers.ts:38-46`). [medido] redirecionamento; [hipótese] comportamento na hospedagem.
- **Evidência:** `/rota-que-nao-existe` vai para a home sem aviso (política documentada em `AGENTS.md`). `/verbete/x` mostra "não encontrado" com status 200. `AGENTS.md`, `README.md:41-42` e `docs/product/ESCOPO-ATUAL.md` listavam `/rede` e `/comparar` como ativas.
- **Impacto:** link quebrado vira soft 404 que esconde o erro; URL pedida se perde; leitor de tela não é informado.
- **Recomendação:** página "Página não encontrada" com `h1`, `noindex`, busca e links para as portas, reutilizada por `/verbete` e `/explorar` inexistentes. Manter redirecionamentos de `/rede` e `/comparar` e atualizar a documentação. (Alternativa: redirecionamento com aviso transitório "Endereço não encontrado".)
- **Esforço:** pequeno a médio.
- **Aceite:** `/xyz` mostra `h1` "Página não encontrada" e título próprio, sem trocar para `/`; `/verbete/inexistente` usa o mesmo componente; documentação bate com as rotas.
- **Decisão de produto:** escolher entre redirecionamento com aviso e página própria.
- **Status:** página própria implementada na Fase 1.

### AUD-14 · Metadados por rota: ramos fixos no shell, canonical relativo, sem Open Graph — feito
- **Agentes:** NAV-02, NAV-12, TEC-04. **Onde:** transversal. `app-shell.component.ts:73-90` (ramos fixos); descrição de Liberalismo ignorada (`ideologies.routes.ts:30-31`); `canonical.href = path` relativo; faltam `og:url`, `og:type`, `og:image`.
- **Impacto:** próxima tradição exige editar o shell; SEO e compartilhamento divergem da rota. Impacto em SEO é nulo enquanto o site for `noindex` (`index.html:20`).
- **Recomendação:** remover ramos por path e usar `data.metaDescription` com fallback; definir origem de produção em configuração, ou não emitir canonical enquanto `noindex`.
- **Esforço:** pequeno.
- **Aceite:** teste unitário: `meta[name=description]` de `/liberalismo` igual a `data.metaDescription`, sem condicional por path.

### AUD-15 · Rodapé repete destinos e tem controle decorativo falado — feito
- **Agentes:** NAV-04, UX-11. **Onde:** `site-footer.component.html:7,10-34,37-51,74`.
- **Evidência:** convite, colagem "Continue explorando" e "Mapa do ATLAS" levam aos mesmos destinos; a home aparece duas vezes; "Composição N de 3" com `role="status"` é decorativo.
- **Recomendação:** manter o mapa como única navegação do rodapé; colagem vira arte com `aria-hidden` ou CTA único; remover o status falado.
- **Esforço:** pequeno.
- **Aceite:** no máximo um `nav` no rodapé, sem destinos repetidos e sem `role="status"` decorativo.
- **Status:** colagem decorativa fora da ordem de tabulação; mapa é a única navegação.

### AUD-16 · Explorer: duas navegações de catálogo, filtros com modos mistos, cinco camadas antes do primeiro resultado — parcial
- **Agentes:** NAV-05, UX-08, NAV-09. **Onde:** `/conhecimento` e catálogos (`explorer.component.html:14-32,44-112,128-140,186-214`; `knowledge-explorer.ts:19-47`).
- **Evidência:** "Catálogos do acervo" (quatro grupos) e "Categorias de registro" (por tipo) se sobrepõem; pessoas, obras e ideologias são recortes do índice de entidades; o select de situação aplica na mudança, a busca só no envio, o tipo por link; "Situação editorial" é jargão; o título de `fontes` não é link; `porPagina` rola ao topo por falta de `fragment="resultados"`. [observado] a coluna "Acervo" tem um único item; primeira dobra em 1280×800 a verificar.
- **Impacto:** mesmo domínio em dois eixos; a `nav` interna funciona como segunda barra.
- **Recomendação:** um eixo visível por tipo; catálogos com perfil próprio (países, regimes, fontes) permanecem; pessoas e obras redirecionam para `/entidades?tipo=`; todos os filtros com mesmo comportamento; "Estado da revisão" no lugar de "Situação editorial"; `porPagina` no rodapé da lista, com `fragment="resultados"`.
- **Esforço:** médio.
- **Aceite:** cada tipo alcançável por um eixo visível; número de landmarks `nav` cai; em 1280×800 o primeiro resultado na primeira dobra.
- **Status:** filtro de categorias virou grupo, não navegação; contagem de página vai ao topo; "Estado da revisão". Os dois eixos (catálogo e categoria) permanecem por decisão.

### AUD-17 · Contexto de origem se perde entre verbetes — feito
- **Agentes:** NAV-06. **Onde:** `/verbete/:slug`. `record.component.html:54` monta links de conexão sem `queryParams`; "Voltar aos resultados" (`record.component.html:4`) some ao seguir uma conexão; `explorer.component.html:157` passa `origem` só na entrada.
- **Impacto:** só o Voltar do navegador restaura o caminho.
- **Recomendação:** `queryParamsHandling: 'preserve'` ou `queryParams: { origem }` nos links de conexão.
- **Esforço:** pequeno.
- **Aceite:** de `/entidades?q=x`, abrir A e seguir conexão para B; B mostra "Voltar aos resultados" apontando para `/entidades?q=x`.
- **Status:** conexões mantêm `origem`; teste em `knowledge-explorer.spec.ts`.

### AUD-18 · Diálogo de contexto com três controles de retorno e link permanente com `href` simples — feito
- **Agentes:** UX-06. **Onde:** `appKnowledgeContext` (`knowledge-context.component.html:8-29,47,62-103`).
- **Evidência:** "Voltar à leitura ×", trilha clicável e "← Contexto anterior" competem; página permanente usa `[href]` (possível recarga completa, [hipótese]); cartão de conexão com "abre aqui →".
- **Impacto:** três retrocessos concorrentes.
- **Recomendação:** trilha como única navegação interna; botão "Fechar" (× e texto); `routerLink` na página permanente.
- **Esforço:** pequeno.
- **Aceite:** um controle de retorno interno e um "Fechar"; abrir a página permanente não recarrega o documento.
- **Status:** diálogo com "Fechar" único (Fase 1).

### AUD-19 · Página de registro: navegação circular e dados técnicos à vista — parcial
- **Agentes:** UX-07, NAV-07. **Onde:** `/verbete/:slug`, `/explorar/...`.
- **Evidência:** "Link permanente" aponta para a própria página (`record.component.html:16`); "Busca universal" e "Catálogo de entidades" são termos internos (`:6-7`); bloco `@if` vazio (`:8`); Id e "Revisão do registro" na ficha lateral (`:103-107`); breadcrumbs "Início > <título>" sem catálogo pai (`exploration.routes.ts:31-35`; `breadcrumbs.component.ts:29-53`); "← Página inicial" além do breadcrumb em `ideology-page.component.html:10`.
- **Impacto:** leigo vê dados de curadoria; migalhas não mostram o caminho.
- **Recomendação:** "Copiar link" no lugar do link para a própria página; "Buscar no acervo"; Id e revisão em `details` "Dados do registro"; remover bloco vazio; breadcrumb com catálogo pai ("Início > Pessoas > Adam Smith"); remover back-link duplicado da ideologia.
- **Esforço:** pequeno.
- **Aceite:** nenhum link do registro aponta para si mesmo; `/verbete/x` mostra "Início > <catálogo> > <título>".
- **Status:** breadcrumb com catálogo pai; "Copiar link"; dados técnicos em disclosure. Migalha para verbete desconhecido não aparece.

### AUD-20 · "Revisão pendente" repetida em quase todo componente — parcial
- **Agentes:** UX-05. **Onde:** `ideology-page.component.html:53`; `ideology-block.component.html:133,285`; `ideology-atlas.component.html:9,182`; `value-debate.component.html:10,136`; `site-footer.component.html:80`.
- **Impacto:** ruído; quando algum conteúdo estiver revisado, a diferença não aparece.
- **Recomendação:** declarar o estado uma vez no topo de cada leitura; marcar nos componentes só a exceção. Não remover a honestidade editorial, só concentrá-la (`AGENTS.md` exige diferenciar fato, interpretação e hipótese).
- **Esforço:** pequeno a médio.
- **Aceite:** estado global uma vez por página; rótulos por item só quando diferem.
- **Status:** repetição removida em relações e debate; rótulos por item só quando diferem.

### AUD-21 · Termos em linha: prévia some em telas estreitas e rótulo substitui o texto visível — parcial
- **Agentes:** UX-03, RSP-11. **Onde:** `knowledge-text` (texto corrido). `.term-preview` vai a `display: none` até 650 px (`knowledge-text.component.scss:110-114`); no toque, o clique abre o diálogo sem aviso (`:84-89`); `aria-label` "texto: abrir contexto de Conceito" substitui o texto visível (`knowledge-text.component.html:8`), violando WCAG 2.5.3; entre 651 e 1024 px com toque, prévia e diálogo podem abrir juntos. [hipótese] comportamento de toque.
- **Impacto:** leitor de celular não sabe o que vai abrir; nome acessível difere do visível; no tablet, duas superfícies.
- **Recomendação:** no toque, definição curta no topo do diálogo; `aria-label` começando com o texto visível; prévia flutuante só com `(hover: hover) and (pointer: fine)`.
- **Esforço:** médio.
- **Aceite:** em 390 px, tocar um termo mostra a definição; nome acessível começa com o texto visível; axe sem `label-content-name-mismatch`; no tablet de toque, um toque abre só uma superfície.
- **Status:** prévia só por teclado ou hover fino; nome acessível começa pelo texto visível. Toque abre o diálogo, sem definição curta no topo.

### AUD-22 · Texto alternativo genérico, legenda pequena e tratamento fotográfico — parcial
- **Agentes:** A11Y-04, ART-06, RSP-06. **Onde:** `knowledge-context.component.html:34`; `ideology-block.component.html:139,361`; `ideology-page.component.html:38`; `licensed-asset.component.html:4`; `ideology-media.scss:11,14-17`; `ideology-page.component.scss:86,89,271`.
- **Evidência:** "Imagem associada a X", "Imagem de X" e "Retrato de X" são rótulos, não descrições; legenda de 0,6 rem (~9,6 px) até 750 px; `grayscale(1)` e `filter: none` só em hover e foco, não em toque; recorte fixo por `object-position`.
- **Impacto:** leitor de tela não sabe o que a imagem mostra; crédito ilegível no celular; pinturas dessaturadas como fotografias.
- **Recomendação:** campo `alt` descritivo no schema Zod, com fallback; decorativas com `alt=""`; legenda de pelo menos 0,75 rem com número de figura, crédito e licença; sem filtro em obras de arte; dessaturação só em fotografia documental, sem depender de hover.
- **Esforço:** médio (editorial).
- **Aceite:** todo registro de mídia publicado tem `alt` descritivo ou está marcado como decorativo; legenda de pelo menos 12 px em todos os breakpoints.
- **Status:** legenda de 0,75 rem no celular; cores mantidas em repouso. Texto alternativo descritivo exige mudança no schema e no conteúdo.

### AUD-23 · Alvos de toque e textos abaixo do mínimo — parcial
- **Agentes:** RSP-06, VIS-03. **Onde:** transversal; `/marxismo`, `/liberalismo`, `/fontes`.
- **Evidência [medido]:** links de fonte com 15 px de altura (ex.: "Karl Marx — O capital, volume I", 187×15); botões de navegação com 40 px. **[código]:** `.index-group` e botões mobile a 0,68 rem (`reading-index.component.scss:91,299`); `.action-cue` a 0,7 rem (`ideology-atlas-interaction.scss:12`); `.first-step` a 0,7 rem (`reading-path.component.scss:111`); links do índice com 36 px (`reading-index.component.scss:100`); filtros do roteiro com 2,5 rem (`reading-path.component.scss:16`); `.context-trail button` com 2 rem (`knowledge-context.component.scss:71`); `.carousel-bar` com 1,5 rem (`card-carousel.component.scss:142`).
- **Impacto:** toque impreciso, sobretudo no tablet.
- **Recomendação:** piso de 0,75 rem para texto; `min-height: var(--control-min-size)` em controles, com `--touch-min`; padding vertical nas linhas de fonte.
- **Esforço:** pequeno a médio.
- **Aceite:** nenhum controle com menos de 44 px em 390 e 768 px (ou 24 px com espaçamento); linhas de fonte com pelo menos 24 px.
- **Status:** fontes com 24 px de altura mínima; demais controles conforme Fase 3.

### AUD-24 · Breakpoints e escala tipográfica fragmentados — parcial
- **Agentes:** RSP-04, RSP-05, ART-04, ART-11. **Onde:** transversal. [código] verificado por grep.
- **Evidência:** cerca de 25 valores distintos de `@media`, em px e rem (750, 760, 761, 650, 672, 1000, 1024, 1100 e outros); pares que cortam o mesmo componente em pontos diferentes. Mais de 90 `font-size` literais com quase-duplicatas (0,75; 0,78; 0,8; 0,82; 0,85; 0,88; 0,9 rem). Oito pesos (400–800). Tokens `--text-*` com nove usos. Nenhum `@container`.
- **Impacto:** comportamento imprevisível entre viewports; título expressivo só em Home e Ideologias; Conhecimento e Rede parecem outro produto.
- **Recomendação:** três ou quatro breakpoints tokenizados; container queries para componentes de coluna; escala de 6–7 degraus e quatro pesos; mixin `display` para h1 e h2 de página.
- **Esforço:** médio.
- **Aceite:** `font-size` literal em componentes cai a quase zero, fora de exceções comentadas; h1 idêntico em Home, Ideologia e Explorer.
- **Status:** abertura unificada em 760 px. Cerca de 20 breakpoints e a escala tipográfica não foram tokenizados.

### AUD-25 · Medida de leitura ausente em telas largas — feito
- **Agentes:** RSP-05. **Onde:** `/marxismo`, `/liberalismo`, verbete (`ideology-page.component.scss:177-182`; tokens `styles.scss:115-117` sem uso).
- **Status original:** [medido] corpo do verbete com ~86 caracteres por linha (coluna de 688 px); lead do Marxismo com ~81 (971 px). [hipótese] ~100–115 no capítulo em 1440 px.
- **Recomendação:** `.chapter-narrative p { max-width: var(--measure-reading) }` (72ch) e tokens nos demais textos.
- **Esforço:** pequeno.
- **Aceite:** no máximo 78 caracteres por linha em 1024 e 1440 px (medido).
- **Status:** prosa limitada a 72ch; teste em `pages.spec.ts`.

### AUD-26 · Retrato de abertura espremido no mobile — feito
- **Agentes:** RSP-07, VIS-04. **Onde:** abertura de `/marxismo` e `/liberalismo` (`ideology-page.component.scss:249-277`). [observado] em 390 px; largura de ~105 px (estimada).
- **Evidência:** grade `minmax(0,1fr) 105px` com `display: contents`; título em coluna de ~230 px; legenda e crédito quebram em várias linhas.
- **Recomendação:** abaixo de 600 px, retrato empilhado abaixo do lead, com altura limitada (como já ocorre até 360 px, `:300-308`).
- **Esforço:** pequeno.
- **Aceite:** em 390 px, o cartão tem pelo menos 280 px ou fica abaixo do lead; nenhum título quebra no meio da palavra.
- **Status:** retrato empilhado abaixo de 600 px.

### AUD-27 · Cronologia de vidas perde datas e nomes no mobile — feito
- **Agentes:** RSP-08. **Onde:** `era-chart` (`era-chart.component.scss:170-181,294-320`).
- **Evidência:** nome truncado; datas e rótulos de marcos somem até 760 px; metade dos ticks some.
- **Recomendação:** lista cronológica compacta com nome completo e anos, padrão já usado em `historical-visualizations.component.scss:302-312`.
- **Esforço:** médio.
- **Aceite:** em 390 px, cada pessoa mostra nome e anos sem toque extra.
- **Status:** lista de vidas com nome e anos no celular.

### AUD-28 · Grafo do atlas: alturas e tamanhos de nó inconsistentes entre 672 e 1100 px — parcial
- **Agentes:** RSP-09. **Onde:** `ideology-atlas` (`ideology-atlas.component.scss:232-239`; `ideology-atlas-visual.scss:207-217`; `ideology-atlas-interaction.scss:68-78`). [hipótese] a validar.
- **Evidência:** canvas de 28 rem entre 929 e 1100 px, com nós `clamp(6rem, 13vw, 8rem)`; abaixo de 672 px o canvas some e aparece o texto alternativo; `node-preview` de 13 rem pode ser cortada por `overflow: hidden`.
- **Impacto:** em 768 px, dezenas de nós de ~100 px em % podem se sobrepor; prévia pode ser cortada.
- **Recomendação:** um `min-height` e uma escala de nó por container; texto alternativo a partir de 58 rem, ou abrir o painel de leitura no toque.
- **Esforço:** médio.
- **Aceite:** em 768 e 1024 px, nenhum par de nós se sobrepõe em mais de 10% da área.
- **Status:** nó escala com o canvas; sobreposição não medida.

### AUD-29 · Scroll suave global e rolagem na troca de rota — feito
- **Agentes:** MOT-01. **Onde:** todas; `styles.scss:144`; `app.config.ts:22`; `styles.scss:258` (modo teclado zera animação e transição, mas não o scroll).
- **Evidência:** `html { scroll-behavior: smooth }` global; restauração de rota e âncoras passam pelo `scrollTo`, que herda o smooth. [hipótese] efeito visual não validado.
- **Impacto:** na troca de página, a tela pode deslizar do ponto anterior ao topo, o que parece atraso; âncoras longas rolam sem controle.
- **Recomendação:** remover o smooth global; `behavior: 'smooth'` só em ações locais (setas do carrossel, "voltar ao capítulo"), com guarda `no-preference`. (Alternativa: `scrollPositionRestoration: 'top'` com `scrollTo({ behavior: 'instant' })` no `NavigationEnd`.)
- **Esforço:** pequeno.
- **Aceite:** de `/` para `/marxismo` com `scrollY` em 2000, `scrollY === 0` no primeiro frame; `getComputedStyle(document.documentElement).scrollBehavior === 'auto'`.
- **Status:** smooth global removido (Fase 1).

### AUD-30 · Revelação por scroll oculta conteúdo na impressão, na busca da página e antes do foco — feito
- **Agentes:** MOT-02. **Onde:** páginas com `appReveal` (`reveal.directive.ts:23-26`; `styles.scss:282-302`).
- **Evidência:** abaixo da dobra, `is-pending` com opacity 0, deslocamento de 1,5 rem e filhos `[data-stagger]` ocultos; observer sem timeout de segurança; sem revelação por `focus-within`. Projeto sem nenhum `@media print` (verificado).
- **Impacto:** salvar como PDF ou imprimir gera blocos transparentes; Ctrl+F ou Tab para bloco oculto mostra o conteúdo com atraso de 480 ms. [hipótese] efeito.
- **Recomendação:** `@media print` forçando opacidade 1 e `transform: none`; `.atlas-reveal-item:focus-within` deixa o conteúdo visível; duração até `--motion-standard`; deslocamento de 0,75 rem.
- **Esforço:** pequeno.
- **Aceite:** `emulateMedia('print')` mostra todos os blocos com opacidade 1; Tab para link dentro de item pendente o torna visível em menos de 50 ms.
- **Status:** `@media print` e `focus-within` já existiam.

### AUD-31 · Transição de rota longa e preferência de movimento não unificada — feito
- **Agentes:** MOT-03, MOT-04, MOT-06. **Onde:** transição de rota (`styles.scss:306-330`); carrossel (`card-carousel.component.ts:235-238`).
- **Evidência:** saída de 240 ms; entrada com `clip-path` de 480 ms em tela inteira, e entre 240 e 480 ms o conteúdo fica parcialmente recortado; cada navegação custa ~0,5 s. `glide()` do carrossel só consulta `prefers-reduced-motion`, não a classe `html.atlas-reduced-motion` aplicada pelo botão "Reduzir movimento" (`ideology-reading.component.ts:137`). A proteção está em dois lugares, e o zeramento por `0.01ms !important` não alcança `clip-path`.
- **Impacto:** navegação frequente lenta; quem ativou "Reduzir movimento" ainda vê o carrossel rolar suave.
- **Recomendação:** saída de 120 ms só com opacity; entrada de 200 ms só com opacity; total até 320 ms. Função `prefersReducedMotion(doc)` combinando media query e classe, usada no carrossel, na diretiva reveal e em `app.config.ts`. (Alternativa: remover a cortina e manter só o cabeçalho persistente, `view-transition-name: atlas-header`.)
- **Esforço:** pequeno.
- **Aceite:** conteúdo novo 100% opaco em até 250 ms; com `html.atlas-reduced-motion`, "próximo" muda `scrollLeft` no mesmo frame.
- **Status:** transição só com opacidade (Fase 1).

### AUD-32 · Repintura de fundo e tom, e listeners que medem layout a cada frame — pendente
- **Agentes:** MOT-05, MOT-12. **Onde:** `/marxismo`, `/liberalismo`, `/` (`ideology-reading.component.scss:5-6`; `home-page.component.scss:4,6`; `home-page.component.ts:98-110`; `ideology-reading.component.ts:65-94`). [hipótese] a medir.
- **Evidência:** `--tint` (propriedade registrada) e `background-color` animados em 480 ms no host; `getBoundingClientRect` em todas as seções a cada frame de scroll.
- **Impacto:** possível engasgo em aparelho fraco; não roda no compositor.
- **Recomendação:** `IntersectionObserver` por seção para estado ativo; crossfade de uma camada fixa com opacity; medição só para a barra de progresso.
- **Esforço:** médio.
- **Aceite:** trace em CPU 4x sem "Recalculate Style" ou "Paint" acima de 8 ms por frame na troca de tom.
- **Status:** troca de tom e leitura por frame exigem trace em aba visível, não obtido.

### AUD-33 · Título vazado em itens não selecionados da home — feito
- **Agentes:** ART-09. **Onde:** `/`, seletor de leituras (`home-page.component.scss:173-176,295-297`; `:321-327`).
- **Evidência:** `color: transparent` com `-webkit-text-stroke: 1.5px`; hover só troca o fundo para `--color-surface-subtle`; até 48 rem o seletor vira `<select>`. Contraste estimado ~1,2:1 no hover, a validar.
- **Impacto:** leitura não selecionada parece desativada; em alto contraste, o texto pode sumir.
- **Recomendação:** título cheio em tinta, com diferença de peso ou escala para o selecionado; indicador por forma e posição.
- **Esforço:** pequeno.
- **Aceite:** texto não selecionado com pelo menos 4,5:1; estados distinguíveis sem cor e sem hover.
- **Status:** títulos não selecionados em tinta sólida.

### AUD-34 · Fontes em TTF sem compressão e preload da fonte errada — feito
- **Agentes:** VIS-06, TEC-02, ART-12. **Onde:** `public/fonts/`; `index.html:14`; `styles.scss:8-44`. [medido] tamanhos no servidor de desenvolvimento.
- **Evidência:** `SourceSerif4.ttf` com 1,18 MB; `IBMPlexSans.ttf` com 525 KB; `IBMPlexMono-Regular.ttf` em TTF; Archivo em WOFF2 com 90 KB. Preload de `SourceSerif4.ttf` vale para todas as rotas. `font-display: optional` nas TTF e `swap` na Archivo.
- **Impacto:** carregamento pesado; em rede lenta, `optional` mantém a reserva e a tipografia editorial aparece de forma intermitente.
- **Recomendação:** WOFF2 com subset latin; carregar só os pesos usados; preload só da fonte acima da dobra; política única de `font-display`, documentada; remover o IBM Plex Sans se for só fallback.
- **Esforço:** pequeno.
- **Aceite:** nenhum `.ttf` em `public/fonts`; fontes somadas com menos de 400 KB; política documentada.
- **Status:** fontes em WOFF2 (`e8a9dc6`).

### AUD-35 · Cobertura de testes não cobre foco de rota, acessibilidade por rota nem estados — parcial
- **Agentes:** A11Y, TEC-03. **Onde:** `e2e/*.spec.ts`; `src/app/shared/ui/ui-contrast.spec.ts:4`.
- **Evidência:** axe em `/marxismo`, `/liberalismo` e três páginas com movimento reduzido (`quality.spec.ts`, `pages.spec.ts`); carrossel e diálogos com teste. Sem teste de foco na troca de rota. `ui-contrast.spec.ts` lê só `styles.scss`, então cores literais dos componentes ficam fora. Sem spec de `site-footer`, `home-page`, `explorer`, `record`, `notice`, `breadcrumbs` nem `KnowledgeContextDirective`. 16 ocorrências de teclado em seis arquivos. Sem teste com leitor de tela, zoom 400% nem `forced-colors`.
- **Recomendação:** axe em todas as rotas públicas, incluindo catálogos e perfis; teste de foco na troca de rota; contraste estendido aos componentes; spec do `KnowledgeContextDirective`; roteiro manual com leitor de tela e zoom 200% e 400%.
- **Esforço:** médio.
- **Aceite:** `npm run test:e2e` cobre todas as rotas públicas no axe e falha quando a rota troca sem mover o foco.
- **Status:** axe e overflow em todas as rotas públicas e teste de foco. Falta cobertura de `KnowledgeContextDirective`, rodapé e zoom.

### AUD-36 · Rede e Conhecimento com cara de painel mestre-detalhe — decidido
- **Agentes:** ART-05. **Onde:** componente `evidence-network` (`evidence-network.component.scss:28-70`); `/rede` redireciona para `/conhecimento`.
- **Evidência:** lista com `max-height` à esquerda e painel à direita, com `border-block`; sem SVG nem composição espacial; botões fora da grade de botões do sistema.
- **Impacto:** tela mais parecida com dashboard do site; a promessa "tudo se liga" não aparece visualmente.
- **Recomendação:** mapa relacional com nós posicionados e legenda, mantendo a lista como alternativa operável por teclado; arestas com contraste de 3:1. (Alternativa: índice-legenda com numeração e linhas de chamada.)
- **Esforço:** grande.
- **Aceite:** composição espacial com legenda; lista operável por teclado; arestas com pelo menos 3:1.
- **Decisão de produto:** a prioridade depende de `/rede` voltar a existir.
- **Status:** componente órfão removido; `/rede` segue redirecionando. Mapa relacional não construído.

---

## 5. Achados de severidade baixa

| ID | Título | Agentes | Onde | Evidência | Recomendação | Esforço | Status |
|---|---|---|---|---|---|---|---|
| AUD-37 | Carrossel: "Anterior" habilitada no início e região focável sem rolagem | VIS-08, A11Y-05 | `/marxismo` | `aria-disabled="false"` com `scrollLeft` 8; `tabindex="0"` fixo (`card-carousel.component.html:50-52`) | `aria-disabled` no início; `tabindex` só quando rolável | Pequeno | feito: `aria-disabled` e `tabindex` condicionais |
| AUD-38 | Diálogo "Karl Marx" não modal, com ARIA parcial | VIS-07 | `/marxismo` | Gatilho com `aria-expanded` sem `aria-controls`; `aria-modal="false"` | `aria-haspopup` e `aria-controls`, ou modal com foco preso | Médio | parcial: anunciados como modais; gatilho com `aria-controls` |
| AUD-39 | Rótulo da linha do tempo passa da borda em 768 px | VIS-09 | `/marxismo` | "1917 · Revolução Russa de 1917" com right em 811 px (viewport 768) [medido] | Limitar largura ou alinhar à borda | Pequeno | feito: rótulos abrem para a esquerda perto da borda |
| AUD-40 | Texto promete tabela que não existe | VIS-10 | `/marxismo`, "Polêmicas documentadas" | Texto e `desc` do SVG dizem "a tabela a seguir"; 0 `<table>` [medido] | Corrigir o texto ou criar a tabela | Pequeno | feito: texto da figura corrigido |
| AUD-41 | Âncoras e o botão "voltar" | VIS-11 | `/marxismo` | Após `#origens`, `history.length` não mudou e "voltar" saiu da página [hipótese, aba oculta] | Verificar fragmento e `replaceUrl`; garantir entrada no histórico | Médio | feito: saltos entram no histórico; teste em `pages.spec.ts` |
| AUD-42 | Página `/fontes` muito longa | VIS-12 | `/fontes` | 31.807 px, 128 subtítulos, 183 controles [medido] | Índice interno por tipo e grupos recolhidos | Médio | parcial: citações recolhidas por fonte; índice não criado |
| AUD-43 | Menu mobile: foco pode sair do painel sem fechá-lo | RSP-12 | `site-header`, até 640 px | Fecha com Escape, toque fora e navegação, mas Tab pode sair | Fechar em `focusout` quando o foco sai de `nav` e do botão | Pequeno | feito (já existia) |
| AUD-44 | Home: `.method ol` em duas colunas em 390 px | RSP-10 | `/` | Sem regra de uma coluna até 40 rem (`home-page.component.scss:257,307-309`) | Uma coluna até 40 rem | Pequeno | feito (já existia) |
| AUD-45 | Região de carregamento criada junto com o texto | A11Y-06 | `ideology-page.component.html:141-158` | `section[aria-live]` nasce com o texto | Contêiner `role="status"` permanente; trocar só o texto | Pequeno | feito: região permanente |
| AUD-46 | CSP com `'unsafe-inline'` e `'unsafe-hashes'` | TEC-05 | `public/_headers:7`; `scripts/security-headers.mjs:23-40` | Hashes para CSS crítico, com `onload="this.media='all'"` | Avaliar `inlineCritical: false` ou documentar a exceção | Pequeno | parcial: exceções documentadas; nenhum header mudou |
| AUD-47 | Movimento sem tokens: easing e stagger soltos | MOT-07 a MOT-11 | Vários | 180 ms sem token (`value-debate.component.scss:162-163`); `ease` (`ui-primitives.scss:51-52`); stagger de 60 e 70 ms (`ideology-exploration.scss:374`; `styles.scss:297`); `left` e `width` na faixa de época (`era-chart.component.scss:130-132`); snap sem `scroll-snap-stop` (`card-carousel.component.scss:100,130`) | `--ease-standard`; `--stagger-step: 60ms`; `transform` na faixa; avaliar `scroll-snap-stop: always` | Pequeno | feito: restos são legítimos |
| AUD-48 | Cores hexadecimais e rgb fora de tokens | TEC-03, ART-11 | 48 ocorrências em 11 arquivos SCSS | `explorer` (4), `era-chart` (4), `ideology-atlas-visual` (3); `#fff` em seis arquivos; `::ng-deep` na home (`home-page.component.scss:86-97`); blocos `@media` vazios (`ui-primitives.scss:32-33,170-173`) | Migrar para tokens; remover código morto | Pequeno | feito: `#000` do carrossel mantido por decisão anterior |
| AUD-49 | Seta ↗ em links internos | UX-09 | Cabeçalho e rodapé (`site-header.component.html:39,52,64`; `site-footer.component.html:7`) | "Marxismo ↗" é rota interna | Reservar ↗ para links externos | Pequeno | feito |
| AUD-50 | Debate de valor: filtro troca só dois parágrafos; texto no template | UX-10 | `value-debate.component.html:32-64,84-103,195-197` | Três rádios para duas frases; texto e link fixos no template | Mostrar os dois vínculos rotulados; mover conteúdo para os dados | Pequeno | parcial: rádio removido; textos ainda no template |
| AUD-51 | Exercício de estudo com link fixo para `/marxismo#fontes` | NAV-08 | `study-exercise.component.html:16`; `value-debate.component.html:195-197` | Componente recebe `origin`, mas o link não o usa | Destino por input ou contrato do dossiê | Pequeno | feito: link volta à origem |
| AUD-52 | Índice de leitura com rótulos pouco claros | UX-12 | `reading-index.component.html:4,49,52-59`; `ideology-page.component.html:15,73` | "Percurso 42%", "← Ponto anterior", "~N min" repetido | "Você leu 42%", "Voltar de onde veio"; controle de movimento junto ao cabeçalho do índice | Pequeno | feito |
| AUD-53 | Imagem licenciada sem `width` e `height` | TEC-01 | `licensed-asset.component.html:4` | CLS medido zero em `/marxismo`, `/liberalismo` e `/` (docs do projeto); hipótese nas rotas de exploração | Dimensões do registro de mídia ou `aspect-ratio` | Pequeno | pendente: exige dados no schema |
| AUD-54 | Código órfão e documentação obsoleta | NAV-11 | `route-resolvers.ts:7-27`; `docs/architecture/EXPLORACAO-CONTEXTUAL.md:7`; `docs/quality/REDE-E-COMPARADORES.md:10` | Resolvers sem uso fora do arquivo; docs citam tradução e `analysis` | Atualizar ou remover | Pequeno | feito |

---

## 6. Pontos de divergência

### 6.1 Entre agentes

1. **Carrossel (AUD-05):** a preferência do usuário (todo scroll horizontal vira carrossel) se choca com a redução de controles. **Resolução:** manter o carrossel e remover as duplicações ao lado dele.
2. **Grafo:** entrada no desktop (UX-01, RSP-09); no mobile, a lista é principal (RSP-01); a Rede sugere mapa relacional (ART-05). **Resolução:** grafo como entrada no desktop, lista no mobile, mapa em Rede só se a rota voltar. Diferença de contexto, não contradição.
3. **Contorno e sombra (AUD-08):** ART-02 vê neobrutalismo; a leitura visual vê "forte identidade". **Resolução:** restringir, não remover. Decisão de direção de arte.
4. **Mosaicos (AUD-11):** ART-08 pede composição determinística; a leitura visual elogia o cartaz. **Resolução:** manter o cartaz e tirar a aleatoriedade das rotas principais.
5. **Transição (AUD-31):** MOT-03 pede encurtar ou remover a cortina. **Resolução:** encurtar; a cortina só se justifica se o cabeçalho persistente for o único elemento animado.
6. **Revelação (AUD-30):** é qualidade a preservar, mas oculta conteúdo na impressão. **Resolução:** manter, com fallbacks.
7. **Revisão pendente (AUD-20):** UX-05 pede concentrar; `AGENTS.md` exige diferenciar fato, interpretação e hipótese. **Resolução:** concentrar, não remover.
8. **Rede (AUD-36):** ART-05 avaliou o componente, mas `/rede` redireciona. **Resolução:** a avaliação vale para o componente; a prioridade depende da rota.

### 6.2 Entre achados e premissas do briefing e do projeto

1. **"Navegação principal na lateral esquerda"** (briefing). O código usa cabeçalho horizontal com três portas (`site-header.component.html:23-66`). A única lateral esquerda é o índice de leitura, que é navegação interna. **Decisão:** manter o cabeçalho e registrar a premissa como revisada, ou criar lateral global (muda arquitetura e cabeçalho móvel). **Recomendação:** manter o cabeçalho.
2. **"Rotas atuais incluem `/rede` e `/comparar`"** (`AGENTS.md`). Hoje são redirecionamentos (AUD-13).
3. **"Sem segunda barra de navegação"** (briefing). A `nav` de catálogos do explorer e o índice de leitura podem ser lidos como segunda barra (AUD-16). **Decisão** sobre o que conta como navegação.
4. **"Páginas editoriais não viram dashboards"** (briefing). Atlas e debate de valor se aproximam de painéis de controle (AUD-05, AUD-50).
5. **"Sem efeitos que atrapalhem a leitura"** (briefing). A cortina de rota atrasa a leitura (AUD-31). Cumprida só parcialmente.

---

## 7. Roadmap em fases

**Fase 0 · Validar (1–2 dias).** Repetir com aba visível as medições de rAF, transições, revelação, smooth scroll e carrossel arrastado (AUD-29 a AUD-32). Testar com leitor de tela (AUD-01, AUD-13, AUD-22, AUD-45). Testar com toque real em tablet (AUD-03, AUD-04, AUD-21, AUD-23). Decidir: navegação lateral ou cabeçalho (6.2.1), política de rotas inexistentes (AUD-13), linguagem de contorno e sombra (AUD-08).

**Fase 1 · Baixo esforço, alto impacto (~uma semana).** AUD-01, AUD-02, AUD-29, AUD-30, AUD-31 (CSS). AUD-13 (se aprovada), AUD-14, AUD-17, AUD-18. AUD-09 e AUD-34. Baixos: AUD-37, AUD-39, AUD-40, AUD-43, AUD-44, AUD-45.

**Fase 2 · Tokens e controles (2–3 semanas).** AUD-24, AUD-25, AUD-47, AUD-48. AUD-07, AUD-12, AUD-06. AUD-08 (após decisão da Fase 0). AUD-33 e AUD-35.

**Fase 3 · Leitura e mobile (3–4 semanas).** AUD-24 antes de AUD-03, AUD-04, AUD-27 e AUD-28, para não refazer breakpoints. AUD-05, AUD-03, AUD-04, AUD-26, AUD-27, AUD-28, AUD-23, AUD-21. AUD-16, AUD-19, AUD-15, AUD-18, AUD-20. AUD-22, AUD-10, AUD-32.

**Fase 4 · Identidade e cartografia (decisão de produto, esforço grande).** AUD-11, AUD-36, placas de atlas (AUD-22) e serif de display (2.4). Depende de AUD-08 e de `/rede` voltar a existir.

**Dependências:** AUD-09 antes de qualquer mudança visual; AUD-01 antes de AUD-35; AUD-07 antes de AUD-12; AUD-22 começa pelo schema Zod.

---

## 8. Validação pendente

- **Com aba visível:** rAF, transições, revelação, smooth scroll e carrossel arrastado (AUD-29 a AUD-32).
- **Com leitor de tela (NVDA ou VoiceOver):** AUD-01, AUD-13, AUD-22, AUD-45.
- **Toque real e tablet:** AUD-03, AUD-04, AUD-21, AUD-23.
- **Zoom 200% e 400%** e reflow.
- **Build de produção** e status HTTP real de rotas desconhecidas (AUD-13).
- **Visual de `/paises`, `/rede`, `/comparar`, `/fontes` e `/verbete` em 390 e 768 px**, e fim de `/liberalismo` em 1440 px. A captura cobriu só medições nessas rotas.
- **INP e LCP reais.** A documentação do projeto mede só em laboratório (`docs/quality/MOTION-PERF-ACESSIBILIDADE.md`).
- **Efeito visual de AUD-02 e AUD-03** no celular, com captura.

---

## 9. Registro

- **Auditoria:** seis subagentes de análise (somente leitura) e um de captura visual; ~190 arquivos lidos; 23 capturas.
- **Comandos do orquestrador em `f99d01a`:** `npm run typecheck` (exit 0); `npm test` (exit 0; 36 arquivos, 170 testes); `npm run lint` (exit 0). Dev server `ng serve` na porta 4303, parado ao fim.
- **Git:** baseline `f99d01a`; `master` em `79f4dbc`. Nenhuma issue criada.
- **Implementação:** commits em `master`: `a4baa60`, `e8a9dc6`, `e9f9bca` (fases anteriores); `e3b8aa1`, `6d8df57` (fase 3); `bab87b6` (fase 2); `515a8f2` (baixos); `51ef687` e `8115b23` (lotes seguintes). Status por achado em 02/11/2026 (atualizado nas seções 2–5).
- **Correção pré-existente:** falha em `editorial-i18n.spec.ts:59` corrigida em 03/11/2026: resultados exibem o título traduzido e a origem de retorno aceita `idioma`.
