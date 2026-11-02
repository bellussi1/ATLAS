# Auditoria UX/UI, usabilidade e direção artística do ATLAS

- **Data:** 2026-11-02
- **Baseline:** commit `f99d01a`, branch `feat/atlas-carrosseis-e-exploracao`. Ele vem depois de `79f4dbc` (master) e inclui as alterações não commitadas que existiam no início da auditoria, nos commits `9668165` e `f99d01a` (52 arquivos, +1711/−1391).
- **Escopo:** código de `src/`, conteúdo em `src/content`, documentação e captura visual no servidor de desenvolvimento (`ng serve`, porta 4303).
- **Natureza:** diagnóstico. Nenhum arquivo do projeto foi alterado; este relatório é o único arquivo novo e ainda não está commitado.

Marcações usadas: **[medido]** (medição no navegador), **[observado]** (captura de tela), **[código]** (leitura de arquivo, com `arquivo:linha`), **[hipótese]** (plausível, não verificado).

---

## 1. Método e limites

- **Análise por código (somente leitura):** seis subagentes em paralelo, cada um com um recorte: navegação e rotas; UX e arquitetura da informação; responsividade; motion e scroll; direção artística; acessibilidade e técnica.
- **Captura visual:** um subagente com o navegador integrado, em `localhost:4303`, com 23 capturas nos viewports 390, 768, 1024×768 e 1440 px.
- **Verificações do orquestrador**, executadas em `f99d01a` (13:54–13:55):
  - `npm run typecheck`: exit 0.
  - `npm test`: 36 arquivos, 170 testes, exit 0.
  - `npm run lint`: exit 0 (`ng lint`, 6/6 testes de limites de arquitetura, Biome, Prettier).
- **Greps do orquestrador**, que confirmaram afirmações de agentes: divergência entre tokens do documento e do CSS; ausência de `@media print`; teste de contraste lendo só `src/styles.scss`; `--measure-*` sem uso em `src/app`; `html { scroll-behavior: smooth }` em `src/styles.scss:144`; `scrollPositionRestoration` em `src/app/app.config.ts:22`; carrossel decidindo reduced-motion só por `matchMedia` (`card-carousel.component.ts:236-238`).
- **Limites:**
  - A aba do navegador ficou oculta durante a captura. Por isso transições, rolagem suave, revelações e `requestAnimationFrame` **não foram validados de forma conclusiva**.
  - Sem leitor de tela, sem toque físico, sem zoom 200/400%, sem build de produção e sem medição de INP.
  - Contrastes foram calculados a partir dos tokens, não medidos na tela.
- **Ajustes de severidade feitos pelo orquestrador:** MOT-01 e ART-05 foram rebaixados de alta para média (efeito não validado, e a rota `/rede` redireciona). UX-05 foi para média. ART-02 foi mantido em alta porque afeta a leitura visual de todas as páginas, mas é decisão de direção de arte (ver AUD-08).

---

## 2. Resumo executivo

### 2.1 Diagnóstico geral

O ATLAS tem uma base técnica e editorial forte. A arquitetura por feature tem limites verificados por lint. O prerender e o SSR estão presentes. O conteúdo usa schemas Zod. Há skip link, diálogos com foco restaurado, carrossel operável por teclado e reduced-motion tratado em várias camadas. Os testes passam e o axe roda nas páginas principais. A honestidade editorial é clara: marcações de certeza, a nota "data não implica causalidade" e o aviso de vínculos importados.

A identidade é **parcial**. Há personalidade real na marca, no título condensado, nos números geométricos, nas "portas" do cabeçalho e nos cartazes de mosaico. Ela se dilui em três pontos: os componentes viraram caixas com contorno e sombra dura (mais neobrutalismo que modernismo suíço); o vermelho acumula cinco funções; e as telas de Conhecimento e Rede lembram painel mestre-detalhe. A home não mostra o acervo e não tem figura, mapa ou documento.

Na usabilidade, a leitura das ideologias é rica, mas sobrecarregada. Um capítulo pode ter três ou quatro conjuntos de controles equivalentes. O "+" tem quatro significados diferentes. No mobile, o índice sticky ocupa 124–160 px e cobre o destino das âncoras, e o grafo de polêmicas perde as relações.

A falha transversal mais grave é técnica: **não há gestão de foco nem anúncio na troca de rota**. Isso pesa em teclado e leitor de tela em todas as páginas.

### 2.2 Qualidades a preservar

- **Arquitetura:** `IdeologyPageComponent` e `IdeologyReadingComponent` atendem às duas tradições, e os limites de feature são verificados por `npm run lint:architecture`.
- **Carrossel único e coerente:** setas de 2,75 rem, arraste, Home/End/setas, reduced-motion (`card-carousel.component.ts`). É a aplicação consistente da preferência registrada de scroll horizontal.
- **Diálogo de contexto:** foco restaurado, `aria-expanded`, `aria-controls` e `aria-haspopup` (`knowledge-context.directive.ts`).
- **Honestidade editorial:** marcações de certeza, legenda de direção das setas, nota "data não implica causalidade", aviso de vínculos importados.
- **Roteiro de leitura:** cartões expansíveis com estado compacto, uma obra aberta por vez, contagem com `aria-live` (`reading-path.component.html`).
- **Adaptações de contexto:** lista no lugar do cronograma no mobile (`historical-visualizations.component.scss:302-312`); texto no lugar do atlas abaixo de 672 px; seletor nativo de capítulos no celular.
- **Base de acessibilidade:** skip link, `lang="pt-BR"`, foco de 3 px, `prefers-reduced-motion`, redirecionamento de rotas aposentadas.
- **Movimento progressivo sem ocultar no SSR:** `reveal.directive.ts:23-26`; view transitions desligadas para teclado e reduced-motion (`app.config.ts:28-34`).
- **Fontes locais** com licenças OFL presentes em `public/fonts/`.

### 2.3 Os 10 problemas de maior impacto

| # | ID | Problema | Por que pesa | Esforço |
|---|---|---|---|---|
| 1 | AUD-01 | Sem foco nem anúncio na troca de rota | Todas as páginas; teclado e leitor de tela | Pequeno |
| 2 | AUD-02 | Índice sticky cobre âncoras e ocupa até 160 px no mobile | [medido] em 390 px; navegação por seção | Pequeno a médio |
| 3 | AUD-03 | Grafo de polêmicas quebrado no mobile | Bloco central do capítulo perde as relações | Médio |
| 4 | AUD-04 | Grade de 12 colunas comprime cartões entre 761 e 1000 px | Tablet, fora de qualquer teste | Médio |
| 5 | AUD-05 | Três a quatro conjuntos de controles equivalentes por capítulo | Carga cognitiva alta para o leitor iniciante | Médio |
| 6 | AUD-06 | "+" e vocabulário de destino com significados diferentes | Ação imprevisível | Pequeno a médio |
| 7 | AUD-07 | Vermelho com cinco funções | O sinal de ação se dilui | Médio |
| 8 | AUD-08 | Contorno e sombra dura como linguagem de componente | Define a leitura visual do site (decisão) | Médio |
| 9 | AUD-09 | Documento de design, tokens e logos divergem | Fonte de verdade quebrada; marca | Pequeno |
| 10 | AUD-10 | Home sem acervo e com jargão | Descoberta do leitor novo | Pequeno a médio |

### 2.4 Oportunidades de evolução artística e interativa

1. **Planos e registro suíços:** planos chapados, filetes e grade; contorno só no estado ativo (AUD-08).
2. **Placa de atlas:** figura numerada, legenda em coluna, crédito e escala, para imagens históricas e documentos (AUD-22).
3. **Cartazes compostos à mão por assunto** (Marxismo, Liberalismo, Atlas), com a recomposição aleatória como recurso secundário (AUD-11).
4. **Rede como mapa relacional:** nós posicionados e legenda, com lista equivalente operável por teclado (AUD-36).
5. **Serif de display nas perguntas dos capítulos**, contrastando com o condensado. É preferência de design: avaliar peso e carregamento de fonte.
6. **Home com prova do acervo:** retrato licenciado com legenda acima da dobra e faixa "Explorar por tipo" (AUD-10).

### 2.5 Melhorias estruturais (afetam várias páginas)

- **Camada de rota:** foco, anúncio, página não encontrada e metadados numa configuração só (AUD-01, AUD-13, AUD-14). Isso elimina os ramos por path do shell.
- **Tokens:** cor com função, escala tipográfica de 6 a 7 degraus, 3 a 4 breakpoints (ou container queries), medida de leitura usada e movimento unificado (AUD-07, AUD-09, AUD-24, AUD-25, AUD-47).
- **Três tipos de controle:** ação, filtro/seleção e navegação, com estados definidos uma vez em `ui-primitives.scss` (AUD-06, AUD-12).
- **Template de capítulo com regras de densidade:** um conjunto de seleção por capítulo e o estado de revisão declarado uma vez por página (AUD-05, AUD-20).
- **Contrato de mídia:** `alt` descritivo, legenda, crédito e dimensões no schema Zod (AUD-22, AUD-53).
- **Testes por rota:** axe em todas as rotas públicas, teste de foco na troca de rota e varredura em 390/768/1024/1440 (AUD-35).
- **Fontes em WOFF2 com subset** e política de `font-display` documentada (AUD-34).

### 2.6 As ideologias: a estrutura facilita ou dificulta novas tradições?

**Facilita:**
- Capítulos e blocos vêm de `IdeologyPageComponent` e `IdeologyBlockComponent`, e o atlas recebe configuração própria.
- O registro de snapshots é explícito (`published-ideologies.ts`).
- Marxismo e Liberalismo são simétricos em rota, título e estrutura.

**Dificulta:**
- O shell tem ramos fixos por path para Marxismo e Liberalismo (`app-shell.component.ts:73-79`), e a descrição da rota de Liberalismo é ignorada (AUD-14). Cada nova tradição exigiria editar o shell.
- `value-debate` tem texto e link no template (AUD-50), e `study-exercise` aponta para `/marxismo#fontes` (AUD-51). Conteúdo específico do marxismo está fora dos dados, contra o que diz `ARCHITECTURE.md` ("dados específicos em data").
- Os controles de seleção são fixos por bloco, então uma nova tradição herda a duplicação (AUD-05).

**Recomendação:** resolver AUD-14, AUD-50, AUD-51 e AUD-05 antes de criar a próxima tradição (Social-democracia ou Anarquismo), para não replicar as duplicações.

---

## 3. Achados de severidade alta

### AUD-01 · Foco e anúncio na troca de rota
- **Agentes:** NAV-01, A11Y-01, A11Y-02 (e MOT-03 sobre o foco na transição).
- **Rota/componente:** todas. `app-shell.component.ts:36-45,63-65`; `app.config.ts:22-35`; `site-header.component.ts:54-58`.
- **Tipo:** acessibilidade. **Status:** [código] o foco só é movido pelo skip link e pelo retry; [hipótese] efeito em leitor de tela (validar com NVDA ou VoiceOver).
- **Evidência:** nenhum `NavigationEnd` move o foco. Ao ativar um link do menu mobile, `close(true)` devolve o foco ao botão "Menu" (`site-header.component.html:34,47,60`; `site-header.component.ts:54-58`).
- **Impacto:** o título muda sem anúncio. Quem usa teclado ou leitor de tela precisa percorrer o cabeçalho de novo após cada navegação. No celular, o foco volta ao botão de menu.
- **Recomendação:** no `NavigationEnd`, quando o path mudar (não só query ou fragment), focar `#conteudo` ou o `h1` com `preventScroll`. Nos links do menu, usar `close(false)` e reservar `close(true)` para Escape. Opcional: região `role="status"` com o título.
- **Alternativa:** focar só quando a navegação vier do teclado (`data-input="keyboard"` já existe).
- **Esforço:** pequeno.
- **Aceitação:** E2E de `/` para `/marxismo`: `document.activeElement` é `h1` ou `#conteudo`. Enter num link do menu mobile não deixa o foco no toggle. Mudar só `?q=` não move o foco.

### AUD-02 · Índice de leitura sticky cobre o destino das âncoras e ocupa altura excessiva
- **Agentes:** RSP-03, VIS-01, VIS-02.
- **Rota/componente:** `/marxismo`, `/liberalismo`. `reading-index.component.scss:3-4,239-300`; `ideology-page.component.scss:247`; `ideology-atlas-interaction.scss:135`.
- **Tipo:** bug/usabilidade. **Status:** [medido] barra de 124–150 px em 390 px, com o título de "05 Épocas" em y=16, sob a barra. [medido] 778 px de altura em 1024×768, com "Reduzir movimento" cortado. [código] `scroll-margin-top: 9rem` (144 px).
- **Impacto:** ao pular para um capítulo pelo índice, o título fica encoberto. Em telas baixas, o último controle não é alcançável. No celular, 15–18% da área útil vai para uma barra permanente.
- **Recomendação:** `scroll-margin-top` igual à altura real da barra (variável `--reading-bar-h`, medida). No mobile, uma linha só (select e progresso fino). Mover "Ponto anterior" e "Reduzir movimento" para um `details` recolhido. `max-height: calc(100dvh - 2rem)` com `overflow: auto`.
- **Alternativa:** a barra some ao rolar para baixo e volta ao rolar para cima.
- **Esforço:** pequeno a médio.
- **Aceitação:** em 390 px, para cada item do índice, `h2.getBoundingClientRect().top >= barra.bottom + 8`. Barra com até 6 rem. Em 1024×768 e 1366×768, todos os controles são alcançáveis.

### AUD-03 · Grafo de polêmicas no mobile: linhas somem e nós ficam soltos
- **Agentes:** RSP-01.
- **Rota/componente:** `/marxismo`, `/liberalismo`, bloco `graph` de `ideology-block`. `ideology-block.component.scss:370-372`; `ideology-block.component.html:227-244`; `ideology-exploration.scss:125-151`; `ideology-relations.scss:100-105`.
- **Tipo:** bug/usabilidade. **Status:** [código] confirmado; [hipótese] aparência exata a validar.
- **Evidência:** em até 650 px o SVG é ocultado (`display: none`), mas os botões `.genealogy-node` continuam posicionados em % sobre um canvas de `aspect-ratio 900/380`, sem as setas. Os rótulos das relações somem em outro breakpoint (42 rem).
- **Impacto:** com 351 px de coluna, cada nó tem cerca de 98×72 px sobre um canvas de cerca de 300 px, com risco de sobreposição. A relação ("A critica B") não aparece e "Investigar conexões +" fica com cerca de 11 px.
- **Recomendação:** no mobile, ocultar o canvas inteiro e mostrar a lista de relações, que já existe no carrossel dentro de `details` fechado, com o `details` aberto por padrão. A relação deve ser escrita entre os nós.
- **Alternativa:** nós empilhados em lista vertical, com a relação entre eles.
- **Esforço:** médio.
- **Aceitação:** em 390 px não há `.genealogy-node` absoluto. As relações são acessíveis sem abrir `details`. Não há overflow horizontal. Um só breakpoint governa a troca.

### AUD-04 · Grade de 12 colunas comprime cartões entre 761 e 1000 px
- **Agentes:** RSP-02, RSP-04.
- **Rota/componente:** `/marxismo`, `/liberalismo`: `.portraits`, `.documents`, `.principles` (`ideology-block.component.scss:93-125`); coluna do índice (`ideology-reading.component.scss:25,36-39`).
- **Tipo:** bug. **Status:** [código] aritmética: em 768 px a área de conteúdo tem cerca de 467 px e um span de 3 colunas cerca de 102 px. [hipótese] o resultado visual precisa ser validado.
- **Evidência:** os colapsos só existem em `max-width: 650px` (`ideology-block.component.scss:336`). O índice muda de modo em 760 px (`reading-index.component.scss:239`), mas o layout só muda em 750 px (`ideology-reading.component.scss:48`). Em 751–760 px, o seletor mobile aparece numa coluna de desktop.
- **Impacto:** no tablet, títulos ficam com cerca de 21 px e `overflow-wrap: anywhere` quebra palavras no meio. Em 1024 px, um span de 3 colunas tem cerca de 142 px.
- **Recomendação:** container queries em `.chapter-sequence` (`container-type: inline-size`, `@container (max-width: 40rem)`) para os colapsos. Um só breakpoint de leitura (por exemplo, 48 rem) para índice e layout.
- **Alternativa:** subir o colapso para 1000 px.
- **Esforço:** médio.
- **Aceitação:** em 768 e 1024 px, nenhum cartão tem menos de 11 rem. Nenhum título quebra no meio da palavra. Em 751 e 760 px, o índice segue um padrão só.

### AUD-05 · Controles de seleção repetidos no mesmo capítulo
- **Agentes:** UX-01.
- **Rota/componente:** `/marxismo`, `/liberalismo`. `ideology-atlas.component.html:61-79,108-117,230-251,256-293,326-393`; `ideology-block.component.html:265-276,301-336`.
- **Tipo:** usabilidade/carga cognitiva. **Status:** [código] confirmado.
- **Evidência:** no atlas há grafo, carrossel de fichas, "Conexões desta ficha", lista textual aberta por padrão no modo contínuo, filtro, seletor de período, carrossel de linha do tempo e stepper. No bloco `graph`, há grafo, legenda, filtro, N botões "A → B" e um carrossel que repete os mesmos botões, cada cartão com um `details` de evidência.
- **Impacto:** o leitor iniciante não sabe por onde começar. A mesma relação é escolhida de três modos. O leitor avançado ganha pouco com a duplicação.
- **Recomendação:** o grafo como entrada e a ficha como destino. A lista textual recolhida, mas acessível por teclado e leitor de tela. Remover os botões "A → B" quando o carrossel de relações existir (ou o inverso).
- **Alternativa:** se a lista textual for o equivalente acessível do grafo, mantê-la e ocultar visualmente o resto.
- **Esforço:** médio.
- **Aceitação:** no máximo um conjunto de controles de seleção visível por padrão por capítulo. A lista textual é operável por teclado. O E2E de seleção por relação continua passando.

### AUD-06 · O "+" e o vocabulário de destino têm significados diferentes
- **Agentes:** UX-02, UX-07 (em parte).
- **Rota/componente:** transversal. `ideology-block.component.html:44,242,322,370`; `ideology-atlas.component.html:73`; `knowledge-context.component.html:47,68`; `record.component.html:16`.
- **Tipo:** usabilidade/inconsistência. **Status:** [código] confirmado na leitura dos templates.
- **Evidência:** "Abrir contexto +" abre diálogo. "Selecionar contexto +" só marca uma ficha. "Destacar no grafo +" muda a seleção local. "Investigar conexões +" e "Explorar fundamento e fontes +" completam o conjunto. O destino aparece como "contexto", "ficha", "registro", "verbete" e "página permanente". Dentro do diálogo, "abre aqui →" substitui o "+".
- **Impacto:** o leitor não sabe se a ação abre um painel, muda a seleção ou sai da página. O estudante não forma um modelo estável da interface.
- **Recomendação:** dois sinais fixos: "+ Abrir ficha" para painel sobre a leitura, e seleção sem "+" (estado pressionado). Um único substantivo para o destino, "ficha", em telas e diálogo.
- **Esforço:** pequeno a médio.
- **Aceitação:** um grep nos templates mostra no máximo dois padrões de rótulo de ação. "Ficha" é o único termo para painel e página.

### AUD-07 · Vermelho com cinco funções
- **Agentes:** ART-03.
- **Rota/componente:** global. `ideology-page.component.scss:13-16` (link); `home-page.component.scss:243` (CTA); `ideology-page.component.scss:143` (número de capítulo); `home-page.component.scss:156-159`; `explorer.component.scss:160-162` (hover de botão); `styles.scss:188-191` (seleção e marca); `ui-primitives.scss:73-76` (hover de botão secundário usa `--color-danger`).
- **Tipo:** inconsistência/usabilidade. **Status:** [código] confirmado. Os tokens `--color-danger` (`#82251f`) e `--color-accent-hover` (`#811f1a`) são quase iguais.
- **Evidência:** além dessas funções, há cinco pastéis em `styles.scss:73-84`, washes de fundo por tonalidade (`styles.scss:76-80`, `home-page.component.scss:3-6`) e até sete cores no `mosaic-tiles.ts:39-48`.
- **Impacto:** o vermelho deixa de significar "clique aqui" ou "atual". Ação e erro ficam indistinguíveis. A proposta "preto, vermelho e branco quente" vira arco-íris.
- **Recomendação:** vermelho só para ação primária, estado atual e marca. Taxonomias por forma, contorno e rótulo. No máximo dois pastéis como solo de apoio. O tom de erro separado do acento (mais escuro ou mais frio).
- **Esforço:** médio.
- **Aceitação:** `--color-accent` usado só em elementos interativos, atuais ou da marca. O hover secundário não usa token de erro.

### AUD-08 · Contorno e sombra dura como linguagem de componente
- **Agentes:** ART-02.
- **Rota/componente:** home, leituras, explorer e blocos. `home-page.component.scss:184-185` (borda de 3 px e `box-shadow: .75rem .75rem 0`); `ideology-page.component.scss:71-73`; `ui-primitives.scss:215-219`; `explorer.component.scss:32,36`; `ideology-block.component.scss:48`.
- **Tipo:** oportunidade de design (decisão). **Status:** [código] confirmado. A leitura estética é julgamento do agente.
- **Evidência:** o cartão com borda de 3 px e sombra deslocada se repete em componentes diferentes.
- **Impacto:** o padrão vira assinatura de template neobrutalista e afasta o ATLAS da referência 01 (planos chapados, sem contorno).
- **Recomendação:** sombra e contorno só para estado ativo ou selecionado. No restante, planos e filetes alinhados à grade.
- **Alternativa:** manter o contorno só na ficha de leitura, que dá peso ao conteúdo.
- **Esforço:** médio.
- **Aceitação:** no máximo um componente por página com sombra dura. Revisão visual contra a referência 01, com a decisão registrada por quem responde pela identidade.

### AUD-09 · Documento de design, tokens, logos e fontes divergem
- **Agentes:** ART-01, ART-12 (em parte), TEC-02 (em parte).
- **Rota/componente:** global. `docs/design/SISTEMA-DE-DESIGN.md:21-40`; `src/styles.scss:49-64`; `public/brand/atlas-logo.svg`; `docs/brand/atlas-identity.svg`.
- **Tipo:** inconsistência/dívida. **Status:** [código] confirmado pelo orquestrador. O documento cita `#FBFAF7`, `#B4231D`, `#1C1C1A` e IBM Plex Sans. O CSS usa `#fbf8f1` e Archivo. Os logos usam `#1c1c1a` e `#b4231d`.
- **Evidência:** a tabela do documento está desatualizada. O wordmark usa Plex Bold, enquanto a interface usa Archivo condensado.
- **Impacto:** a marca não bate com o site. Quem mantém o sistema não sabe qual é a fonte de verdade.
- **Recomendação:** escolher os valores e regenerar SVG e PNG a partir deles. Reescrever a tabela do documento com razões de contraste calculadas. Decidir se o wordmark é redesenhado sobre Archivo.
- **Esforço:** pequeno.
- **Aceitação:** um teste compara os fills dos SVGs aos tokens. O documento lista apenas as famílias carregadas.

---

## 4. Achados de severidade média

### AUD-10 · Home sem acervo, com jargão e seção metodológica discreta
- **Agentes:** UX-04, ART-07, NAV-10 · **Rota:** `/` · **Tipo:** arquitetura da informação · **Status:** [código] e [observado].
- **Evidência:** depois do hero e da busca, só há duas leituras (`home-page.component.html:43-106`). "Recompor o cartaz" (`:23-25`), "Na mesa:" (`:105`), "Escolha uma capa para aproximar a leitura" (`:47`). A seção "Busca e ferramentas" só tem busca. "Como ler" tem título de 0,8 rem em mono (`home-page.component.scss:250-254`) e quatro colunas iguais sem prova visual.
- **Impacto:** o leitor novo não sabe o que o acervo contém. Pessoas, países e regimes ficam só no rodapé. A seção metodológica é a menos visível.
- **Recomendação:** faixa "Explorar por tipo" com 4 a 6 catálogos e contagens, reaproveitando `catalogues`. Trocar "mesa" e "cartaz" por "Escolha uma leitura". Título de "Como ler" no mesmo display das outras bandas. Uma imagem licenciada e legendada acima da dobra. Nas leituras, links para catálogos e verbetes relacionados (NAV-10).
- **Esforço:** pequeno a médio.
- **Aceitação:** a home dá acesso a catálogos além de Marxismo e Liberalismo. Nenhum rótulo visível usa "mesa" ou "cartaz". O título de "Como ler" tem pelo menos 2 rem.

### AUD-11 · Mosaicos aleatórios em vez de composições com autoria
- **Agentes:** ART-08 · **Rota:** home, cabeçalho, rodapé e explorer · **Tipo:** oportunidade de design · **Status:** [código]; [hipótese] não renderizado.
- **Evidência:** 12 motivos com cores sorteadas (`mosaic-tiles.ts:4-16,54-67`). "Recompor o cartaz" randomiza (`home.html:23`).
- **Impacto:** composições repetidas em cada seção perdem peso. A referência 01 usa poucas formas em escala monumental.
- **Recomendação:** 2 ou 3 cartazes compostos por assunto (Marxismo, Liberalismo, Atlas), em grade fixa. A recomposição fica como recurso secundário, com no máximo um mosaico aleatório por página.
- **Esforço:** médio.
- **Aceitação:** cada rota principal tem composição determinística e nomeada.

### AUD-12 · Botões e estados sem sistema
- **Agentes:** ART-10 · **Rota:** transversal · **Tipo:** inconsistência · **Status:** [código].
- **Evidência:** botão primário vermelho com raio de 0,125 rem (`ui-primitives.scss:35-53`) e botão vermelho quadrado na home (`home-page.component.scss:98-106,236-248`). Primário preto que vira vermelho no hover (`explorer.component.scss:154-162`). `gallery-toggle` contornado (`ideology-block.component.scss:34-46`). Seleção em índigo (`ideology-block.component.scss:299-302`). `reading-preview-trigger` mono e contornado (`styles.scss:213-221`). `:hover` sem `@media (hover: hover)` em `explorer.component.scss:97,160` e `ideology-block.component.scss:43`.
- **Impacto:** o usuário não aprende o que é ação, filtro ou seleção.
- **Recomendação:** três tipos. Ação: vermelho cheio. Filtro e seleção: tinta invertida. Navegação: link sublinhado. Estados definidos uma vez em `ui-primitives.scss`.
- **Esforço:** médio.
- **Aceitação:** um grep de `button {` fora de `ui-primitives` retorna só exceções documentadas. Todo `:hover` fica sob `(hover: hover)`.

### AUD-13 · Rota inexistente e rotas aposentadas: silêncio e documentação desatualizada
- **Agentes:** NAV-03, A11Y-03, VIS-05, NAV-11 · **Rota:** `**` (`app.routes.ts:15`); `/rede` e `/comparar` (`exploration.routes.ts:12-14`); `/verbete/<slug inexistente>` (`route-resolvers.ts:38-46`) · **Tipo:** usabilidade/acessibilidade · **Status:** [medido] redirecionamento; [código]; [hipótese] comportamento na hospedagem.
- **Evidência:** `/rota-que-nao-existe` vai para a home sem aviso, e `AGENTS.md` documenta isso. `/verbete/x` mostra "não encontrado" com status 200. `AGENTS.md`, `README.md:41-42` e `docs/product/ESCOPO-ATUAL.md` ainda listam `/rede` e `/comparar` como rotas ativas.
- **Impacto:** um link quebrado vira um soft 404 que esconde o erro. A URL pedida se perde. O leitor de tela não é informado.
- **Recomendação:** página "Página não encontrada" com `h1`, `noindex`, busca e links para as portas, reutilizada por `/verbete` e `/explorar` inexistentes. Manter os redirecionamentos de `/rede` e `/comparar` e atualizar a documentação.
- **Alternativa:** manter o redirecionamento com um aviso transitório "Endereço não encontrado".
- **Esforço:** pequeno a médio.
- **Aceitação:** `/xyz` mostra `h1` "Página não encontrada" e título próprio, sem trocar para `/`. `/verbete/inexistente` usa o mesmo componente. A documentação bate com as rotas.
- **Decisão de produto:** a política de redirecionamento está documentada como intencional. Escolher entre o redirecionamento com aviso e a página própria.

### AUD-14 · Metadados por rota: ramos fixos no shell, canonical relativo, sem Open Graph
- **Agentes:** NAV-02, NAV-12, TEC-04 · **Rota:** transversal · **Tipo:** inconsistência · **Status:** [código]. O impacto em SEO é nulo enquanto o site for `noindex` (`index.html:20`).
- **Evidência:** `app-shell.component.ts:73-90` tem ramos fixos para `/marxismo` e `/liberalismo`. A descrição da rota de Liberalismo (`ideologies.routes.ts:30-31`) é ignorada, e o texto do shell é diferente. `canonical.href = path` é relativo. Faltam `og:url`, `og:type` e `og:image`.
- **Impacto:** a próxima tradição exige editar o shell. SEO e compartilhamento divergem do que a rota declara.
- **Recomendação:** remover os ramos por path e usar `data.metaDescription` com fallback. Definir a origem de produção em configuração, ou não emitir canonical enquanto o site for `noindex`.
- **Esforço:** pequeno.
- **Aceitação:** teste unitário: `meta[name=description]` de `/liberalismo` é igual a `data.metaDescription`, sem condicional por path.

### AUD-15 · Rodapé repete os mesmos destinos e tem controle decorativo falado
- **Agentes:** NAV-04, UX-11 · **Rota:** transversal (`site-footer.component.html:7,10-34,37-51,74`) · **Tipo:** redundância/acessibilidade · **Status:** [código].
- **Evidência:** o convite, a colagem "Continue explorando" e o "Mapa do ATLAS" levam aos mesmos destinos. A home aparece duas vezes. "Composição N de 3" com `role="status"` é decorativo.
- **Impacto:** o leitor de tela encontra a mesma lista duas vezes e um status sem informação.
- **Recomendação:** manter o mapa como única navegação do rodapé. A colagem vira arte com `aria-hidden` ou um CTA único. Remover o status falado.
- **Esforço:** pequeno.
- **Aceitação:** no máximo um `nav` no rodapé, sem destinos repetidos e sem `role="status"` decorativo.

### AUD-16 · Explorer: duas navegações de catálogo, filtros com modos mistos e cinco camadas antes do primeiro resultado
- **Agentes:** NAV-05, UX-08, NAV-09, VIS (coluna "Acervo") · **Rota:** `/conhecimento` e catálogos (`explorer.component.html:14-32,44-112,128-140,186-214`; `knowledge-explorer.ts:19-47`) · **Tipo:** usabilidade · **Status:** [código] confirmado; [observado] a coluna "Acervo" tem um único item; primeira dobra em 1280×800 a verificar.
- **Evidência:** "Catálogos do acervo" (quatro grupos) e "Categorias de registro" (por tipo) se sobrepõem. Pessoas, obras e ideologias são recortes do índice de entidades. O select de situação aplica na mudança, a busca só no envio e o tipo por link. "Situação editorial" é jargão. O título de `fontes` não é link. `porPagina` rola ao topo, porque não tem `fragment="resultados"`.
- **Impacto:** o mesmo domínio aparece em dois eixos. A `nav` interna funciona como segunda barra de navegação.
- **Recomendação:** um eixo visível por tipo. Catálogos com perfil próprio (países, regimes, fontes) permanecem. Pessoas e obras redirecionam para `/entidades?tipo=`. Todos os filtros se comportam do mesmo modo. "Estado da revisão" no lugar de "Situação editorial". `porPagina` no rodapé da lista, com `fragment="resultados"`.
- **Esforço:** médio.
- **Aceitação:** cada tipo é alcançável por um eixo visível. O número de landmarks `nav` cai. Os filtros se comportam do mesmo modo. Em 1280×800, o primeiro resultado aparece na primeira dobra.

### AUD-17 · Contexto de origem se perde entre verbetes
- **Agentes:** NAV-06 · **Rota:** `/verbete/:slug` · **Tipo:** usabilidade · **Status:** [código] confirmado.
- **Evidência:** `record.component.html:54` monta os links de conexão sem `queryParams`. Por isso "Voltar aos resultados" (`record.component.html:4`) some depois de seguir uma conexão. `explorer.component.html:157` passa `origem` só na entrada.
- **Impacto:** só o botão Voltar do navegador restaura o caminho.
- **Recomendação:** `queryParamsHandling: 'preserve'` ou `queryParams: { origem }` nos links de conexão.
- **Esforço:** pequeno.
- **Aceitação:** de `/entidades?q=x`, abrir A e seguir uma conexão para B. B mostra "Voltar aos resultados" apontando para `/entidades?q=x`.

### AUD-18 · Diálogo de contexto com três controles de retorno e link permanente de `href` simples
- **Agentes:** UX-06 · **Rota/componente:** `appKnowledgeContext` (`knowledge-context.component.html:8-29,47,62-103`) · **Tipo:** usabilidade · **Status:** [código]; [hipótese] recarga completa em `[href]`, a verificar no navegador.
- **Evidência:** "Voltar à leitura ×", a trilha clicável e "← Contexto anterior" competem. A página permanente usa `[href]`. O cartão de conexão tem "abre aqui →" e várias linhas.
- **Impacto:** três retrocessos concorrentes. Possível recarga completa da aplicação.
- **Recomendação:** a trilha como única navegação interna. Botão "Fechar" (× e texto). `routerLink` na página permanente.
- **Esforço:** pequeno.
- **Aceitação:** um controle de retorno interno e um "Fechar". Abrir a página permanente não recarrega o documento.

### AUD-19 · Página de registro: navegação circular e dados técnicos à vista
- **Agentes:** UX-07, NAV-07 · **Rota:** `/verbete/:slug`, `/explorar/...` · **Tipo:** usabilidade/linguagem · **Status:** [código] confirmado.
- **Evidência:** "Link permanente" aponta para a própria página (`record.component.html:16`). "Busca universal" e "Catálogo de entidades" são termos internos (`:6-7`). Há um bloco `@if` vazio (`:8`). Id e "Revisão do registro" aparecem na ficha lateral (`:103-107`). Os breadcrumbs mostram "Início > <título>" sem o catálogo pai (`exploration.routes.ts:31-35`; `breadcrumbs.component.ts:29-53`). Em `ideology-page.component.html:10` há um "← Página inicial" além do breadcrumb.
- **Impacto:** o leitor leigo vê dados de curadoria. As migalhas não mostram o caminho.
- **Recomendação:** "Copiar link" no lugar do link para a própria página. "Buscar no acervo". Id e revisão em `details` "Dados do registro". Remover o bloco vazio. Breadcrumb com o catálogo pai ("Início > Pessoas > Adam Smith"). Remover o back-link duplicado da ideologia.
- **Esforço:** pequeno.
- **Aceitação:** nenhum link do registro aponta para si mesmo. `/verbete/x` mostra "Início > <catálogo> > <título>".

### AUD-20 · "Revisão pendente" repetida em quase todo componente
- **Agentes:** UX-05 · **Rota/componente:** leituras e registros (`ideology-page.component.html:53`; `ideology-block.component.html:133,285`; `ideology-atlas.component.html:9,182`; `value-debate.component.html:10,136`; `site-footer.component.html:80`) · **Tipo:** redundância · **Status:** [código] confirmado.
- **Impacto:** ruído. Quando algum conteúdo estiver de fato revisado, a diferença não aparece.
- **Recomendação:** declarar o estado uma vez, no topo de cada leitura, e marcar nos componentes só a exceção. Não remover a honestidade editorial, só concentrá-la. `AGENTS.md` exige diferenciar fato, interpretação e hipótese.
- **Esforço:** pequeno a médio.
- **Aceitação:** o estado global aparece uma vez por página. Rótulos por item só aparecem quando diferem do estado global.

### AUD-21 · Termos em linha: prévia some em telas estreitas e rótulo substitui o texto visível
- **Agentes:** UX-03, RSP-11 · **Rota/componente:** `knowledge-text` (texto corrido) · **Tipo:** usabilidade/acessibilidade · **Status:** [código] confirmado; [hipótese] comportamento de toque.
- **Evidência:** `.term-preview` vai a `display: none` em até 650 px (`knowledge-text.component.scss:110-114`). No toque, o clique abre o diálogo sem aviso (`:84-89`). O `aria-label` "texto: abrir contexto de Conceito" substitui o texto visível (`knowledge-text.component.html:8`), o que viola WCAG 2.5.3. Entre 651 e 1024 px, com toque, a prévia flutuante e o diálogo podem abrir juntos.
- **Impacto:** o leitor de celular não sabe o que vai abrir. O nome acessível difere do visível. No tablet, abrem duas superfícies.
- **Recomendação:** no toque, definição curta no topo do diálogo. `aria-label` começando com o texto visível. Prévia flutuante só com `(hover: hover) and (pointer: fine)`.
- **Esforço:** médio.
- **Aceitação:** em 390 px, tocar um termo mostra a definição. O nome acessível começa com o texto visível. O axe não reporta `label-content-name-mismatch`. No tablet de toque, um toque abre só uma superfície.

### AUD-22 · Texto alternativo genérico, legenda pequena e tratamento fotográfico
- **Agentes:** A11Y-04, ART-06, RSP-06 (em parte) · **Rota/componente:** `knowledge-context.component.html:34`; `ideology-block.component.html:139,361`; `ideology-page.component.html:38`; `licensed-asset.component.html:4`; `ideology-media.scss:11,14-17`; `ideology-page.component.scss:86,89,271` · **Tipo:** acessibilidade/design · **Status:** [código] confirmado; a legibilidade é estimativa.
- **Evidência:** "Imagem associada a X", "Imagem de X" e "Retrato de X" são rótulos, não descrições. A legenda tem 0,6 rem (cerca de 9,6 px) em até 750 px. `grayscale(1)` e `filter: none` só existem em hover e foco, então não se aplicam em toque. O recorte é fixo por `object-position`.
- **Impacto:** o leitor de tela não sabe o que a imagem mostra. O crédito é ilegível no celular. Pinturas são dessaturadas como se fossem fotografias.
- **Recomendação:** campo `alt` descritivo no schema Zod, com fallback. Imagens decorativas mantêm `alt=""`. Legenda de pelo menos 0,75 rem, com número de figura, crédito e licença. Sem filtro em obras de arte. Dessaturação só em fotografia documental, sem depender de hover.
- **Esforço:** médio (editorial).
- **Aceitação:** todo registro de mídia publicado tem `alt` descritivo ou está marcado como decorativo. Legenda de pelo menos 12 px em todos os breakpoints.

### AUD-23 · Alvos de toque e textos abaixo do mínimo
- **Agentes:** RSP-06, VIS-03 · **Rota/componente:** transversal; `/marxismo`, `/liberalismo`, `/fontes` · **Tipo:** acessibilidade · **Status:** [medido] (VIS-03) e [código].
- **Evidência (medido):** links de fonte com 15 px de altura (por exemplo "Karl Marx — O capital, volume I", 187×15). Botões de navegação com 40 px. **Evidência (código):** `.index-group` e botões mobile a 0,68 rem (`reading-index.component.scss:91,299`); `.action-cue` a 0,7 rem (`ideology-atlas-interaction.scss:12`); `.first-step` a 0,7 rem (`reading-path.component.scss:111`); links do índice com 36 px (`reading-index.component.scss:100`); filtros do roteiro com 2,5 rem (`reading-path.component.scss:16`); `.context-trail button` com 2 rem (`knowledge-context.component.scss:71`); `.carousel-bar` com 1,5 rem (`card-carousel.component.scss:142`).
- **Impacto:** toque impreciso, sobretudo em tablet.
- **Recomendação:** piso de 0,75 rem para texto. `min-height: var(--control-min-size)` para controles, com `--touch-min`. Padding vertical nas linhas de fonte.
- **Esforço:** pequeno a médio.
- **Aceitação:** nenhum controle interativo com menos de 44 px em 390 e 768 px (ou menos de 24 px com espaçamento). Linhas de fonte com pelo menos 24 px.

### AUD-24 · Breakpoints e escala tipográfica fragmentados
- **Agentes:** RSP-04 (em parte), RSP-05 (breakpoints), ART-04, ART-11 · **Rota/componente:** transversal · **Tipo:** dívida técnica · **Status:** [código] verificado pelo orquestrador por grep.
- **Evidência:** cerca de 25 valores distintos de `@media`, em px e rem (750, 760, 761, 650, 672, 1000, 1024, 1100 e outros). Há pares que cortam o mesmo componente em pontos diferentes. Mais de 90 `font-size` literais, com quase-duplicatas (0,75; 0,78; 0,8; 0,82; 0,85; 0,88; 0,9 rem). Oito pesos em uso (400 a 800). Os tokens `--text-*` têm nove usos. Não há nenhum `@container`.
- **Impacto:** comportamento imprevisível entre viewports. O título expressivo aparece só em Home e Ideologias. Conhecimento e Rede parecem outro produto.
- **Recomendação:** três ou quatro breakpoints tokenizados. Container queries para componentes de coluna. Escala de seis a sete degraus e quatro pesos. Um mixin `display` para h1 e h2 de página.
- **Esforço:** médio.
- **Aceitação:** `font-size` literal em componentes cai a quase zero, fora de exceções comentadas. O h1 é idêntico em Home, Ideologia e Explorer.

### AUD-25 · Medida de leitura ausente em telas largas
- **Agentes:** RSP-05, medição do VIS · **Rota/componente:** `/marxismo`, `/liberalismo`, verbete · `ideology-page.component.scss:177-182`; tokens `styles.scss:115-117` sem uso · **Tipo:** usabilidade · **Status:** [medido] corpo do verbete com cerca de 86 caracteres por linha (coluna de 688 px); lead do Marxismo com cerca de 81 (971 px). [hipótese] cerca de 100–115 caracteres por linha em 1440 px no capítulo.
- **Recomendação:** `.chapter-narrative p { max-width: var(--measure-reading) }` (72ch), e os tokens nos demais textos.
- **Esforço:** pequeno.
- **Aceitação:** no máximo 78 caracteres por linha em 1024 e 1440 px (medido).

### AUD-26 · Retrato de abertura espremido no mobile
- **Agentes:** RSP-07, VIS-04 · **Rota/componente:** abertura de `/marxismo` e `/liberalismo` (`ideology-page.component.scss:249-277`) · **Tipo:** usabilidade · **Status:** [observado] em 390 px; largura de cerca de 105 px (estimada).
- **Evidência:** grade `minmax(0,1fr) 105px` com `display: contents`. O título fica numa coluna de cerca de 230 px. Legenda e crédito quebram em várias linhas.
- **Recomendação:** abaixo de 600 px, retrato empilhado abaixo do lead, com altura limitada (como já ocorre em até 360 px, `:300-308`).
- **Esforço:** pequeno.
- **Aceitação:** em 390 px, o cartão tem pelo menos 280 px ou fica abaixo do lead. Nenhum título quebra no meio da palavra.

### AUD-27 · Cronologia de vidas perde datas e nomes no mobile
- **Agentes:** RSP-08 · **Rota/componente:** `era-chart` (`/marxismo`, `/liberalismo`) (`era-chart.component.scss:170-181,294-320`) · **Tipo:** usabilidade · **Status:** [código] confirmado.
- **Evidência:** o nome é truncado, e datas e rótulos de marcos somem até 760 px. Metade dos ticks também some.
- **Recomendação:** lista cronológica compacta, com nome completo e anos. É o padrão já usado em `historical-visualizations.component.scss:302-312`.
- **Esforço:** médio.
- **Aceitação:** em 390 px, cada pessoa mostra nome e anos sem toque extra.

### AUD-28 · Grafo do atlas: alturas e tamanhos de nó inconsistentes entre 672 e 1100 px
- **Agentes:** RSP-09 · **Rota/componente:** `ideology-atlas` (`ideology-atlas.component.scss:232-239`; `ideology-atlas-visual.scss:207-217`; `ideology-atlas-interaction.scss:68-78`) · **Tipo:** bug provável · **Status:** [hipótese] a validar.
- **Evidência:** o canvas tem 28 rem entre 929 e 1100 px, com nós `clamp(6rem, 13vw, 8rem)`. Abaixo de 672 px o canvas some e aparece o texto alternativo. A `node-preview` de 13 rem pode ser cortada por `overflow: hidden`.
- **Impacto:** em 768 px, dezenas de nós de cerca de 100 px posicionados em % podem se sobrepor. A prévia pode ser cortada.
- **Recomendação:** um só `min-height` e uma escala de nó por container. Texto alternativo a partir de 58 rem, ou abrir o painel de leitura no toque.
- **Esforço:** médio.
- **Aceitação:** em 768 e 1024 px, nenhum par de nós se sobrepõe em mais de 10% da área.

### AUD-29 · Scroll suave global e rolagem na troca de rota
- **Agentes:** MOT-01 (rebaixado de alta para média) · **Rota/componente:** todas · `styles.scss:144`; `app.config.ts:22`; `styles.scss:258` (o modo teclado zera animação e transição, mas não o scroll) · **Tipo:** usabilidade · **Status:** [código] confirmado; [hipótese] efeito visual, não validado com a aba oculta.
- **Evidência:** `html { scroll-behavior: smooth }` é global. A restauração de rota e as âncoras passam pelo `scrollTo` do navegador, que herda o smooth. No modo teclado a rolagem continua suave.
- **Impacto:** ao trocar de página, a tela pode deslizar do ponto anterior até o topo, o que pode parecer atraso. Âncoras longas rolam de forma não controlada.
- **Recomendação:** remover o smooth global. Aplicar `behavior: 'smooth'` só em ações locais (setas do carrossel, "voltar ao capítulo"), com guarda `no-preference`.
- **Alternativa:** `scrollPositionRestoration: 'top'` com `scrollTo({ behavior: 'instant' })` no `NavigationEnd`.
- **Esforço:** pequeno.
- **Aceitação:** de `/` para `/marxismo` com `scrollY` em 2000: `scrollY === 0` no primeiro frame. `getComputedStyle(document.documentElement).scrollBehavior === 'auto'`.

### AUD-30 · Revelação por scroll oculta conteúdo na impressão, na busca da página e antes do foco
- **Agentes:** MOT-02 · **Rota/componente:** páginas com `appReveal` (`reveal.directive.ts:23-26`; `styles.scss:282-302`) · **Tipo:** acessibilidade · **Status:** [código] confirmado; o projeto não tem nenhum `@media print` (verificado); efeito [hipótese].
- **Evidência:** tudo abaixo da dobra recebe `is-pending`, com opacity 0, deslocamento de 1,5 rem e filhos `[data-stagger]` ocultos. O observer não tem timeout de segurança. Não há revelação por `focus-within`.
- **Impacto:** ao salvar como PDF ou imprimir, blocos saem transparentes. Ctrl+F ou Tab para um bloco oculto mostra o conteúdo com atraso de 480 ms.
- **Recomendação:** `@media print` que força opacidade 1 e `transform: none`. `.atlas-reveal-item:focus-within` deixa o conteúdo visível. Duração até `--motion-standard`, e deslocamento de 0,75 rem.
- **Esforço:** pequeno.
- **Aceitação:** `emulateMedia('print')` mostra todos os blocos com opacidade 1. Tab para um link dentro de um item pendente o torna visível em menos de 50 ms.

### AUD-31 · Transição de rota longa e preferência de movimento não unificada
- **Agentes:** MOT-03, MOT-04, MOT-06 · **Rota/componente:** transição de rota (`styles.scss:306-330`); carrossel (`card-carousel.component.ts:235-238`) · **Tipo:** usabilidade/acessibilidade · **Status:** [código] confirmado.
- **Evidência:** a saída dura 240 ms. A entrada usa `clip-path` de 480 ms em tela inteira, e entre 240 e 480 ms o conteúdo novo fica parcialmente recortado. Cada navegação custa cerca de 0,5 s. O `glide()` do carrossel só consulta `prefers-reduced-motion`, e não a classe `html.atlas-reduced-motion` aplicada pelo botão "Reduzir movimento" (`ideology-reading.component.ts:137`). A proteção está em dois lugares (media query e classe), e o zeramento por `0.01ms !important` não alcança `clip-path`.
- **Impacto:** a navegação frequente fica lenta. Quem ativou "Reduzir movimento" ainda vê o carrossel rolar suavemente.
- **Recomendação:** saída de 120 ms só com opacity. Entrada de 200 ms só com opacity. Total de até 320 ms. Uma função `prefersReducedMotion(doc)` que combine media query e classe, usada no carrossel, na diretiva reveal e em `app.config.ts`.
- **Alternativa:** remover a cortina e manter só o cabeçalho persistente (`view-transition-name: atlas-header`).
- **Esforço:** pequeno.
- **Aceitação:** o conteúdo novo fica 100% opaco em até 250 ms. Com `html.atlas-reduced-motion`, clicar em "próximo" muda `scrollLeft` no mesmo frame.

### AUD-32 · Repintura de fundo e tom, e listeners que medem layout a cada frame
- **Agentes:** MOT-05, MOT-12 · **Rota/componente:** `/marxismo`, `/liberalismo`, `/` (`ideology-reading.component.scss:5-6`; `home-page.component.scss:4,6`; `home-page.component.ts:98-110`; `ideology-reading.component.ts:65-94`) · **Tipo:** dívida técnica · **Status:** [hipótese], a medir.
- **Evidência:** `--tint` (propriedade registrada) e `background-color` são animados em 480 ms no host. `getBoundingClientRect` roda em todas as seções a cada frame de scroll.
- **Impacto:** a troca de tom e a leitura forçada de layout podem causar engasgos em aparelho fraco. Não roda no compositor.
- **Recomendação:** `IntersectionObserver` por seção para o estado ativo. Crossfade de uma camada fixa com opacity. Manter a medição só para a barra de progresso.
- **Esforço:** médio.
- **Aceitação:** trace em CPU 4x sem "Recalculate Style" ou "Paint" acima de 8 ms por frame durante a troca de tom.

### AUD-33 · Título vazado em itens não selecionados da home
- **Agentes:** ART-09 · **Rota/componente:** `/`, seletor de leituras (`home-page.component.scss:173-176,295-297`; `home-page.component.html`/`scss:321-327`) · **Tipo:** acessibilidade/usabilidade · **Status:** [código]; contraste estimado de cerca de 1,2:1 no hover, a validar.
- **Evidência:** `color: transparent` com `-webkit-text-stroke: 1.5px`. O hover só troca o fundo para `--color-surface-subtle`. Em até 48 rem o seletor vira `<select>`.
- **Impacto:** a leitura não selecionada parece desativada. Em alto contraste, o texto pode sumir.
- **Recomendação:** título cheio em tinta, com diferença de peso ou escala para o selecionado. Indicador por forma e posição.
- **Esforço:** pequeno.
- **Aceitação:** texto não selecionado com pelo menos 4,5:1. Estados distinguíveis sem cor e sem hover.

### AUD-34 · Fontes em TTF sem compressão e preload da fonte errada
- **Agentes:** VIS-06, TEC-02, ART-12 · **Rota/componente:** todas · `public/fonts/` · `index.html:14`; `styles.scss:8-44` · **Tipo:** desempenho · **Status:** [medido] tamanhos no servidor de desenvolvimento, que não representa produção.
- **Evidência:** `SourceSerif4.ttf` com 1,18 MB, `IBMPlexSans.ttf` com 525 KB e `IBMPlexMono-Regular.ttf` em TTF. A Archivo está em WOFF2, com 90 KB. O preload de `SourceSerif4.ttf` vale para todas as rotas. `font-display: optional` nas fontes em TTF e `swap` na Archivo.
- **Impacto:** carregamento pesado. Em rede lenta, `optional` mantém a reserva e a tipografia editorial aparece de forma intermitente.
- **Recomendação:** converter para WOFF2 com subset latin. Carregar só os pesos usados. Preload só para a fonte usada acima da dobra. Política única de `font-display`, documentada. Se o IBM Plex Sans for só fallback, removê-lo.
- **Esforço:** pequeno.
- **Aceitação:** nenhum `.ttf` em `public/fonts`. Fontes somadas com menos de 400 KB. Política documentada.

### AUD-35 · Cobertura de testes não cobre foco de rota, acessibilidade por rota nem estados
- **Agentes:** A11Y (testes), TEC-03 · **Rota/componente:** transversal · `e2e/*.spec.ts`; `src/app/shared/ui/ui-contrast.spec.ts:4` · **Tipo:** dívida técnica · **Status:** [código] confirmado.
- **Evidência:** há axe em `/marxismo`, `/liberalismo` e em três páginas com movimento reduzido (`quality.spec.ts`, `pages.spec.ts`). Carrossel e diálogos têm teste. Não há teste de foco na troca de rota. `ui-contrast.spec.ts` lê só `styles.scss`, então cores literais dos componentes ficam fora. Não há spec de `site-footer`, `home-page`, `explorer`, `record`, `notice`, `breadcrumbs` nem de `KnowledgeContextDirective`. Há 16 ocorrências de teclado em seis arquivos. Não há teste com leitor de tela, zoom de 400% nem `forced-colors`.
- **Impacto:** regressões de foco e de contraste passam despercebidas nas rotas sem cobertura.
- **Recomendação:** axe em todas as rotas públicas, incluindo catálogos e perfis. Teste de foco na troca de rota. Contraste estendido aos componentes. Spec do `KnowledgeContextDirective`. Roteiro manual com leitor de tela e zoom de 200% e 400%.
- **Esforço:** médio.
- **Aceitação:** `npm run test:e2e` cobre todas as rotas públicas no axe e falha quando a rota troca sem mover o foco.

### AUD-36 · Rede e Conhecimento com cara de painel mestre-detalhe
- **Agentes:** ART-05 (rebaixado de alta para média) · **Rota/componente:** componente `evidence-network` (`evidence-network.component.scss:28-70`); `/rede` redireciona para `/conhecimento` · **Tipo:** oportunidade de design · **Status:** [código]; a avaliação vale para o componente, onde quer que ele seja usado (a verificar).
- **Evidência:** lista com `max-height` à esquerda e painel à direita, com `border-block`. Não há SVG nem composição espacial. Os botões ficam fora da grade de botões do sistema.
- **Impacto:** a tela mais parecida com dashboard do site. A promessa "tudo se liga" não aparece visualmente.
- **Recomendação:** mapa relacional com nós posicionados e legenda, mantendo a lista como alternativa operável por teclado. Contraste de 3:1 nas arestas.
- **Alternativa:** índice-legenda, com numeração e linhas de chamada.
- **Esforço:** grande.
- **Aceitação:** composição espacial com legenda. Lista operável por teclado. Arestas com pelo menos 3:1.
- **Decisão de produto:** a rota `/rede` redireciona, então a prioridade depende de a rota voltar a existir.

---

## 5. Achados de severidade baixa

| ID | Título | Agentes | Rota/componente | Evidência resumida | Recomendação | Esforço |
|---|---|---|---|---|---|---|
| AUD-37 | Carrossel: "Anterior" habilitada no início e região focável sem rolagem | VIS-08, A11Y-05 | `/marxismo` | Seta com `aria-disabled="false"` com `scrollLeft` 8; `tabindex="0"` fixo (`card-carousel.component.html:50-52`) | `aria-disabled` no início e `tabindex` só quando rolável | Pequeno |
| AUD-38 | Diálogo "Karl Marx" não modal, com ARIA parcial | VIS-07 | `/marxismo` | Gatilho com `aria-expanded` sem `aria-controls`; diálogo com `aria-modal="false"` | `aria-haspopup` e `aria-controls`, ou modal com foco preso | Médio |
| AUD-39 | Rótulo da linha do tempo passa da borda em 768 px | VIS-09 | `/marxismo` | Rótulo "1917 · Revolução Russa de 1917" com right em 811 px (viewport de 768) [medido] | Limitar a largura ou alinhar à borda | Pequeno |
| AUD-40 | Texto promete tabela que não existe | VIS-10 | `/marxismo`, "Polêmicas documentadas" | Texto e `desc` do SVG dizem "a tabela a seguir"; 0 elementos `<table>` [medido] | Corrigir o texto ou criar a tabela | Pequeno |
| AUD-41 | Âncoras e o botão "voltar" | VIS-11 | `/marxismo` | Após clicar em `#origens`, `history.length` não mudou e "voltar" saiu da página [hipótese, aba oculta] | Verificar o uso de fragmento e `replaceUrl`; garantir entrada no histórico. Verificar antes de corrigir | Médio |
| AUD-42 | Página `/fontes` muito longa | VIS-12 | `/fontes` | 31.807 px de altura, 128 subtítulos e 183 controles [medido] | Índice interno por tipo e grupos recolhidos | Médio |
| AUD-43 | Menu mobile: o foco pode sair do painel sem fechá-lo | RSP-12 | `site-header`, até 640 px | Fecha com Escape, toque fora e navegação, mas Tab pode sair do painel | Fechar em `focusout` quando o foco sai de `nav` e do botão | Pequeno |
| AUD-44 | Home: `.method ol` em duas colunas em 390 px | RSP-10 | `/` | Não há regra de uma coluna em até 40 rem (`home-page.component.scss:257,307-309`) | Uma coluna em até 40 rem | Pequeno |
| AUD-45 | Região de carregamento criada junto com o texto | A11Y-06 | `ideology-page.component.html:141-158` | `section[aria-live]` nasce com o texto; leitores costumam não anunciar | Contêiner `role="status"` permanente; trocar só o texto | Pequeno |
| AUD-46 | CSP com `'unsafe-inline'` e `'unsafe-hashes'` | TEC-05 | `public/_headers:7`; `scripts/security-headers.mjs:23-40` | Hashes para o CSS crítico, com `onload="this.media='all'"` | Avaliar `inlineCritical: false` ou documentar a exceção | Pequeno |
| AUD-47 | Movimento sem tokens: easing e stagger soltos | MOT-07, MOT-08, MOT-09, MOT-10, MOT-11 | Vários | 180 ms sem token (`value-debate.component.scss:162-163`); `ease` (`ui-primitives.scss:51-52`); stagger de 60 ms e 70 ms (`ideology-exploration.scss:374`; `styles.scss:297`); `left` e `width` na faixa de época (`era-chart.component.scss:130-132`); snap sem `scroll-snap-stop` (`card-carousel.component.scss:100,130`) | `--ease-standard`; `--stagger-step: 60ms`; `transform` na faixa de época; avaliar `scroll-snap-stop: always` | Pequeno |
| AUD-48 | Cores hexadecimais e rgb fora de tokens | TEC-03, ART-11 | 48 ocorrências em 11 arquivos SCSS | `explorer` (4), `era-chart` (4), `ideology-atlas-visual` (3); `#fff` em seis arquivos; `::ng-deep` na home (`home-page.component.scss:86-97`); blocos `@media` vazios (`ui-primitives.scss:32-33,170-173`) | Migrar para tokens e remover código morto | Pequeno |
| AUD-49 | Seta ↗ em links internos | UX-09 | Cabeçalho e rodapé (`site-header.component.html:39,52,64`; `site-footer.component.html:7`) | "Marxismo ↗" é rota interna | Reservar ↗ para links externos | Pequeno |
| AUD-50 | Debate de valor: o filtro troca só dois parágrafos, e o texto está no template | UX-10 | `value-debate.component.html:32-64,84-103,195-197` | Três controles de rádio para duas frases; texto e link fixos no template | Mostrar os dois vínculos rotulados; mover conteúdo para os dados | Pequeno |
| AUD-51 | Exercício de estudo com link fixo para `/marxismo#fontes` | NAV-08 | `study-exercise.component.html:16`; `value-debate.component.html:195-197` | O componente recebe `origin`, mas o link não o usa | Destino por input ou contrato do dossiê | Pequeno |
| AUD-52 | Índice de leitura com rótulos pouco claros | UX-12 | `reading-index.component.html:4,49,52-59`; `ideology-page.component.html:15,73` | "Percurso 42%", "← Ponto anterior", "~N min" repetido | "Você leu 42%", "Voltar de onde veio"; controle de movimento junto ao cabeçalho do índice | Pequeno |
| AUD-53 | Imagem licenciada sem `width` e `height` | TEC-01 | `licensed-asset.component.html:4` | CLS medido zero em `/marxismo`, `/liberalismo` e `/` (documentação do projeto); hipótese para rotas de exploração | Dimensões do registro de mídia ou `aspect-ratio` | Pequeno |
| AUD-54 | Código órfão e documentação obsoleta | NAV-11 | `route-resolvers.ts:7-27`; `docs/architecture/EXPLORACAO-CONTEXTUAL.md:7`; `docs/quality/REDE-E-COMPARADORES.md:10` | Resolvers sem uso fora do arquivo; docs citam tradução e `analysis` | Atualizar ou remover | Pequeno |

---

## 6. Pontos de divergência

### 6.1 Entre os agentes

1. **Carrossel:** a preferência do usuário (todo scroll horizontal vira carrossel) se choca com a redução de controles (AUD-05). **Resolução proposta:** manter o carrossel e remover as duplicações ao lado dele (botões "A → B" e lista repetida).
2. **Grafo:** é entrada no desktop (UX-01, RSP-09), mas no mobile a lista é a principal (RSP-01), e a Rede sugere um mapa relacional (ART-05). **Resolução:** grafo como entrada no desktop, lista como principal no mobile, mapa em Rede só se a rota voltar a existir. A diferença é de contexto, não contradição.
3. **Contorno e sombra (AUD-08):** ART-02 vê neobrutalismo, e a leitura visual vê "forte identidade". **Resolução:** o relatório sugere restringir, não remover. A decisão é de direção de arte.
4. **Mosaicos (AUD-11):** ART-08 pede composição determinística; a leitura visual elogia o cartaz como identidade. **Resolução:** manter o cartaz e tirar a aleatoriedade das rotas principais.
5. **Transição de rota (AUD-31):** MOT-03 pede encurtar ou remover a cortina. **Resolução:** encurtar. A cortina só se justifica se o cabeçalho persistente for o único elemento animado.
6. **Revelação progressiva (AUD-30):** a revelação é uma qualidade a preservar, mas oculta conteúdo na impressão. **Resolução:** manter, com fallbacks.
7. **Revisão pendente (AUD-20):** UX-05 pede concentrar, enquanto `AGENTS.md` exige diferenciar fato, interpretação e hipótese. **Resolução:** concentrar, não remover.
8. **Rede (AUD-36):** ART-05 avaliou o componente, mas `/rede` redireciona. **Resolução:** a avaliação vale para o componente. A prioridade depende da rota.

### 6.2 Entre achados e premissas do briefing e do projeto

1. **"Navegação principal na lateral esquerda"** (briefing). O código usa um cabeçalho horizontal com três portas (`site-header.component.html:23-66`). A única lateral esquerda é o índice de leitura, em `/marxismo` e `/liberalismo`, e é navegação interna. **Decisão necessária:** manter o cabeçalho e revisar a premissa, ou criar uma lateral global (o que muda a arquitetura de navegação e o cabeçalho móvel). **Recomendação:** manter o cabeçalho e registrar a premissa como revisada.
2. **"As rotas atuais incluem `/rede` e `/comparar`"** (`AGENTS.md`). Hoje são redirecionamentos (AUD-13).
3. **"Sem segunda barra de navegação"** (briefing). A `nav` de catálogos do explorer e o índice de leitura podem ser lidos como uma segunda barra (AUD-16). **Decisão** sobre o que conta como navegação.
4. **"Páginas editoriais não viram dashboards"** (briefing). O atlas e o debate de valor se aproximam de painéis de controle (AUD-05, AUD-50).
5. **"Sem efeitos que atrapalhem a leitura"** (briefing). A cortina de rota atrasa a leitura (AUD-31). A premissa é cumprida só parcialmente.

---

## 7. Roadmap em fases

**Fase 0 · Validar (1 a 2 dias).**
- Repetir, com a aba visível, as medições que dependem de `requestAnimationFrame`, transições, revelação, smooth scroll e carrossel arrastado (AUD-29, AUD-30, AUD-31, AUD-32).
- Testar com leitor de tela (AUD-01, AUD-13, AUD-22, AUD-45).
- Testar com toque real em tablet (AUD-03, AUD-04, AUD-21, AUD-23).
- Decidir as três questões de produto: navegação lateral ou cabeçalho (6.2.1), política de rotas inexistentes (AUD-13) e a linguagem de contorno e sombra (AUD-08).

**Fase 1 · Correções de baixo esforço e alto impacto (cerca de uma semana).**
- AUD-01, AUD-02, AUD-29, AUD-30, AUD-31 (parte CSS).
- AUD-13 (página de não encontrado, se aprovada), AUD-14, AUD-17, AUD-18.
- AUD-09 (fonte de verdade de tokens e logos) e AUD-34 (fontes em WOFF2).
- Itens baixos: AUD-37, AUD-39, AUD-40, AUD-43, AUD-44, AUD-45.

**Fase 2 · Sistema de tokens e controles (duas a três semanas).**
- AUD-24 (breakpoints e escala), AUD-25 (medida), AUD-47 e AUD-48 (movimento e cor fora de tokens).
- AUD-07 (vermelho), AUD-12 (controles), AUD-06 (vocabulário de ação).
- AUD-08 (contorno e sombra), depois da decisão da Fase 0.
- AUD-33 (título vazado) e AUD-35 (testes de rota e acessibilidade).

**Fase 3 · Leitura e mobile (três a quatro semanas).**
- AUD-24 precisa vir antes de AUD-03, AUD-04, AUD-27 e AUD-28, para não refazer o trabalho nos breakpoints.
- AUD-05 (controles repetidos), AUD-03 (grafo mobile), AUD-04 (grade), AUD-26 (retrato), AUD-27 (cronologia), AUD-28 (atlas), AUD-23 (alvos), AUD-21 (termos).
- AUD-16 (explorer), AUD-19 (registro), AUD-15 (rodapé), AUD-18 (diálogo), AUD-20 (revisão pendente).
- AUD-22 (mídia com `alt` e legenda), AUD-10 (home), AUD-32 (repintura).

**Fase 4 · Identidade e cartografia (decisão de produto, esforço grande).**
- AUD-11 (cartazes com autoria), AUD-36 (Rede como mapa), placas de atlas (AUD-22) e a serif de display (2.4).
- Depende da decisão de AUD-08 e da confirmação de que `/rede` volta a existir.

**Dependências entre melhorias:**
- AUD-09 antes de qualquer mudança visual, porque ele define a fonte de verdade.
- AUD-01 antes de AUD-35, porque os testes de foco dependem do comportamento novo.
- AUD-07 antes de AUD-12, porque os estados dependem das cores com função.
- AUD-22 começa pelo schema Zod antes da edição do conteúdo.

---

## 8. Validação pendente

Estas afirmações ainda não estão confirmadas:

- **Com aba visível:** rAF, transições, revelação, smooth scroll e carrossel arrastado (AUD-29 a AUD-32).
- **Com leitor de tela (NVDA ou VoiceOver):** AUD-01, AUD-13, AUD-22, AUD-45.
- **Em toque real e tablet:** AUD-03, AUD-04, AUD-21, AUD-23.
- **Zoom de 200% e 400%** e reflow.
- **Build de produção** e status HTTP real de rotas desconhecidas (AUD-13).
- **Visual de `/paises`, `/rede`, `/comparar`, `/fontes` e `/verbete` em 390 e 768 px**, e o fim de `/liberalismo` em 1440 px. A captura cobriu só medições nessas rotas.
- **INP e LCP reais.** A documentação do projeto mede só em laboratório (`docs/quality/MOTION-PERF-ACESSIBILIDADE.md`).
- **Efeito visual de AUD-02 e AUD-03** no celular, com captura.

---

## 9. Registro da auditoria

- **Arquivos alterados:** apenas `docs/audits/AUDITORIA-UX-UI-2026-11-02.md`, que ainda não está commitado.
- **Subagentes:** seis de análise (somente leitura) e um de captura visual, com cerca de 190 arquivos lidos e 23 capturas.
- **Comandos executados pelo orquestrador:** `npm run typecheck` (exit 0); `npm test` (exit 0; 36 arquivos e 170 testes); `npm run lint` (exit 0). Dev server `ng serve` na porta 4303, parado ao fim.
- **Git:** baseline `f99d01a` na branch `feat/atlas-carrosseis-e-exploracao`. `master` está em `79f4dbc`. Não há issues criadas.

---

## 10. Status de implementação (02/11/2026)

Commits em `master`: `a4baa60`, `e8a9dc6`, `e9f9bca` (fases anteriores); `e3b8aa1`, `6d8df57` (fase 3); `bab87b6` (fase 2); `515a8f2` (baixos); `51ef687` e `8115b23` (lotes seguintes).

Legenda: **feito**, **parcial** (o que falta está descrito), **pendente** (sem implementação, com motivo), **decidido** (decisão registrada, sem mudança de código).

| ID | Status | Nota |
|---|---|---|
| AUD-01 | feito | Fase 1. |
| AUD-02 | feito | Altura medida em `--reading-bar-h`. |
| AUD-03 | feito | Canvas oculto até 650 px; lista aberta por padrão. |
| AUD-04 | feito | Container query em `.chapter-sequence`; correção de especificidade em `6d8df57`. |
| AUD-05 | parcial | Lista textual do atlas fechada em telas largas e aberta abaixo de 42rem. Índice, grafo e linha do tempo mantêm controles próprios. |
| AUD-06 | feito | "Abrir ficha +" para painel, "Selecionar ficha", "Destacar no grafo" e "Ver conexões" sem "+", "Abrir ficha de … →" para a página. |
| AUD-07 | parcial | Hover de botão secundário com tinta, não com token de erro. Vermelho ainda decorativo em sombras e bordas de estado. Decisão de produto registrada em 11. |
| AUD-08 | parcial | Sombras de repouso removidas de cinco componentes; sombras ativas, de hover e de diálogo ficam. |
| AUD-09 | decidido | Documento de design alinhado ao CSS. Logos mantidos por decisão de marca. |
| AUD-10 | parcial | Faixa "Explorar por tipo" com seis catálogos, sem contagens. Contagens exigiriam carregar o grafo na home. |
| AUD-11 | feito | Composições fixas por rota; a recomposição fica como ação secundária do rodapé e da home. |
| AUD-12 | parcial | `:hover` sob `(hover: hover)` em dez regras. Taxonomia de botões em `ui-primitives` não consolidada. |
| AUD-13 | feito | Página "Página não encontrada" (Fase 1). |
| AUD-14 | feito | Metadados sem ramos por rota (Fase 1). |
| AUD-15 | feito | Colagem decorativa fora da ordem de tabulação; mapa é a única navegação. |
| AUD-16 | parcial | Filtro de categorias virou grupo, não navegação; contagem de página vai ao topo da lista; "Estado da revisão". Os dois eixos (catálogo e categoria) permanecem por decisão. |
| AUD-17 | feito | Conexões mantêm `origem`; teste em `knowledge-explorer.spec.ts`. |
| AUD-18 | feito | Diálogo com "Fechar" único (Fase 1). |
| AUD-19 | parcial | Breadcrumb com catálogo pai; "Copiar link"; dados técnicos em disclosure. Migalha para verbete desconhecido não aparece. |
| AUD-20 | parcial | Repetição removida em relações e debate; rótulos por item só quando diferem. |
| AUD-21 | parcial | Prévia só por teclado ou hover fino; nome acessível começa pelo texto visível. Toque abre o diálogo de contexto, sem definição curta no topo. |
| AUD-22 | parcial | Legenda de 0,75 rem no celular; cores mantidas em repouso. Texto alternativo descritivo exige mudança no schema e no conteúdo. |
| AUD-23 | parcial | Fontes com 24 px de altura mínima; demais controles conforme Fase 3. |
| AUD-24 | parcial | Abertura unificada em 760 px. Cerca de 20 breakpoints e a escala tipográfica não foram tokenizados. |
| AUD-25 | feito | Prosa limitada a 72ch; teste em `pages.spec.ts`. |
| AUD-26 | feito | Retrato empilhado abaixo de 600 px. |
| AUD-27 | feito | Lista de vidas com nome e anos no celular. |
| AUD-28 | parcial | Nó escala com o canvas; sobreposição não medida. |
| AUD-29 | feito | Smooth global removido (Fase 1). |
| AUD-30 | feito | `@media print` e `focus-within` já existiam. |
| AUD-31 | feito | Transição só com opacidade (Fase 1). |
| AUD-32 | pendente | Troca de tom e leitura por frame exigem trace em aba visível, que não foi possível obter. |
| AUD-33 | feito | Títulos não selecionados em tinta sólida. |
| AUD-34 | feito | Fontes em WOFF2 (`e8a9dc6`). |
| AUD-35 | parcial | Axe e overflow em todas as rotas públicas e teste de foco. Falta cobertura de `KnowledgeContextDirective`, rodapé e zoom. |
| AUD-36 | decidido | Componente órfão removido; `/rede` segue redirecionando. Mapa relacional não foi construído. |
| AUD-37 | feito | `aria-disabled` e `tabindex` condicionais. |
| AUD-38 | parcial | Diálogos anunciados como modais; gatilho aponta para o diálogo aberto com `aria-controls`. |
| AUD-39 | feito | Rótulos da cronologia abrem para a esquerda perto da borda. |
| AUD-40 | feito | Texto da figura não promete tabela. |
| AUD-41 | feito | Saltos de capítulo entram no histórico; o índice acompanha o fragmento. Teste em `pages.spec.ts`. |
| AUD-42 | parcial | Citações recolhidas por fonte. Índice interno por tipo não foi criado. |
| AUD-43 | feito | Menu mobile fecha quando o foco sai (já existia). |
| AUD-44 | feito | Uma coluna até 40rem (já existia). |
| AUD-45 | feito | Região de status permanente. |
| AUD-46 | parcial | Exceções de CSP documentadas em `scripts/security-headers.mjs`; nenhum header mudou. |
| AUD-47 | feito | Easing e duração por token; restos são legítimos. |
| AUD-48 | feito | Cores fora de tokens migradas; `#000` do carrossel mantido por decisão anterior. |
| AUD-49 | feito | Seta ↗ só em links externos. |
| AUD-50 | parcial | Filtro de rádio removido; os dois vínculos aparecem rotulados. Textos continuam no template. |
| AUD-51 | feito | Link de fonte volta à origem. |
| AUD-52 | feito | "Você leu N%", "Voltar de onde veio". |
| AUD-53 | pendente | Mídia sem dimensões no schema; CLS já medido em zero nas rotas principais. Exige dados. |
| AUD-54 | feito | Resolvers sem uso removidos; documentação atualizada. |
