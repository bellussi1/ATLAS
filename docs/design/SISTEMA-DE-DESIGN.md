# Sistema de design acessível

O sistema estabelece uma base comum a partir da direção editorial do ATLAS: tipografia suíça, leitura em papel, cartografia e acentos de arquivo. A direção A foi aprovada pelo usuário e é a base da interface principal. As alternativas B e C do Prompt 04 e as páginas de laboratório foram retiradas da documentação e da aplicação.

O escopo público atual contém somente `/`, `/marxismo` e `/liberalismo`. O showroom `/sistema` e as demais páginas antigas foram retirados; as descrições históricas abaixo não representam rotas disponíveis.

## Exploração enciclopédica — novembro de 2026

O contrato vigente das ideologias está em [PAGE_STANDARD.md](PAGE_STANDARD.md). `KnowledgeText` oferece termos contextuais, com sublinhado e pista persistente; `KnowledgeContextComponent` e a diretiva `appKnowledgeContext` abrem fichas de fontes, mídia licenciada e conexões em CDK Dialog. O diálogo preserva a leitura ao fundo, contém sua própria rolagem, admite Escape e devolve o foco ao gatilho. Seguir uma conexão inicia o novo contexto no topo; voltar restaura a posição interna anterior.

Timeline, grafo e quadro argumentativo usam painéis com geometria reservada. Os nós mantêm coordenadas na seleção; filtros e alternativa textual continuam operáveis por teclado. Cards de princípios, vertentes e argumentos abrem contexto em vez de aumentar a linha da grade. No Liberalismo, o contexto permanece lateral no desktop e abre diálogo em telas estreitas. As fontes locais usam `font-display: optional` e preload das duas famílias principais para evitar troca tardia de métricas.

Motion responde a ações: hover/press de fichas, prévias de termos, abertura contextual e realce de conexões. Os tokens de 120/240/480 ms permanecem; teclado e movimento reduzido têm resposta imediata. Ênfase estática não recebe aparência de botão. O relatório detalhado dessa auditoria foi removido na reorganização documental; este registro não constitui uma nova verificação.

## Tokens

Os tokens estão em `src/styles.scss`. Os aliases antigos (`--paper`, `--ink`, `--signal` e outros) continuam apontando para os tokens semânticos enquanto outras páginas forem migradas.

| Função | Token | Valor |
| --- | --- | --- |
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
| Texto em superfícies escuras | `--color-on-strong-surface` | `#FFFFFF` |
| Foco | `--color-focus` | `#B81D16` |
| Informação | `--color-info` / `--color-info-surface` | `#164F60` / `#E1EDF0` |
| Sucesso | `--color-success` / `--color-success-surface` | `#24563B` / `#E4EEE5` |
| Atenção | `--color-warning` / `--color-warning-surface` | `#614500` / `#F2E8C8` |
| Erro | `--color-danger` / `--color-danger-surface` | `#82251F` / `#F5E4E1` |
| Cartografia | `--color-cartographic` | `#315F54` |
| Arquivo | `--color-archive` | `#176176` |

Tipografia: Archivo (variável, WOFF2) para interface e títulos, Source Serif 4 (WOFF2, subconjunto latin) para leitura e IBM Plex Mono (WOFF2) para metadados. Os arquivos locais e avisos OFL estão em `public/fonts/`. A política é uma só: `font-display: swap`, sem `optional` nem TTF. A escala de texto, espaçamento, raio, largura de leitura e movimento também está definida como tokens CSS em `:root`. Os raios permanecem discretos; não há modo escuro global.

## Componentes e uso

Os componentes standalone e a diretiva de heading estão em `src/app/shared/ui/ui-primitives.scss`; regras de apresentação compartilhadas estão no mesmo arquivo SCSS.

| Primitiva | Uso |
| --- | --- |
| `appHeading` | Diretiva em elementos nativos `h1`–`h3`, com variantes `display`, `page` e `section`; mantém a hierarquia HTML no controle da página. |
| `appEditorialLink` | Diretiva em links nativos; preserva `routerLink`, `href`, classes e nomes da tela, aplicando o tratamento editorial. |
| `app-button` | Botão nativo com variantes `primary`, `secondary` e `quiet`, além de `disabled` e `busy`. O rótulo permanece estável durante `busy`; `aria-busy` é definido e o botão é desativado para evitar repetição da ação. |
| `app-text-field` | Campo com `controlId`, `label`, `type`, `required`, `disabled`, `readonly`, `hint` e `error`. Rótulo e instruções são associados ao controle; erro define `aria-invalid` e integra `aria-describedby`. |
| `app-menu` | Navegação nativa com nome obrigatório e orientação horizontal ou vertical; os links são projetados pela página. |
| `app-content-summary` | Sumário de conteúdo com heading e conteúdo projetado; usado nos resumos das páginas reais de categoria e artigo. |
| `app-disclosure` | Disclosure nativo `<details>/<summary>`, operável por teclado sem JavaScript específico. |
| `app-notice` | Mensagem `info`, `success`, `warning` ou `critical`; `accessibleRole="status"` anuncia em modo polido e `accessibleRole="alert"` em modo assertivo. O papel fica em um único elemento. |
| `app-page-template` | Template editorial com variantes `editorial`, `index` e `profile`, largura de leitura própria e `aria-labelledby`. |

Já usados em páginas reais: menu global; templates e sumários das páginas editoriais e de categorias; headings e links editoriais; campos de busca funcionais na home e em Conhecimento; avisos de busca vazia. O showroom exercita as demais variantes e estados sem enviar dados.

## Acessibilidade e validação

- O foco visível usa contorno de 3 px; o link de pular conteúdo move o foco para o `<main>`; botões, links de menu, disclosures e campos têm área mínima aproximada de 44 px.
- Os campos usam rótulo explícito, indicação de obrigatório, texto de ajuda e mensagem de erro associada. Estados desativados não dependem apenas da cor.
- Menus e disclosures usam elementos nativos. As mensagens têm nome, papel e modo de anúncio explícitos.
- `prefers-reduced-motion: reduce` desativa rolagem suave, animações e transições globais. O layout não impõe largura mínima acima de 0; as colunas mudam para uma coluna em telas estreitas.
- Contraste sRGB é checado automaticamente em `src/app/shared/ui-contrast.spec.ts`, lendo os valores diretamente de `src/styles.scss`. A suíte verifica texto principal, texto de apoio e ação nas superfícies canvas, superfície, elevada e sutil; foco nas superfícies clara e elevada; borda forte de campo; estados de mensagem e texto branco sobre as superfícies de ação/cartografia/arquivo. Os mínimos são 4,5:1 para texto e 3:1 para foco e borda não textual.

| Combinação medida | Razão |
| --- | ---: |
| Texto principal / canvas | 16,35:1 |
| Texto de apoio / canvas | 7,24:1 |
| Ação e foco / canvas | 6,29:1 |
| Foco / superfície | 6,29:1 |
| Texto de informação / superfície de informação | 7,57:1 |
| Texto de sucesso / superfície de sucesso | 7,15:1 |
| Texto de atenção / superfície de atenção | 7,27:1 |
| Texto de erro / superfície de erro | 7,64:1 |
| Branco / ação | 6,56:1 |
| Branco / cartografia | 7,25:1 |
| Branco / arquivo | 6,98:1 |

O showroom e as primitivas começam em uma coluna e ampliam para layouts maiores em breakpoints `min-width`. No navegador, foram conferidos a rota showroom em 1280 px, 640 px (viewport CSS equivalente ao reflow de 200% em 1280 px) e 320 px, sem largura de documento maior que a viewport. O link de pular conteúdo e o disclosure foram operados com teclado; o movimento reduzido estava ativo. A árvore de acessibilidade do Chrome foi revisada para navegação, campos, mensagens, headings e disclosures. O zoom nativo do navegador em 200% não foi medido separadamente.

Esta revisão e os testes automatizados não constituem auditoria WCAG 2.2 AA integral. Ainda falta avaliação com leitores de tela e pessoas usuárias de tecnologia assistiva, incluindo combinações de navegador/sistema operacional e anúncio das mensagens dinâmicas.


## Homepage e modos de exploração

A homepage é uma superfície de consulta com busca funcional, rede de evidências, índice de leituras e percursos guiados, adaptada da referência Stitch escolhida. A navegação mantém os três destinos Relações, Tempo e espaço e Conhecimento; não apresenta cronologia ou mapa simulados. A tipografia modernista, a assimetria, os filetes e a geometria usam os tokens compartilhados; as referências visuais não são ativos de publicação.

- Em /conhecimento, a busca local indexa títulos, resumos e texto dos registros editoriais existentes e entidades validadas. A consulta persiste em ?q=, aceita acentos equivalentes e oferece recuperação quando não há resultados. A interface informa que inclui registros editoriais e históricos disponíveis. Formatos previstos conservam seu status, sem serem apresentados como coleções históricas publicadas.
- Em /relacoes, a rede inicial deriva exclusivamente de entityId e sourceIds das afirmações do ContentRepository. Seleção, filtro e contexto funcionam em botões e select nativos. A lista de conexões oferece equivalente textual. A rede representa metodologia, sem simular relações históricas.
- Em /tempo-e-espaco, a linha do tempo e o comparador usam somente períodos e metadados estruturados. A exploração geográfica continua indisponível: o acervo não fornece polígonos históricos, e limites atuais não são sobrepostos a entidades do passado.
- As perguntas de entrada levam a textos reais sobre evidência, contexto e organização editorial. Trilhas temáticas históricas ainda não estão publicadas.

A direção A está consolidada. Os índices editoriais e o showroom permanecem; as antigas páginas de laboratório não fazem parte da navegação atual.


Validação da consolidação A: busca enviada por Enter no Chrome em 390 px abriu /conhecimento?q=evidencia e retornou cinco registros reais. A home e as três telas foram medidas em 320 px sem overflow horizontal. O nó Fonte foi ativado por Enter, atualizou a seleção e o contexto, mantendo contorno de foco de 3 px. Movimento reduzido foi emulado e reconhecido. A home foi capturada em 1440×1000 e 390×844; não foram reproduzidas as imagens de referência. A revisão não incluiu leitor de tela nem auditoria WCAG integral.


### Rede de evidências compartilhada

AtlasEvidenceNetworkComponent, em src/app/shared/evidence-network.ts, é usado na home e em Relações. A disposição espacial evidencia as ligações derivadas de entityId/sourceIds; o destaque vermelho acompanha a seleção, também comunicada por aria-pressed. O botão Ver lista oferece os mesmos registros sem distribuição espacial. Filtros recalculam as conexões visíveis e selecionam um registro da categoria. O foco permanece no controle acionado; o painel anuncia seu contexto sem capturar foco. As transições de cor reutilizam --motion-fast e a regra global de movimento reduzido. Nenhuma biblioteca foi adicionada.


Verificação da adaptação Stitch: home conferida em 1440, 390 e 320 CSS px; em 320 px a largura do documento permaneceu em 320 px. O modo de lista foi acionado por Enter e manteve foco de 3 px, três registros e ausência de overflow. Movimento reduzido foi emulado e reconhecido. Testes cobrem a seleção na home, mudança para lista, filtro com acento (Afirmação), destinos e regressões de navegação. Sem avaliação com leitor de tela nesta entrega.

## Continuidade de leitura

As prévias da home, o índice de seções, a indicação de posição e os percursos para continuar são compartilhados pelas telas de leitura. O Angular CDK oferece a infraestrutura acessível da prévia modal, mantendo a aparência editorial do ATLAS. O contrato vigente de leitura está em [PAGE_STANDARD.md](PAGE_STANDARD.md).


## Mesa de pesquisa e revisão com skills

A home atual substitui a composição anterior de painéis pela seleção de fichas. A busca e os três modos permanecem; o grafo continua na rota Relações, sem repetir uma miniatura na mesa. Os registros e o leitor foram reutilizados. Desktop usa botões de seleção; mobile usa select nativo sincronizado. A prévia aponta para o registro selecionado. A revisão está em animation-plans/001-research-table-review.md na raiz do repositório.

O catálogo instalado usa prefixo atlas- para preservar skills existentes. As instruções de frontend e interação orientaram a composição; find-animation-opportunities selecionou apenas troca de ficha, painel e feedback de pressão; animate implementou esses casos; improve-animations e 12-principles-of-animation revisaram a entrega.


## Editorial geométrico: cores e termos navegáveis

A mesa de pesquisa foi aprovada pelo usuário. A evolução solicitada acrescenta os tokens color-teal-paper (#85BDB5), color-ochre-paper (#EDC45B), color-rose-paper (#E9B4BF) e color-indigo (#37395E), mantendo papel, tinta e vermelho como base. Texto principal nas três superfícies claras e branco sobre índigo têm cobertura de contraste automatizada.

AtlasEditorialMarkComponent produz motivos SVG originais para verbete, artigo e atlas; as miniaturas acompanham os controles de seleção e o motivo maior acompanha a ficha atual. Eles não são dados cartográficos nem fac-símiles. Os rótulos textuais continuam disponíveis, e os desenhos são ocultos da árvore acessível.

AtlasEditorialTextComponent preserva o texto e destaca termos de um vocabulário editorial limitado. Contexto abre o artigo Conhecimento com contexto; fonte/evidência abrem a seção de contexto e evidência da metodologia; metodologia abre o verbete estruturado; verbete abre seu índice. São até dois destinos distintos por trecho. currentPath evita links para o próprio texto. Sublinhado complementa o vermelho; inverse mantém texto e foco claros em fundos fortes.

A skill própria está em .agents/skills/atlas-editorial-geometrico/SKILL.md e foi instalada em ~/.codex/skills/atlas-editorial-geometrico. A cópia versionada é a fonte mantida no repositório; ao alterá-la, atualizar a instalação local. references/mesa-aprovada.png preserva a composição aprovada antes da ampliação de cores. O validador estrutural passou; o uso nesta tarefa e os testes de componentes verificam uma aplicação concreta, sem constituir validação universal da skill.


Verificação no Chrome: em 320 px, documento e viewport mediram 320 px; os termos tinham sublinhado computado. Trocar para o artigo atualizou título, motivo rosa e destino de leitura. Acionar contexto por Enter abriu o artigo real Conhecimento com contexto. A tela de leitura também permaneceu sem overflow horizontal. Movimento reduzido estava ativo. A validação automatizada passou com 100 testes em seis arquivos.


## Logo e favicon

Usar as assinaturas SVG oficiais em public/brand no header e footer. As imagens são dimensionadas com proporção preservada e tamanhos intrínsecos; dentro de links com aria-label, alt vazio evita repetir o nome. A marca é tipográfica, com letras próximas e ponto vermelho, sem emblema separado à esquerda. Em fundos escuros, usar atlas-logo-inverse.svg; aplicações de uma só cor usam atlas-logo-mono.svg ou atlas-logo-white.svg. O símbolo isolado usa A e ponto vermelho e não substitui o nome acessível. Os SVGs têm viewBox e contornos de letras, preservando a qualidade em qualquer escala.

O favicon tem redução própria em SVG/PNG, fallback ICO (16/32/48) e touch icon (180). As versões não são animações. O teste brand-assets.spec.ts verifica XML dos vetores, independência de fontes/imagens externas, resolução dos arquivos apontados no index e estrutura dos ícones ICO.


## Revisão requisito a requisito do Prompt 05 — 31/10/2026

Referência: `prompts/05-design-system-acessivel.md`, último prompt numerado solicitado neste chat. A revisão preserva a identidade e a marca aprovadas posteriormente. Alterações paralelas de conteúdo foram preservadas; a suíte completa abaixo reflete o estado conjunto do workspace, e o commit desta revisão se limita ao design system.

| Requisito | Evidência no código e resultado da revisão |
| --- | --- |
| 1. Tokens semânticos, foco, tipo, espaço, grid, superfícies e estados | `src/styles.scss` concentra esses grupos. Foram extraídos `--focus-width`, `--focus-offset`, `--control-min-size` e as medidas `--measure-reading/index/profile`, consumidos nas primitivas. A faixa declarada da IBM Plex Sans foi corrigida para 100–700, conforme o arquivo local. |
| 2. Links, headings, botões, campos, sumários, menus, disclosures, avisos e templates | Implementados em `ui-primitives.ts/scss` e usados nas páginas indicadas acima. A variante `page` agora recebe sua classe (correção integrada também pela alteração paralela); o teste cobre a variante explícita e a padrão. O hover do botão quiet foi corrigido: a regra primária deixava texto escuro sobre vermelho escuro. |
| 3. Mobile-first, zoom 200%, reflow 320 px e teclado | Showroom, home e artigo Conhecimento com contexto medidos em 320 CSS px sem overflow. Showroom também medido em 1280 px e em 640 CSS px/DPR 2, equivalente ao reflow de uma área de 1280 px em 200%. O índice agora transfere foco à seção sem acrescentá-la à sequência Tab; cliques com modificadores preservam a operação do navegador. Zoom nativo permanece uma limitação de verificação, detalhada abaixo. |
| 4. Reduced motion e contraste AA como meta | Regra global reduz transições para 0,01 ms e torna a rolagem imediata. No Chrome, a preferência foi reconhecida e `scroll-behavior` medido como auto. Contraste do quiet em hover passou de 1,74:1 para 13,47:1, medido com as cores computadas; a suíte sRGB continua cobrindo os tokens e as superfícies. |
| 5. Showroom com variantes, vazio/erro e documentação | `/sistema` permanece navegável e pré-renderizado, com exemplos de avisos, campos, botões e templates. Foram incluídas as quatro cores secundárias aprovadas e o campo readonly. A altura artificial dos avisos em coluna foi removida. Documentação de uso atualizada. |
| 6. Automação, revisão manual possível e pendências de leitor de tela | `npm test`: 111 testes em sete arquivos; `npm run build`: 37 rotas estáticas; `npm run lint` e `npm run typecheck`: sucesso. Novos testes verificam heading, foco do índice e campo readonly. No Chrome, disclosure abriu/fechou com Enter, Tab/Enter acionou feedback de sucesso, e o índice transferiu foco com Enter; Tab exibiu contorno de 3 px. |

Os quatro critérios de aceite foram confrontados: showroom navegável, reutilização em páginas reais, testes de teclado/contraste e ausência de declaração integral WCAG. As capturas desktop/mobile desta revisão foram inspecionadas durante a execução; a ferramenta recusou gravá-las nos caminhos locais solicitados, portanto não há novos arquivos de screenshot entregues.

Limitações de verificação: o atalho enviado pela ferramenta de navegador não alterou o zoom nativo. A tentativa seguinte por Computer Use foi interrompida pela própria ferramenta por não conseguir confirmar a URL da janela com confiança; nenhuma ação de zoom foi executada por ela. A emulação de viewport/DPR não substitui essa medição. Um ensaio com zoom CSS 200% apresentou overflow e não foi considerado evidência de aprovação: zoom CSS não altera os breakpoints como o zoom nativo. Continua necessária a conferência do zoom nativo em 200%, além da avaliação com leitores de tela/pessoas usuárias de tecnologia assistiva já registrada acima. Não se declara conformidade WCAG integral.


## Container e troca de páginas

O limite externo é `--grid-max` (90rem, incluindo padding) e a margem lateral é `--grid-gutter`. Header e footer têm wrappers internos com esses mesmos limites; suas faixas de fundo continuam ocupando a viewport. Home, exploração, índices, showroom, páginas institucionais, breadcrumbs e templates editoriais seguem esse contrato. A largura dos parágrafos continua limitada pelas medidas de leitura, sem estreitar o container externo.

Os três acessos coloridos no header são a navegação dos modos; a nav textual duplicada foi removida. A troca de pathname usa entrada por opacidade e deslocamento de 8px em 200ms (`--motion-standard` e `--ease-out`), sem animar header/footer. Primeira renderização, teclado e reduced motion são imediatos. Query strings e fragmentos não reiniciam a animação; novas navegações cancelam o movimento anterior. Não há bloqueio de entrada nem dependência adicional.

Conferência desta mudança no Chrome: em viewport de 1920 px, as bordas internas de header, exploração e footer foram 312,5/1592,5 px; em 320 px, 16/304 px, sem overflow horizontal. Um clique em Conhecimento registrou a entrada com duração 200ms e os tokens previstos. Suíte completa: 117 testes em nove arquivos; build com 37 rotas estáticas, lint e typecheck passaram.
