# Visualizações históricas

As visualizações usam HTML, CSS e SVG nativos; não foi adicionada biblioteca de gráficos. Os dados atuais são pequenos, estruturados e já chegam validados por Zod, então uma dependência de visualização não acrescentaria uma capacidade necessária.

## Linha do tempo

Em `/tempo-e-espaco`, `AtlasHistoricalVisualizationsComponent` usa somente `temporalExtent` registrado nas entidades. O filtro por tipo e a seleção de um registro são controles nativos. Intervalos são desenhados apenas quando início e fim estão presentes; períodos com limite ausente mantêm o rótulo original e recebem somente uma marca para o ano conhecido. Entidades sem ano não aparecem no eixo. A lista com períodos e links de verbete é a alternativa textual navegável, também usada em telas estreitas.

O painel selecionado exibe contexto, precisão, incerteza cadastrada e as fontes derivadas das citações e relações com evidências. O eixo representa anos, não duração causal, influência ou simultaneidade.

## Rede de relações

A rota `/relacoes` reutiliza `AtlasEvidenceNetworkComponent`. Cada posição organiza a navegação; linhas e rótulos vêm das relações, afirmações e citações cadastradas. Seleção, filtro por tipo e modo lista funcionam sem arrastar. Fontes abrem em suas âncoras próprias na biblioteca. A lista contextual mantém relações, rótulos, contextos e links navegáveis sem depender da geometria.

## Comparador

O comparador permite selecionar até três entidades com botões e apresenta tipo, período, precisão, incerteza cadastrada, contexto e fontes vinculadas. Ele não calcula notas, rankings ou pontuações ideológicas. Campos ausentes permanecem explícitos.

## Fontes e limites cartográficos

Cada visualização apresenta seu método e seus limites perto da interface. A rede consulta relações e evidências validadas; a linha do tempo consulta períodos estruturados; o comparador apenas coloca esses campos lado a lado. Os dados atuais incluem entidades sobre a Constituinte e a Constituição de 1988, sem coordenadas ou polígonos de fronteiras históricas.

Por isso, o ATLAS não desenha fronteiras atuais como se fossem históricas, nem usa limites modernos como aproximação visual de uma formação política do passado. Uma futura representação de entidades políticas históricas exige geometria com validade temporal, fonte e licença registradas, indicação explícita do período e da incerteza, além de uma alternativa textual. Sem esses dados, a interface deve mostrar metadados e relações, sem preencher o mapa.

O eixo visual é ocultado em telas estreitas, onde a lista textual selecionável ocupa o lugar principal. A tabela comparativa pode rolar horizontalmente; os controles são focáveis e todas as seleções funcionam sem gesto de arrastar. Não há movimento contínuo.
