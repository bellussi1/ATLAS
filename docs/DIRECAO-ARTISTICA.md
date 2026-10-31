# Direção artística — laboratório do prompt 04

Este registro preserva as três composições experimentais em `/laboratorio/:proposta/:pagina`. A direção A foi escolhida pelo usuário e consolidada na interface principal; B e C continuam como referências de cartografia e exploração. A seção final registra essa consolidação.

## Observação das referências

As observações abaixo descrevem somente o que aparece nos arquivos fornecidos em `referencias/`. As propostas de adaptação vêm em seguida e não reproduzem essas peças.

| Arquivo | Atributos visíveis na referência | Adaptação no laboratório |
| --- | --- | --- |
| `01-modernismo-suico-cartaz.png` | Cartaz vertical em papel branco; hierarquia sans em blocos alinhados à esquerda; título monumental em linhas curtas; pequenos filetes separam título e informações; retângulo vermelho alto, círculo preto e bloco preto ocupam uma coluna assimétrica. | As três propostas adotam escala tipográfica e alinhamento por grid, cada uma em uma composição própria. Nenhum texto, marca ou arranjo literal foi reproduzido. |
| `02-atlas-historico-editorial.png` | Livro aberto fotografado de cima; mapa antigo ocupa a página direita; página esquerda combina mapa menor, fotografias, legendas, títulos e texto em colunas estreitas; margens amplas, fólio e papel envelhecido dão ritmo de livro. | Cada proposta tem um diagrama cartográfico esquemático acompanhado de legenda ou metadados; as páginas de artigo também usam margem editorial. Os desenhos são originais e não alegam representar geografia histórica. |
| `03-arquivo-digital-experimental.png` | Fundo escuro de exposição; serifas grandes e texto monoespaçado; navegação com Explore/Timeline/Map/Collections e busca; breadcrumb e controles visíveis de lista/grade; fotografia central e documentos inclinados se sobrepõem em camadas; metadados identificam conjunto e data; etiqueta lateral apresenta área de leitura; ações aparentes de baixar e fechar; cartões azul, amarelo e vermelho criam contraste. A imagem permite observar affordances, mas não confirmar o comportamento delas. | As três propostas ligam páginas demonstrativas e registros do acervo com links nomeados. A adiciona metadados e uma faixa de entradas; B sobrepõe uma ficha clicável ao diagrama; C compõe fichas em profundidades distintas com etiquetas de coleção. Os documentos são simulações CSS/SVG, sem cópia de ativos da referência. |

## As três composições

- **A — editorial modernista com atlas e acervo:** hierarquia sans e formas assimétricas de cartaz; uma rota conceitual branca e sua legenda entram no retângulo vermelho; a faixa inferior navega pelos registros existentes do acervo. O artigo acrescenta margem e metadados editoriais; o perfil mantém grid geométrico.
- **B — atlas cartográfico com exploração museográfica:** o diagrama relacional e sua legenda organizam a home como uma página de atlas; uma ficha editorial clicável, inclinada e em primeiro plano leva a um artigo existente. O artigo segue uma rota entre evidência, contexto e interpretação; tipografia monoespaçada e um documento sobreposto trazem a camada museográfica.
- **C — museu digital experimental com rigor tipográfico suíço e páginas de leitura:** grid assimétrico e escala tipográfica disciplinam a composição; mapa conceitual legendado aparece dentro de uma ficha; folhas simuladas se sobrepõem em profundidade com entradas clicáveis para o acervo. Artigo usa margem, serifas de leitura e inserto de arquivo. O papel claro continua nas propostas A e B, sem impor o fundo escuro ao produto.

Cada alternativa contém início, artigo e perfil em `/laboratorio/a|b|c/inicio|artigo|perfil`. As páginas de artigo e atlas levam a registros de metodologia já presentes no repositório. A personagem “Pesquisadora de Exemplo” e seus campos são fictícios e estão marcados como mock em todas as propostas.

## Sistema visual e acessibilidade

| Proposta | Tokens completos usados | Contrastes medidos das combinações de texto e informação gráfica |
| --- | --- | --- |
| A — papel | papel `#FBFAF7`; superfície secundária `#EEEAE1`; tinta `#191917`; apoio `#57544E`; filete `#C9C4BA`; vermelho `#B4231D`; branco cartográfico `#FFFFFF`. | Tinta/apoio/vermelho sobre papel: 16,87:1 / 7,23:1 / 6,29:1. Traço e legenda brancos no bloco vermelho: 6,56:1. Iniciais decorativas sobre a superfície secundária: 14,66:1. |
| B — cartografia | papel `#F0EDE3`; superfície `#E2DECE`; tinta `#262C27`; apoio `#515B50`; filete `#B8B7A7`; verde `#315F54`; campo cartográfico `#E7E4D8`; contorno/foco/ficha `#777D70`; legenda `#42473F`; rótulos do mapa `#343A34`; ficha `#FBFAF7` com tinta `#252B26`. | Tinta/apoio/verde sobre papel: 12,18:1 / 6,05:1 / 6,19:1. Texto da legenda e rótulos do mapa: 7,48:1 / 9,16:1. Tinta da ficha: 13,85:1. Contorno cartográfico: 3,33:1; rota verde no campo cartográfico: 5,69:1; contorno/foco sobre a ficha: 4,06:1; iniciais verdes sobre a superfície secundária: 9,33:1. |
| C — exposição | fundo `#171918`; superfície/ficha de perfil `#252826`; tinta `#F1EEE6`; apoio `#C2C2B9`; filete `#555953`; amarelo/foco `#E4C24D`; azul `#72BDD0`; vermelho pontual `#C34C37`; ficha ocre `#D6C28D`/tinta `#292820`; ficha de mapa `#E8E5DC`/tinta `#30322D`; linha cartográfica `#777B70`; rota `#2D756F`. | Tinta/apoio/amarelo sobre fundo escuro: 15,24:1 / 9,85:1 / 10,20:1. Tinta das fichas ocre, clara e azul: 8,43:1 / 10,29:1 / 7,50:1. Contorno do mapa na ficha clara: 3,44:1; rota: 4,29:1; pontos vermelhos: 3,78:1; iniciais claras no perfil: 12,84:1. |

As razões foram calculadas pela luminância sRGB. A escala mínima de texto normal usada para revisão foi 4,5:1; contornos informativos e foco, 3:1. A primeira revisão encontrou contorno cartográfico de B abaixo de 3:1; a cor foi escurecida para `#777D70` e o valor acima foi recalculado. A legenda segue visível junto à informação por cor. O foco de teclado tem contorno de 3px, os links de navegação expõem `aria-current`, e `prefers-reduced-motion: reduce` remove rolagem suave, transições e animações. As três propostas mantêm nomes compactos visíveis na navegação mobile e nomes completos acessíveis. Os layouts empilham colunas abaixo de 52rem e foram conferidos sem rolagem horizontal em todas as nove páginas a 320px e nas capturas de 390px.

### Tipografia e licenças

- **IBM Plex Sans:** títulos e interface; arquivo variável, com fallback `Segoe UI`/sans-serif.
- **Source Serif 4:** textos de leitura e títulos editoriais; arquivo variável, com fallback Georgia/serif.
- **IBM Plex Mono:** metadados e legendas, com fallback Consolas/monospace.

Os três arquivos estão licenciados sob SIL Open Font License 1.1. As cópias dos avisos completos estão junto aos arquivos em `public/fonts/`. Fontes são servidas localmente e carregadas com `font-display: swap`, evitando requisição remota. Fontes do laboratório não alteram a pilha tipográfica definida para o restante do produto.

## Capturas

As seis capturas abaixo são imagens reais do navegador em 1440×1000 e 390×844 CSS pixels. Foram salvas sem as imagens fornecidas como ativos do produto.

| Proposta | Desktop | Mobile |
| --- | --- | --- |
| A — editorial modernista | ![A — desktop](direcao-artistica/screenshots/a-desktop.png) | ![A — mobile](direcao-artistica/screenshots/a-mobile.png) |
| B — atlas cartográfico | ![B — desktop](direcao-artistica/screenshots/b-desktop.png) | ![B — mobile](direcao-artistica/screenshots/b-mobile.png) |
| C — museu digital | ![C — desktop](direcao-artistica/screenshots/c-desktop.png) | ![C — mobile](direcao-artistica/screenshots/c-mobile.png) |

As capturas mostram apenas a home de cada proposta, como registro comparativo de direção de arte; artigo e perfil são rotas funcionais e estão cobertos pelos testes de navegação.

## Limites e avaliação

As fichas, mapa esquemático, marca de perfil e informações sobre a pessoa são elementos de protótipo, não fontes históricas. As dez rotas (índice e nove páginas demonstrativas) são pré-renderizadas como saída estática. A folha de estilos desta tela tem 18,41 kB; o orçamento geral de estilos por componente em produção passou de 8 kB para 20 kB para comportá-la, com aviso em 19 kB. Esse limite agora também se aplica a folhas de componentes futuras. O CSS continua lazy-loaded na rota e não aumenta o CSS crítico da home. A direção A foi escolhida pelo usuário para produção. B passa a orientar cartografia e documentos; C, a exploração e o tratamento arquivístico. A comparação abaixo permanece como registro das propostas.

Licença: [IBM Plex — licença oficial](https://github.com/IBM/plex/blob/master/LICENSE.txt), [IBM Plex no catálogo Google Fonts](https://github.com/google/fonts/tree/main/ofl/ibmplexsans), [Source Serif 4 — OFL](https://github.com/google/fonts/blob/main/ofl/sourceserif4/OFL.txt).


## Consolidação da direção A

A interface principal adota modernismo editorial com fundo claro quente, vermelho, preto, tipografia expressiva e serifas de leitura. As novas referências fornecidas pelo usuário reforçam ritmo tipográfico, geometria e composição museográfica, sem autorização implícita para publicar essas imagens.

A homepage passa a oferecer busca e três modos: **Relações**, **Tempo e espaço** e **Conhecimento**. Cada modo possui uma rota própria com navegação entre modos. A home deixa de concentrar recursos em miniatura e prioriza iniciar uma investigação na primeira tela. Os limites de dados e as interações disponíveis estão documentados em SISTEMA-DE-DESIGN.md.

Capturas reais da versão consolidada: [desktop](direcao-artistica/screenshots/home-desktop.png) e [mobile](direcao-artistica/screenshots/home-mobile.png).


## Referência Stitch escolhida: Exploração do Conhecimento Histórico

O usuário escolheu a tela af5d2dc3ee024405ba33e0408ae71d2e do projeto Stitch 15545419207416735639 como referência principal da homepage. A adaptação adota terminal de busca, metadados, grade aparente, rede selecionável com ficha contextual, índice de leituras e percursos por perguntas. Os três modos continuam acessíveis por navegação própria. As fontes locais licenciadas do ATLAS permanecem; não foram importados recursos remotos de tipografia ou imagens do protótipo.

A composição foi adaptada ao acervo validado: conceito, afirmação e fonte de metodologia. Datas, coordenadas, citações, volumes, métricas de acervo, licenças documentais e selos de conformidade do protótipo Stitch não foram transferidos. Sem eventos verificados, a cronologia não é representada como disponível. O Prompt 05.5 anexado não foi executado como tarefa independente.

A rede é um componente compartilhado por home e Relações; seleção, filtro de categoria, conexões destacadas, ficha e modo de lista usam os mesmos dados e comportamentos. Capturas desta adaptação: [desktop](direcao-artistica/screenshots/home-stitch-desktop.png) e [mobile](direcao-artistica/screenshots/home-stitch-mobile.png).


A exportação local code.html, DESIGN.md e screen.png, fornecida durante a implementação, corresponde ao laboratório de experiências e foi consultada como referência complementar de grade, nós, painéis e metadados. A escolha principal da homepage permanece a tela Exploração do Conhecimento Histórico. O HTML exportado não foi executado nem incorporado à aplicação.
