---
name: atlas-editorial-geometrico
description: Projetar e revisar a identidade e as interações do ATLAS, seguindo a mesa de pesquisa aprovada, o modernismo editorial e a geometria informacional. Usar em telas, componentes, leitura e exploração do ATLAS; não aplicar esta identidade a outros projetos.
---

# ATLAS editorial geométrico

Esta é a direção específica do ATLAS, aprovada pelo usuário neste projeto. O produto é um acervo educacional público de história, política, economia e sociedade. A interação deve abrir uma descoberta compreensível e um próximo caminho.

## Referência que orienta decisões

Veja [a mesa aprovada](references/mesa-aprovada.png) ao reconstruir composição ou avaliar divergências visuais. Ela registra a base aprovada; as cores secundárias e os termos navegáveis abaixo são a evolução solicitada depois dessa aprovação.

Preservar a ideia de mesa de pesquisa: índice, ficha selecionada, trecho legível, contexto e continuidade. Não reproduzir mecanicamente a mesma mesa em todas as telas: um artigo pede leitura estável, um grafo pede relações e seleção. Manter família visual e comportamento comum.

O usuário rejeitou a home como sequência de painéis minúsculos, rótulos numerados, símbolos genéricos e cards iguais. Também rejeitou repetir a UI de outros projetos. Gastar a expressividade no próprio conteúdo e em uma composição intencional; manter o restante quieto.

## Referências como uma biblioteca viva

O usuário quer que novas referências alimentem continuamente esta skill e que a identidade seja expressiva, extravagante e fora dos padrões convencionais de UI. Ao receber novas imagens, comparar o que elas acrescentam à base aprovada: geometria, ritmo, cores, materiais, peso tipográfico, composição e comportamento. Incorporar decisões duradouras e exemplos observáveis; não acumular prescrições contraditórias nem copiar literalmente peças de terceiros. Registrar a evolução no documento de direção artística e sincronizar a skill instalada com a versão do repositório.

Buscar ativamente momentos interessantes de seleção, aproximação, hover, âncora, scroll, transição e continuidade. Variar escala, peso, cor e organização espacial com intenção. Uma nova referência deve provocar uma investigação visual, não apenas mais uma cor ou card. A ousadia pertence ao projeto e não deve ser importada automaticamente de outros trabalhos.

## Atlas Editorial consolidado · 01/11/2026

Atlas Editorial é a direção artística principal do ATLAS: modernismo suíço com jornalismo visual, história ilustrada e museografia digital. A página de tradição funciona como uma publicação histórica navegável. Sua grade organiza o conteúdo; não transforma capítulos em um dashboard.

As três referências novas acrescentam comportamentos diferentes à identidade:

- A publicação de Rosmarie Tissi mostra como uma grade tipográfica rigorosa pode sustentar pontos, linhas e vermelho sem perder espaço em branco. Usar essa lógica para hierarquia e relações; não copiar o desenho de outra pessoa.
- O Yemen Peace Project integra texto, fotografia e visualizações na mesma história e muda a composição em telas menores. Usar para pensar continuidade entre narrativa e dado, não como modelo de paleta ou como fonte de conteúdo do ATLAS.
- A publicação sobre a Revolução Cultural coloca datas, documentos, retratos e texto em uma cronologia editorial. Usar para dar escala e evidência visual ao tempo histórico, sem sugerir causalidade pela proximidade.

Na prática, variar a composição dos capítulos conforme a tarefa: constelações assimétricas para pensadores, spreads de tamanho variável para documentos, timeline legível com seleção e conexões contextuais para eventos, diagrama apenas quando as relações têm fonte. Não repetir a mesma grade em Marxismo e Liberalismo. Compartilhar tipografia, paleta, navegação e motion; dar a cada assunto o seu ritmo.

O índice comum de leitura alinha capítulos, progresso, capítulo atual, retorno ao ponto anterior e controle manual de movimento. No desktop ele mantém as âncoras à vista; no celular usa um seletor de capítulo, sem esconder o texto. Mudança de capítulo navega para uma âncora; filtros e seleção não devem deslocar a página.

Aplicação observável nesta rodada: substituir índices duplicados por `IdeologyReadingIndexComponent`; tratar pensadores e documentos do Marxismo como composições assimétricas; apresentar Liberalismo como atlas exploratório com revisão editorial pendente; manter o índice textual de relações sincronizado com o filtro do grafo. Esses exemplos orientam decisões futuras e não autorizam acrescentar conteúdo histórico não verificado.

As imagens enviadas são referência visual, não licença de publicação. Consultar `docs/design/PAGE_STANDARD.md` para o contrato completo; preservar os ativos Commons já licenciados e seus metadados.

## Marca

A marca aprovada é a assinatura tipográfica ATLAS, com letras pesadas e próximas para sugerir conexão, e ponto vermelho final. Não adicionar um símbolo separado à esquerda. Os arquivos oficiais ficam em public/brand: atlas-logo.svg (principal), atlas-logo-inverse.svg (branca com ponto vermelho), atlas-logo-mono.svg (tinta) e atlas-logo-white.svg (inteiramente branca). Os contornos derivam da IBM Plex Sans Bold local, com espaçamento ajustado, sem depender de fontes externas. Preservar proporção, proximidade entre letras e espaço de respiro; não deformar ou recriar a marca em CSS ou texto aproximado. atlas-symbol.svg reduz a assinatura a A e ponto vermelho.

O favicon usa o A tipográfico e o ponto vermelho sobre papel, em public/brand/favicon.svg e public/favicon.ico. Ícones de aba são estáveis e precisam ser legíveis em escala pequena. A expressividade da marca não depende de manter a logo em movimento.

## Linguagem visual

- Base: papel claro, tinta quase preta, vermelho de ação. A geometria vem do modernismo suíço, de livros/atlas e de arquivos exploráveis; as imagens de referência não são ativos autorizados para publicação.
- Ler os tokens reais de src/styles.scss antes de escolher cores. Base V4: #FBF8F1, #141211, vermelho de texto/ação #B81D16. Secundárias: verde #7FBDB5, ocre #EEC35A, rosa #EAB0C2 e índigo #363A5F.
- Vermelho em termos e ações que levam a um conteúdo real, foco e seleção. Links dentro do texto precisam também de sublinhado. Em fundo vermelho, usar texto claro sublinhado com contraste.
- Secundárias distinguem suportes e formatos; não comunicar categoria apenas pela cor. Motivos geométricos e rótulos textuais devem permanecer coerentes. Espaço em branco continua importante: não pintar todas as superfícies.
- Reutilizar AtlasEditorialMarkComponent para os motivos de verbete, artigo e atlas. SVG original, oculto da árvore acessível quando o rótulo adjacente já dá o significado. A geometria acompanha seleção/navegação; não fingir mapa, gráfico, proporção ou evidência quantitativa.
- Tipografia local aprovada: IBM Plex Sans para estrutura, Source Serif 4 para trechos e leitura, IBM Plex Mono para metadados pontuais. Usar caixa normal nos textos de interface; não transformar cada título em um rótulo de catálogo.
- Assimetrias e pequenas sobreposições são permitidas no desktop; conteúdo e foco nunca podem ser cobertos. Mobile usa fluxo simples e seletor compacto. O título, o trecho e a ação precisam aparecer cedo.

## Cabeçalho e rodapé como composição

O usuário autorizou explorar header e footer fora das convenções de uma barra de links e uma linha de copyright. Eles podem funcionar como assinatura tipográfica, portas geométricas e pôster navegável, mantendo nomes de destinos, navegação principal e link de pular conteúdo. Não impor essa estrutura a cada nova tela.

É permitido brincar com composição gráfica controlada pela pessoa: alternar arranjos de motivos, por exemplo. A variação deve ser reconhecível como composição, sem alegar dados históricos. Manter os destinos e a ordem de foco estáveis; não rotacionar palavras, nem iniciar um loop automático. Uma troca ocasional por ponteiro pode animar transform em até 200ms; teclado e reduced motion são imediatos.

## Interação que abre caminhos

Partir de verbos concretos: selecionar ficha, aproximar leitura, investigar fonte, seguir relação, continuar no texto. Reutilizar as funções existentes em vez de criar outro mecanismo equivalente.

KnowledgeTextComponent associa termos selecionados a registros existentes e abre KnowledgeContextComponent via CDK Dialog. Preserva o texto com interpolação Angular, limita ocorrências interativas e distingue conceito, pessoa e obra por rótulos. O contexto permite seguir conexões com retorno interno e fontes. AtlasEditorialTextComponent permanece legado e seus destinos não orientam as três páginas atuais.

Selecionar uma ficha deve atualizar título, resumo, trecho, prévia e destino em conjunto. Manter a seleção comunicável e o foco no controle. Cada interação visual precisa de operação por teclado/toque e caminho claro para voltar ou continuar.

## Movimento

As skills de animação e motion fazem parte da prática do ATLAS: find-animation-opportunities para escolher os momentos, animate e interaction-design para construir, improve-animations e 12-principles-of-animation para revisar e corrigir. Usar as fases pertinentes ao trabalho; não trocar uma implementação autorizada por uma entrega só de recomendações.

Explorar scroll e âncoras como orientação e narrativa quando houver conteúdo que os sustente. Preservar o controle da pessoa sobre a rolagem, o foco no destino e o caminho de volta. Gestos complexos precisam de alternativa por botão/teclado. Não mover parágrafos enquanto são lidos. Ser expressivo na composição e nas respostas às ações, sem impor um espetáculo permanente.


Os tokens e componentes existentes são a fonte de verdade. Seleção ocasional por ponteiro pode usar opacidade curta (atualmente 180ms); pressione e confirme sem bloquear entrada. Cancelar animação anterior ao inverter ou selecionar novamente. Teclado e movimento reduzido são imediatos. Não reiniciar a entrada da página em mudanças de busca ou âncoras, nem mover texto durante a leitura.

A prévia usa Angular CDK Dialog para foco, Escape e backdrop; aparência é editorial, não um tema Material. Não adicionar biblioteca para um fade. Se uma alteração exigir auditoria maior, consultar as skills de movimento instaladas; não transformar uma tarefa de implementação autorizada em entrega apenas de recomendações.

## Executar no repositório

1. Conferir AGENTS.md, componentes, tokens, dados e diff atual. Ver a referência aprovada quando a composição for afetada.
2. Definir o que a forma e a interação permitem descobrir com os dados disponíveis. Desenhar uma composição específica para essa função.
3. Implementar em Angular standalone, Signals, templates e SCSS existentes. Preservar rotas e componentes funcionais.
4. Conferir seleção, links reais, retorno de foco, contraste, reflow e reduced motion conforme o escopo. Executar as verificações exigidas pelo repositório e capturar a interface quando o visual mudar.

Não inventar documentos, fontes, citações, datas, coordenadas, licenças, métricas ou revisão humana. Os registros disponíveis podem ser apenas metodologia: apresentá-los como tal. Nunca declarar conformidade WCAG integral sem auditoria.


## Container comum e continuidade

Usar --grid-max (90rem incluindo padding) e --grid-gutter para alinhar os limites de header, breadcrumbs, páginas e footer. Manter medidas menores para o texto dentro desse container. Não recriar navegação textual dos três modos: as portas coloridas do header já cumprem essa função. A entrada de página usa os tokens de movimento existentes, preservando troca imediata por teclado/reduced motion e sem reiniciar em busca ou âncoras.


## Referência Claude — Tudo se liga

O HTML enviado pelo usuário em 31/10/2026 acrescenta abertura tipográfica de grande escala, palavra de ação vermelha, suporte verde com recorte geométrico, divisórias fortes, rede e painel contextual lado a lado e fichas editoriais. Aplicar essa linguagem ao miolo; header, footer, logo e favicon foram explicitamente preservados. Reutilizar a rede e as prévias existentes. Não importar afirmações, relações, datas ou licenças ilustrativas do protótipo como registros validados. A rede precisa alocar uma posição por registro; no mobile, priorizar lista operável.


## Páginas V4 de ideologias e tradições

O padrão em `docs/design/PAGE_STANDARD.md` orienta esta família de páginas: uma leitura contínua, capítulos por âncoras, índice com estimativas, progresso e retorno. Variar a composição por assunto e capítulo; fontes e lacunas editoriais permanecem próximas da afirmação. A home encaminha às leituras realmente disponíveis; não reintroduzir o hub removido sem pedido. Não converter polêmicas em descendência genealógica.

O HTML Design System V4 é referência de composição e de tokens, não de dados históricos. Preservar a marca e as fontes locais aprovadas; não importar dependências de fontes remotas só para reproduzir a demonstração. Motion V4: 120/240/480 ms e cubic-bezier(.2,.7,.2,1), controle manual de movimento reduzido e preferência do sistema. Seleções alteram o contexto sem deslocar a leitura; somente a navegação de capítulo deve rolar até a âncora.

## Enciclopédia exploratória: contrato de interação

Esta revisão exige aplicação concreta, inicialmente no Marxismo, com reutilização pelo Liberalismo. Manter o escopo público autorizado; o padrão não cria páginas novas sozinho. A referência operacional é [Contrato de exploração](references/ideology-interaction.md): estabilidade, semântica de ação, cards, hipertexto, timeline, grafo, princípios, vertentes e argumentação. Conferir também `docs/design/PAGE_STANDARD.md` no repositório.

A direção é maximizar a riqueza de respostas significativas. Todo ponto de exploração comunica a ação antes do hover, responde a foco/clique/toque e abre contexto útil. Cards densos podem usar CDK Dialog com dimensão previsível e restauração de foco/scroll; expansão inline intencional continua permitida quando ajuda a compreensão. Termos interativos são botões/links com pista persistente; ênfase estática usa `strong`/`em` e não finge ação.

Estabilidade é critério de aceite: reservar mídia e estados, manter geometria de painel e coordenadas de grafo, não substituir narrativa hidratada por loader. Medir CLS e também posição do gatilho, scroll e tamanho do painel antes/depois. Não confundir CLS baixo com ausência de deslocamento após input. Não prometer zero universal.

Princípios explicam problema, pressuposto, mecanismo e divergência. Vertentes têm recorte, diferenças e fontes; genealogia não se deduz de uma grade ou polêmica. Debate tem defesa atribuída, crítica atribuída, resposta documentada ou ausência explícita, e limites/controvérsias. Classificar a natureza da posição e a vertente a que se aplica. Ensinar reconstrução e avaliação, sem propaganda, espantalho ou simetria inventada.

Usar motion contextual em termos, fichas, filtros, documentos e conexões; sem loops ou deslocamento de parágrafos em leitura. Hover não muda o fluxo. Teclado/reduced motion preservam o conteúdo e o feedback imediato. Validar desktop/mobile, ponteiro/teclado/toque, cliques rápidos, retorno ao contexto, imagens lentas e normal/reduzido; registrar o comportamento realmente observado.

## Cartaz geométrico · 01/11/2026

As referências de cartazes Bauhaus/suíços (mosaicos de quartos de círculo, meias-luas, listras, pontos, explosões e olhos; Farol Brasil; capas em grade) consolidam uma linguagem de cartaz para o miolo. `AtlasGeometricMosaicComponent` (`shared/ui/geometric-mosaic`) gera mosaicos SVG originais, determinísticos por `seed` (SSR e hidratação iguais), com paletas `atlas`, `marx`, `liberal` e `tissi` (preto, papel e vermelho para rede). A proporção é reservada no CSS; recompor nunca desloca o layout. O mosaico é decorativo (`aria-hidden`) e não codifica dados. Hover gira motivos apenas com ponteiro fino e sem movimento reduzido; a recomposição é sempre acionada pela pessoa.

Padrões comuns: `atlas-band-heading` (marcador geométrico com letra, título display com palavra vermelha e lead curto), números de capítulo em formas geométricas alternadas, fichas com borda de 3px e sombra deslocada sólida, faixa de tinta para busca. O laranja `--color-orange-paper` entra apenas como superfície decorativa. Header e footer seguem preservados.

## Motion de leitura · 01/11/2026

`AtlasRevealDirective` (`appReveal`) revela blocos uma única vez antes de entrarem na tela: o estado oculto só existe sob `html.atlas-reveal`, nunca para o que já está visível no carregamento, com movimento reduzido ou sem JavaScript. Variantes: padrão (subida curta), `data-reveal="wipe"` (cortina horizontal para títulos) e `data-reveal="shape"` (formas geométricas giram ao entrar); filhos com `data-stagger` e `--stagger` entram em cascata. A troca de rota usa View Transitions do Router (cortina vertical na entrada, header fixo), pulada para teclado, movimento reduzido e mudanças dentro da mesma rota. `atlas-press` e `atlas-arrow` padronizam pressão e direção das setas.
