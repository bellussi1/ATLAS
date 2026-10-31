# Experiência de descoberta e leitura

Esta entrega conecta a exploração existente ao ato de ler. Ela implementa prévias de texto, percurso entre evidências, navegação por seções e sugestões editoriais de continuidade. Não representa a execução integral das seis famílias propostas no Prompt 05.5.

## Componentes e contratos

- AtlasReadingPreviewDirective, em shared/reading-preview.ts, recebe um EditorialEntry existente em um botão nativo. O painel exibe resumo, primeiro trecho e status editorial; o link abre o texto completo pela rota canônica do formato. O texto é reaproveitado do acervo, sem resumo gerado ou citação inventada.
- O painel usa Angular CDK Dialog 21.2.14 (MIT), compatível com a série Angular 21. Escape, backdrop, contenção de foco, isolamento do fundo e restauração de foco são delegados ao CDK. O primeiro foco vai para Fechar; o painel tem nome associado ao heading e rolagem própria em telas pequenas. A largura é limitada pela viewport e a altura por 90dvh.
- AtlasReadingOutlineComponent recebe as seções do texto e produz links com fragmentos reais. O índice recolhível acompanha a leitura com position: sticky. Acionar uma seção recolhe o índice e transfere o foco ao heading; a margem de rolagem mantém o título abaixo da faixa.
- O indicador mede a posição da viewport no conjunto de seções, não comprova que o texto foi lido. Escuta scroll passivo com requestAnimationFrame; os listeners são removidos ao sair da tela. A seção ativa é indicada por aria-current.
- AtlasContinueReadingComponent oferece perguntas e razões para continuar em textos existentes. Exclui o destino atual; o percurso é editorial e metodológico, sem alegar relações históricas novas ou personalização. Também leva de volta à rede.
- Na rede, Explorar uma conexão seleciona o registro conectado e abre seu contexto. Ao seguir uma ligação, o filtro retorna a Todos para tornar o destino visível. As conexões continuam derivadas de entityId/sourceIds do atlas validado.

## Responsividade, movimento e navegação

A implementação mantém o design system editorial e os tokens existentes. Não foi adicionado um tema Material. A grade continua mobile-first; o CDK cuida da infraestrutura do painel, e CSS define sua aparência.

A prévia usa --motion-standard para uma entrada curta de opacidade e deslocamento. A regra global prefers-reduced-motion remove essa animação. Não há animação contínua nem bloqueio da rolagem da página durante a leitura; o bloqueio do fundo ocorre apenas enquanto a prévia modal está aberta.

O Router tem restauração de scroll e navegação por âncora habilitadas. Links e histórico continuam sendo URLs normais, com consultas preservadas nos links do índice. Não há armazenamento de histórico pessoal de leitura ou pontuação de engajamento.

## Integração e custo

Uso na home: botão [appReadingPreview] com o registro editorial. Uso nas duas páginas de leitura: app-reading-outline com sections e app-continue-reading com currentPath. A prévia importa DialogModule diretamente de @angular/cdk/dialog para ser resolvida corretamente pelo compilador de desenvolvimento.

Referência técnica: https://material.angular.dev/cdk/dialog/overview

Foi adicionada uma dependência, @angular/cdk. No primeiro build comparativo desta implementação, o total inicial passou de 321,30 kB para 335,24 kB brutos e a fatia lazy da home passou de 13,25 kB para 94,01 kB (22,55 kB estimados de transferência), incluindo a infraestrutura de dialog/overlay. Nenhum orçamento global foi ampliado. O acervo histórico e os limites editoriais permanecem explícitos.

## Verificação e limites

Testes automatizados cobrem abertura da prévia, nome acessível, foco interno, Escape e retorno ao acionador, navegação ao texto completo, links de seção, foco em heading, exclusão da leitura atual das sugestões e percurso conceito → afirmação → fonte.

No Chrome em 390 px foram conferidos abertura por Enter, circulação de foco por Shift+Tab, Escape e retorno de foco, transição da prévia ao texto e ausência de overflow horizontal. O movimento reduzido foi emulado. A navegação por seções foi revisada para manter o título fora da área ocupada pelo índice.

Ainda não houve auditoria integral WCAG nem avaliação com leitores de tela. As sugestões usam os exemplos de metodologia disponíveis; novos percursos temáticos precisam de conteúdo histórico validado.


Na revisão móvel final de uma âncora, o índice terminou em 92 px e o heading de destino começou em 116 px, com foco no heading e seção ativa correta. Assim o título permaneceu visível abaixo da faixa. Capturas: [prévia móvel](direcao-artistica/screenshots/reading-preview-mobile.png) e [leitura móvel](direcao-artistica/screenshots/reading-mobile.png).
