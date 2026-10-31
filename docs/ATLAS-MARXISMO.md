# Marxismo e economia política: núcleo inicial

O debate em `/atlas/marxismo/valor-e-trabalho` aproxima duas teses sobre valor: a medida em trabalho que uma mercadoria pode comandar em Smith e o tempo de trabalho socialmente necessário em Marx. Não representa a diversidade inteira dos marxismos ou da obra de Smith. Todos os cinco registros e suas afirmações estão pendentes de revisão humana; a mini-trilha é demonstração em revisão.

Fontes: Smith, [The Wealth of Nations, livro I, capítulo V](https://www.gutenberg.org/files/3300/3300-h/3300-h.htm); Marx, [Capital, volume I, capítulo 1](https://www.marxists.org/archive/marx/works/1867-c1/ch01.htm), tradução de Samuel Moore e Edward Aveling, editada por Friedrich Engels, conforme o [índice da edição](https://www.marxists.org/archive/marx/works/1867-c1/index.htm); Marx, [Theories of Surplus Value, capítulo 3](https://www.marxists.org/archive/marx/works/1863/theories-surplus-value/ch03.htm); e [Stanford Encyclopedia of Philosophy, Exploitation](https://plato.stanford.edu/entries/exploitation/), sobre objeções e debates. A menção a Ben Fowkes na página do capítulo refere-se ao trecho suplementar de uma nota sobre a primeira edição, não à tradução principal. As fontes e localizadores estão no grafo e na biblioteca. As citações no mapa são excertos curtos em inglês identificados por obra e localização; não são reproduzidos fac-símiles de obras ou mapas externos. Os dois retratos do índice e do debate têm procedência e domínio público registrados em `assetLicenses` e créditos na interface. Não se presume autorização para reprodução integral de traduções ou outros ativos externos.

O mapa distingue comparação editorial e crítica documentada; não representa distância ou peso de influência. A relação de Marx com Smith remete ao exame das definições de valor no capítulo citado, sem generalizar uma posição única. As relações internas incluem autoria e apresentação de conceito; uma ligação editorial conduz ao atlas de metodologia. Não foram encontradas evidências suficientes para três relações historicamente diferenciadas com os demais atlas existentes: essas ligações continuam pendentes de pesquisa, sem converter coincidência temática em influência.

As duas teses usam afirmações existentes no grafo; o caminho `origem` conserva a seleção e o filtro de vínculos ao abrir verbetes, percorrer suas relações ou consultar a biblioteca de fontes. Os registros de pessoa, obra e conceito apresentados no mapa têm prévias compartilhadas com a busca, e seus verbetes levam de volta ao mapa temático. O exercício usa os contratos comuns de estudo, mas não grava progresso e ainda não é uma trilha histórica aprovada. Os anos da fonte de Marx referem-se à obra original; a tradução consultada é posterior. O mapa não oferece filtro cronológico, pois o recorte contém apenas duas datas fixas.

Capturas da implementação anterior: [desktop](auditoria-visual/marx-desktop-depois.png) e [mobile](auditoria-visual/marx-mobile-depois.png). As capturas com `refactor` abaixo documentam a interface atual.

## Refactor visual e navegação — 31/10/2026

- `/atlas/marxismo`: índice visual com retratos de Marx e Smith, prévias compartilhadas, obras associadas e acesso ao debate. Sem exercício ou grafo completo na entrada.
- `/atlas/marxismo/valor-e-trabalho`: comparação das teses, contexto selecionável, crítica documentada, fontes e exercício existente. Os URLs antigos com `argumento` continuam abrindo o debate.
- Homepage: somente acesso ao atlas; a rede completa foi retirada.
- `/relacoes`: o componente compartilhado agora oferece índice de entidades e vínculos dirigidos por seleção. Afirmações e fontes aparecem em categorias próprias. Foram retiradas as linhas entre posições arbitrárias, que misturavam referência editorial e relação histórica. Seguir um vínculo transfere foco ao novo contexto.
- Autoria liga pessoa à obra. Comparação é identificada como editorial. A crítica Marx → Smith cita os manuscritos de 1861–1863, sem fingir uma resposta entre os dois excertos de 1776 e 1867.
- Motivos vetoriais de atlas reutilizados; ícones de livro e debate são SVG original da interface, sem função de evidência histórica.
- Motion: apenas aproximação discreta do retrato por ponteiro (180 ms); sem movimento por teclado ou redução de movimento. Nenhuma simulação física ou movimento contínuo dos registros.
- A regra de reprodução autorizada foi extraída do componente `licensed-asset` e reutilizada pelos retratos; se a licença for retirada, a imagem deixa de ser exibida. A revisão histórica continua pendente.

### Ativos externos

Os JPEGs locais são miniaturas de 500 px baixadas das páginas abaixo em 31/10/2026. Enquadramento por CSS, sem alterar os arquivos. Uso documental de identificação das pessoas; não indicam apoio político nem validação editorial.

- `public/images/atlas/karl-marx.jpg`: John Jabez Edwin Mayall e ateliê, Wien Museum, inventário 111621/3. [Registro e licença](https://commons.wikimedia.org/wiki/File:Karl_Marx_by_John_Jabez_Edwin_Mayall_-_Wien_Museum_(cropped).jpg). Domínio público, PD-old e PD-US-expired; não atribuímos data exata ao retrato.
- A versão recortada de Marx, fornecida pelo próprio Commons, exclui a escala de cores do escaneamento museográfico; não houve edição local do JPEG.
- `public/images/atlas/adam-smith.jpg`: retrato Muir, autoria desconhecida, c. 1800, versão com cores editadas descrita pelo repositório. [Registro e licença](https://commons.wikimedia.org/wiki/File:Adam_Smith_(Muir_portrait).jpg). Domínio público, PD-old e PD-US-expired.

### Evidências do refactor

Capturas desktop e mobile do índice, debate, relações e homepage em `docs/auditoria-visual/*-refactor-*.png`, geradas por `node scripts/capture-visual-audit.mjs --atlas-refactor`. As capturas anteriores permanecem como histórico.

O escopo editorial continua restrito aos cinco registros existentes. Não foram adicionadas outras ideologias, personalidades ou influências sem pesquisa. O exercício continua demonstrativo e sem persistência; isso não foi alterado neste refactor.

Verificações executadas: 155 testes unitários em 16 arquivos; 16 E2E Chromium; lint e typecheck sem erros; build com 41 rotas prerenderizadas; links internos de 42 páginas estáticas. Os E2E incluem índice → pessoa → retorno, índice → debate, tese → conceito → obra → retorno, prévia/Escape, filtro, exercício, teclado, mobile e redução de movimento. Axe não apontou violações graves ou críticas no índice mobile; isso não representa auditoria WCAG completa. Uma incompatibilidade de nome acessível no link da marca foi encontrada e corrigida.

Inspeção visual: capturas em 1440 × 900 e 390 × 844, com leitura do layout renderizado. O cabeçalho/rodapé existentes ainda ocupam bastante altura no mobile; foram preservados. A lista de relações usa uma área rolável para escolher o registro e deixa o contexto abaixo, sem sobreposição. Não houve testes em aparelho físico ou outros motores de navegador.
