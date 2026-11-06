# Sistema de design acessível

Base comum da interface, a partir da direção editorial do ATLAS: tipografia suíça, leitura em papel, cartografia e acentos de arquivo. A direção A foi aprovada e é a base da interface principal. As alternativas B e C do Prompt 04 e as páginas de laboratório foram retiradas da documentação e da aplicação.

Escopo público atual: `/`, `/marxismo` e `/liberalismo`. O showroom `/sistema` e as páginas antigas foram retirados; as descrições históricas abaixo não são rotas disponíveis.

## Exploração enciclopédica (nov/2026)

Contrato das ideologias em [PAGE_STANDARD.md](PAGE_STANDARD.md).

- `KnowledgeText` oferece termos contextuais com sublinhado e pista persistente. `KnowledgeContextComponent` e `appKnowledgeContext` abrem fichas de fontes, mídia licenciada e conexões em CDK Dialog: leitura preservada ao fundo, rolagem própria, Escape, foco devolvido ao gatilho. Seguir uma conexão inicia o contexto no topo; voltar restaura a posição interna anterior.
- Timeline, grafo e quadro argumentativo usam painéis com geometria reservada. Nós mantêm coordenadas na seleção; filtros e alternativa textual operáveis por teclado. Cards de princípios, vertentes e argumentos abrem contexto sem alterar a grade. No Liberalismo, contexto lateral no desktop e diálogo em telas estreitas.
- Fontes locais com `font-display: optional` e preload das duas famílias principais, para evitar troca tardia de métricas (ver política única abaixo).
- Motion responde a ações (hover e press de fichas, prévias, abertura contextual, realce de conexões). Tokens de 120/240/480 ms mantidos; teclado e movimento reduzido têm resposta imediata. Ênfase estática não tem aparência de botão.

## Tokens

Definidos em `src/styles.scss`. Aliases antigos (`--paper`, `--ink`, `--signal` etc.) apontam para os tokens semânticos até a migração das outras páginas.

| Função | Token | Valor |
|---|---|---|
| Fundo | `--color-canvas` | `#FBF8F1` |
| Superfície | `--color-surface` | `#FBF8F1` |
| Superfície elevada | `--color-surface-raised` | `#FFFDFA` |
| Superfície sutil | `--color-surface-subtle` | `#E9E4DA` |
| Texto principal | `--color-ink` | `#141211` |
| Texto de apoio | `--color-ink-muted` | `#57544D` |
| Borda | `--color-border` | `#D9D4CA` |
| Borda forte | `--color-border-strong` | `#777268` |
| Ação | `--color-accent` | `#B81D16` |
| Ação em hover | `--color-accent-hover` | `#811F1A` |
| Texto sobre superfície escura | `--color-on-strong-surface` | `#FFFFFF` |
| Foco | `--color-focus` | `#B81D16` |
| Informação | `--color-info` / `--color-info-surface` | `#164F60` / `#E1EDF0` |
| Sucesso | `--color-success` / `--color-success-surface` | `#24563B` / `#E4EEE5` |
| Atenção | `--color-warning` / `--color-warning-surface` | `#614500` / `#F2E8C8` |
| Erro | `--color-danger` / `--color-danger-surface` | `#82251F` / `#F5E4E1` |
| Cartografia | `--color-cartographic` | `#315F54` |
| Arquivo | `--color-archive` | `#176176` |

**Tipografia:** Archivo (variável, WOFF2) para interface e títulos; Source Serif 4 (WOFF2, subset latin) para leitura; IBM Plex Mono (WOFF2) para metadados. Arquivos locais e avisos OFL em `public/fonts/`. Política única: `font-display: swap`, sem `optional` nem TTF. Escala de texto, espaçamento, raio, largura de leitura e movimento definidos como tokens em `:root`. Raios discretos; sem modo escuro global.

## Componentes

Primitivas standalone em `src/app/shared/ui/ui-primitives.scss` (estilos compartilhados no mesmo arquivo).

| Primitiva | Uso |
|---|---|
| `appHeading` | Diretiva em `h1`–`h3` nativos; variantes `display`, `page`, `section`; hierarquia HTML sob controle da página |
| `appEditorialLink` | Diretiva em links nativos; preserva `routerLink`, `href`, classes e nomes; aplica tratamento editorial |
| `app-button` | Botão nativo; variantes `primary`, `secondary`, `quiet`; `disabled` e `busy`. Rótulo estável em `busy`; `aria-busy` definido e botão desativado para evitar repetição |
| `app-text-field` | Campo com `controlId`, `label`, `type`, `required`, `disabled`, `readonly`, `hint`, `error`. Rótulo e instruções associados; erro define `aria-invalid` e `aria-describedby` |
| `app-menu` | Navegação nativa com nome obrigatório; orientação horizontal ou vertical; links projetados pela página |
| `app-content-summary` | Sumário com heading e conteúdo projetado; usado nos resumos de categoria e artigo |
| `app-disclosure` | `<details>/<summary>` nativo, operável por teclado sem JavaScript próprio |
| `app-notice` | `info`, `success`, `warning`, `critical`; `accessibleRole="status"` (polido) ou `"alert"` (assertivo), em um único elemento |
| `app-page-template` | Variantes `editorial`, `index`, `profile`; largura de leitura própria; `aria-labelledby` |

Já em uso: menu global; templates e sumários de páginas editoriais e categorias; headings e links editoriais; buscas funcionais na home e em Conhecimento; avisos de busca vazia. O showroom exercita as demais variantes e estados sem enviar dados.

## Acessibilidade e validação

- Foco visível de 3 px; link de pular conteúdo move o foco para `<main>`; botões, links de menu, disclosures e campos com área mínima de ~44 px.
- Campos com rótulo explícito, indicação de obrigatório, ajuda e erro associados. Estados desativados não dependem só da cor.
- Menus e disclosures em elementos nativos; mensagens com nome, papel e modo de anúncio explícitos.
- `prefers-reduced-motion: reduce` desativa rolagem suave, animações e transições globais. Colunas mudam para uma coluna em telas estreitas.
- Contraste sRGB verificado em `src/app/shared/ui-contrast.spec.ts`, lendo `src/styles.scss`: texto principal, de apoio e ação sobre canvas, superfície, elevada e sutil; foco sobre superfícies clara e elevada; borda forte de campo; estados de mensagem; branco sobre ação, cartografia e arquivo. Mínimos: 4,5:1 texto; 3:1 foco e borda não textual.

| Combinação medida | Razão |
|---|--:|
| Texto principal / canvas | 16,35:1 |
| Texto de apoio / canvas | 7,24:1 |
| Ação e foco / canvas | 6,29:1 |
| Foco / superfície | 6,29:1 |
| Informação / superfície de informação | 7,57:1 |
| Sucesso / superfície de sucesso | 7,15:1 |
| Atenção / superfície de atenção | 7,27:1 |
| Erro / superfície de erro | 7,64:1 |
| Branco / ação | 6,56:1 |
| Branco / cartografia | 7,25:1 |
| Branco / arquivo | 6,98:1 |

**Responsividade:** showroom e primitivas começam em uma coluna e ampliam por `min-width`. Verificado no navegador: showroom em 1280 px, 640 px (equivalente CSS ao reflow de 200% em 1280 px) e 320 px, sem largura de documento maior que a viewport. Link de pular e disclosure operados por teclado; movimento reduzido ativo. Árvore de acessibilidade do Chrome revisada. Zoom nativo de 200% não medido separadamente.

Não é auditoria WCAG 2.2 AA integral. Faltam leitores de tela, usuários de tecnologia assistiva e anúncio de mensagens dinâmicas em combinações de navegador e sistema operacional.

## Homepage e modos de exploração

A home é uma superfície de consulta: busca funcional, rede de evidências, índice de leituras e percursos guiados, adaptada da referência Stitch escolhida. Navegação com três destinos: Relações, Tempo e espaço, Conhecimento; sem cronologia ou mapa simulados. Tipografia modernista, assimetria, filetes e geometria usando tokens compartilhados; referências visuais não são ativos de publicação.

- **/acervo:** busca local em títulos, resumos e texto dos registros editoriais e entidades validadas. Consulta em `?q=`, aceita acentos equivalentes, oferece recuperação sem resultados. Formatos previstos mantêm seu status, sem parecer coleções publicadas.
- **/relacoes:** rede inicial derivada apenas de `entityId` e `sourceIds` das afirmações do `ContentRepository`. Seleção, filtro e contexto em botões e select nativos; lista textual equivalente. Representa metodologia, sem simular relações históricas.
- **/tempo-e-espaco:** linha do tempo e comparador só com períodos e metadados estruturados. Exploração geográfica indisponível: o acervo não tem polígonos históricos, e limites atuais não são sobrepostos a entidades do passado.
- As perguntas de entrada levam a textos reais sobre evidência, contexto e organização editorial. Trilhas temáticas históricas ainda não publicadas.

**Validação da consolidação A:** busca por Enter no Chrome em 390 px abriu `/acervo?q=evidencia` com cinco registros reais. Home e três telas medidas em 320 px sem overflow. Nó Fonte ativado por Enter atualizou seleção e contexto, com contorno de foco de 3 px. Movimento reduzido emulado e reconhecido. Home capturada em 1440×1000 e 390×844; imagens de referência não reproduzidas. Sem leitor de tela nem WCAG integral.

**Rede de evidências (retirada):** o componente antigo deixou de ser publicado; `/grafos` é o mapa relacional atual e `/rede` redireciona para ele. A lista equivalente operável por teclado continua disponível.

**Verificação da adaptação Stitch:** home em 1440, 390 e 320 CSS px; em 320 px, documento com 320 px. Modo lista acionado por Enter, foco de 3 px, três registros, sem overflow. Movimento reduzido emulado. Testes cobrem seleção na home, troca para lista, filtro com acento ("Afirmação"), destinos e regressões de navegação. Sem leitor de tela.

## Continuidade de leitura

Prévias da home, índice de seções, indicação de posição e percursos para continuar são compartilhados pelas telas de leitura. O CDK oferece a infraestrutura acessível da prévia modal, com a aparência editorial do ATLAS. Contrato de leitura em [PAGE_STANDARD.md](PAGE_STANDARD.md).

## Mesa de pesquisa e skills

A home substitui a composição anterior de painéis pela seleção de fichas. Busca e três modos permanecem; o grafo fica na rota Relações, sem miniatura na mesa. Registros e leitor reutilizados. Desktop usa botões de seleção; mobile, select nativo sincronizado. A prévia aponta para o registro selecionado. Revisão em `animation-plans/001-research-table-review.md`.

Catálogo de skills com prefixo `atlas-`. Frontend e interação orientaram a composição; `find-animation-opportunities` selecionou troca de ficha, painel e feedback de pressão; `animate` implementou; `improve-animations` e `12-principles-of-animation` revisaram.

## Editorial geométrico: cores e termos navegáveis

Mesa aprovada pelo usuário. Tokens adicionados: `color-teal-paper` (#85BDB5), `color-ochre-paper` (#EDC45B), `color-rose-paper` (#E9B4BF), `color-indigo` (#37395E); papel, tinta e vermelho continuam base. Texto principal nas três superfícies claras e branco sobre índigo com cobertura de contraste automatizada.

- `AtlasEditorialMarkComponent`: motivos SVG originais para verbete, artigo e atlas. Miniaturas acompanham os controles de seleção; o motivo maior acompanha a ficha atual. Não são dados cartográficos nem fac-símiles. Rótulos textuais disponíveis; desenhos ocultos da árvore acessível.
- `AtlasEditorialTextComponent`: preserva o texto e destaca termos de vocabulário editorial limitado. Contexto → artigo Conhecimento com contexto; fonte/evidência → seção de contexto e evidência da metodologia; metodologia → verbete estruturado; verbete → índice. Até dois destinos distintos por trecho. `currentPath` evita link para o próprio texto. Sublinhado complementa o vermelho; `inverse` mantém texto e foco claros em fundos fortes.

Skill própria: `.agents/skills/atlas-editorial-geometrico/SKILL.md`, instalada em `~/.codex/skills/atlas-editorial-geometrico`. A cópia versionada é a fonte; ao alterá-la, atualizar a instalação local. `references/mesa-aprovada.png` preserva a composição aprovada antes da ampliação de cores. O validador estrutural passou; a validação concreta cobre esta aplicação, não a skill em geral.

**Verificação no Chrome:** em 320 px, documento e viewport com 320 px; termos com sublinhado computado. Trocar para o artigo atualizou título, motivo rosa e destino. Contexto por Enter abriu o artigo real Conhecimento com contexto. Leitura sem overflow horizontal. Movimento reduzido ativo. Suíte automatizada: 100 testes em seis arquivos.

## Logo e favicon

Assinaturas SVG oficiais em `public/brand` no header e footer, com proporção preservada e tamanho intrínseco. Dentro de links com `aria-label`, `alt` vazio evita repetir o nome. Marca tipográfica, letras próximas e ponto vermelho, sem emblema à esquerda. Fundos escuros: `atlas-logo-inverse.svg`; uma cor: `atlas-logo-mono.svg` ou `atlas-logo-white.svg`. Símbolo isolado (A e ponto vermelho) não substitui o nome acessível. SVGs com viewBox e contornos de letras.

Favicon com redução própria em SVG/PNG, fallback ICO (16/32/48) e touch icon (180), sem animação. `brand-assets.spec.ts` verifica XML dos vetores, independência de fontes e imagens externas, resolução dos arquivos do `index` e estrutura dos ICO.

## Revisão requisito a requisito do Prompt 05 (31/10/2026)

Referência: `prompts/05-design-system-acessivel.md`. A revisão preserva a identidade e a marca aprovadas depois. Alterações paralelas de conteúdo foram preservadas; a suíte abaixo reflete o workspace conjunto, e o commit da revisão se limita ao design system.

| Requisito | Evidência e resultado |
|---|---|
| 1. Tokens semânticos (foco, tipo, espaço, grid, superfícies, estados) | `src/styles.scss` concentra os grupos. Extraídos `--focus-width`, `--focus-offset`, `--control-min-size` e `--measure-reading/index/profile`, usados nas primitivas. Faixa da IBM Plex Sans corrigida para 100–700, conforme o arquivo local. |
| 2. Links, headings, botões, campos, sumários, menus, disclosures, avisos, templates | Em `ui-primitives.ts/scss` e usados nas páginas citadas. Variante `page` recebe classe (correção integrada com alteração paralela); teste cobre variante explícita e padrão. Hover do botão `quiet` corrigido: a regra primária deixava texto escuro sobre vermelho escuro. |
| 3. Mobile-first, zoom 200%, reflow 320 px, teclado | Showroom, home e artigo com contexto medidos em 320 CSS px sem overflow. Showroom também em 1280 px e em 640 CSS px com DPR 2 (equivalente ao reflow de 1280 px a 200%). Índice transfere foco à seção sem acrescentá-la à sequência Tab; cliques com modificadores preservam o comportamento do navegador. Zoom nativo segue como limitação (ver abaixo). |
| 4. Reduced motion e contraste AA como meta | Regra global reduz transições a 0,01 ms e torna a rolagem imediata; preferência reconhecida no Chrome, `scroll-behavior` medido como `auto`. Contraste do `quiet` em hover: de 1,74:1 para 13,47:1, com cores computadas; suíte sRGB cobre tokens e superfícies. |
| 5. Showroom com variantes, vazio/erro e documentação | `/sistema` navegável e pré-renderizado, com avisos, campos, botões e templates. Incluídas as quatro cores secundárias aprovadas e o campo readonly. Altura artificial dos avisos em coluna removida. Documentação de uso atualizada. |
| 6. Automação, revisão manual e pendências de leitor de tela | `npm test`: 111 testes em sete arquivos; `npm run build`: 37 rotas estáticas; `npm run lint` e `npm run typecheck`: sucesso. Novos testes para heading, foco do índice e campo readonly. No Chrome: disclosure abriu e fechou por Enter; Tab e Enter acionaram feedback de sucesso; índice transferiu foco por Enter; Tab mostrou contorno de 3 px. |

Quatro critérios de aceite conferidos: showroom navegável, reutilização em páginas reais, testes de teclado e contraste, e ausência de declaração WCAG integral. As capturas desktop e mobile foram inspecionadas, mas a ferramenta recusou gravá-las nos caminhos pedidos; não há screenshots entregues.

**Limitações:** o atalho do navegador não alterou o zoom nativo; a tentativa por Computer Use foi interrompida por não confirmar a URL da janela, sem ação de zoom. Emulação de viewport e DPR não substitui a medição. Ensaio com zoom CSS de 200% teve overflow e não é evidência de aprovação, pois zoom CSS não altera os breakpoints como o nativo. Falta conferir o zoom nativo em 200% e a avaliação com leitores de tela. Sem declaração de conformidade WCAG integral.

## Container e troca de páginas

Limite externo `--grid-max` (90rem, incluindo padding); margem lateral `--grid-gutter`. Header e footer têm wrappers internos com os mesmos limites; as faixas de fundo ocupam a viewport. Home, exploração, índices, showroom, páginas institucionais, breadcrumbs e templates seguem o contrato. Parágrafos limitados pelas medidas de leitura, sem estreitar o container externo.

- Os três acessos coloridos do header são a navegação dos modos; a nav textual duplicada foi removida.
- Troca de pathname: entrada por opacidade e deslocamento de 8 px em 200 ms (`--motion-standard`, `--ease-out`), sem animar header/footer. Primeira renderização, teclado e reduced motion são imediatos. Query strings e fragmentos não reiniciam a animação; novas navegações cancelam a anterior. Sem bloqueio de entrada nem dependência adicional.
- Conferência no Chrome: em 1920 px, bordas internas de header, exploração e footer em 312,5 e 1592,5 px; em 320 px, 16 e 304 px, sem overflow. Clique em Conhecimento registrou entrada de 200 ms com os tokens previstos. Suíte: 117 testes em nove arquivos; build com 37 rotas estáticas, lint e typecheck passaram.
