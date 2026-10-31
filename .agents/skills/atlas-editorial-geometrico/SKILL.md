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

## Linguagem visual

- Base: papel claro, tinta quase preta, vermelho de ação. A geometria vem do modernismo suíço, de livros/atlas e de arquivos exploráveis; as imagens de referência não são ativos autorizados para publicação.
- Ler os tokens reais de src/styles.scss antes de escolher cores. Base atual: #FBFAF7, #1C1C1A, vermelho #B4231D. Secundárias: verde #85BDB5, ocre #EDC45B, rosa #E9B4BF e índigo #37395E.
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

AtlasEditorialTextComponent associa um pequeno vocabulário a destinos editoriais reais. Ele preserva o texto, limita links a dois destinos diferentes por trecho e evita links para a própria página quando currentPath é informado. Não expandir esse vocabulário com associações históricas sem evidência. Não gerar links por HTML não validado, nem pintar palavras vermelhas só por decoração.

Selecionar uma ficha deve atualizar título, resumo, trecho, prévia e destino em conjunto. Manter a seleção comunicável e o foco no controle. Cada interação visual precisa de operação por teclado/toque e caminho claro para voltar ou continuar.

## Movimento

Os tokens e componentes existentes são a fonte de verdade. Seleção ocasional por ponteiro pode usar opacidade curta (atualmente 180ms); pressione e confirme sem bloquear entrada. Cancelar animação anterior ao inverter ou selecionar novamente. Teclado e movimento reduzido são imediatos. Não animar páginas repetidamente, nem mover texto durante a leitura.

A prévia usa Angular CDK Dialog para foco, Escape e backdrop; aparência é editorial, não um tema Material. Não adicionar biblioteca para um fade. Se uma alteração exigir auditoria maior, consultar as skills de movimento instaladas; não transformar uma tarefa de implementação autorizada em entrega apenas de recomendações.

## Executar no repositório

1. Conferir AGENTS.md, componentes, tokens, dados e diff atual. Ver a referência aprovada quando a composição for afetada.
2. Definir o que a forma e a interação permitem descobrir com os dados disponíveis. Desenhar uma composição específica para essa função.
3. Implementar em Angular standalone, Signals, templates e SCSS existentes. Preservar rotas e componentes funcionais.
4. Conferir seleção, links reais, retorno de foco, contraste, reflow e reduced motion conforme o escopo. Executar as verificações exigidas pelo repositório e capturar a interface quando o visual mudar.

Não inventar documentos, fontes, citações, datas, coordenadas, licenças, métricas ou revisão humana. Os registros disponíveis podem ser apenas metodologia: apresentá-los como tal. Nunca declarar conformidade WCAG integral sem auditoria.
