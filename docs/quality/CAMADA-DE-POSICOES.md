# Camada de posições estimadas (análise separada do acervo)

Data: 02/11/2026. Revisão por agente, sem revisão humana. Todos os registros seguem `editorialStatus: pending`.

## O que é

Uma camada analítica que compara leituras de uma tradição em seis eixos. Cada posição é estimada a partir de **afirmações atribuídas e com fonte**, nunca a partir de questionário respondido por modelo nem de rótulo. Fica num bloco `positions` dentro de uma leitura, rotulada como estimativa.

Não é o acervo histórico: as relações do grafo continuam tipadas e com proveniência (`relation-types.ts`). Proximidade entre posições não vira influência, origem ou causa.

## Eixos (definições de trabalho)

| Eixo          | Polo −1                | Polo +1                |
| ------------- | ---------------------- | ---------------------- |
| `propriedade` | coletiva ou pública    | privada                |
| `mercado`     | planejamento central   | mercado                |
| `igualdade`   | igualdade material     | liberdade individual   |
| `poder`       | poder estatal ampliado | limites institucionais |
| `escala`      | internacionalismo      | soberania nacional     |
| `revolucao`   | ruptura revolucionária | reforma gradual        |

Definições de trabalho para comparar leituras, não tipologia aceita. Eixo novo passa por revisão editorial. Não reaproveitamos eixos de outros projetos.

## Afirmação

Cada registro em `supplement.positions` (`src/content/graph/marxismo.json`) tem: `entityId`, `axisId`, `value` (−1 a +1), `confidence` (alta, média ou baixa), `classification` (tese atribuída, interpretação ou hipótese), `statement` (paráfrase em português sustentada pelo texto citado), `sourceIds` (obrigatório) e `editorialStatus` (`pending`). O validador recusa fonte inexistente, valor fora da escala, eixo desconhecido e status revisado sem revisão.

Regra de valor: uma afirmação direta sobre o eixo recebe valor próximo do polo; uma afirmação que exige inferência recebe classificação `interpretação` e confiança média, com valor moderado.

## Cálculo e estados

- Peso por confiança: alta 1, média 0,6, baixa 0,3. O valor é a média ponderada.
- **insuficiente**: nenhuma afirmação sobre o eixo. Não se preenche com neutro.
- **indicativa**: uma afirmação, ou afirmações que dependem de uma só fonte.
- **estimada**: duas ou mais afirmações de duas ou mais fontes distintas, com amplitude menor que 1.
- **divergente**: duas ou mais fontes distintas com amplitude de 1 ou mais. Mostra o intervalo; a média não esconde a divergência.

## Afirmações semeadas (19) e verificação

Verificação feita por extração dos textos primários (marxists.org), com trecho citado pelo extrator. Não foi feita leitura integral de cada capítulo. Os textos são traduções para o inglês; as paráfrases em português devem ser conferidas contra a edição de referência por quem revisar.

| Entidade         | Eixo        | Valor | Confiança | Classificação | Fonte (localização)                                                                                                                                 |
| ---------------- | ----------- | ----- | --------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Karl Marx        | propriedade | −0,8  | média     | tese          | Manifesto, cap. 2: "abolition of private property"                                                                                                  |
| Karl Marx        | propriedade | −0,9  | alta      | tese          | Crítica do Programa de Gotha, seção 3: "common ownership of the means of production"                                                                |
| Karl Marx        | igualdade   | −0,9  | alta      | tese          | Gotha, seção 3: "From each according to his ability, to each according to his needs"                                                                |
| Karl Marx        | igualdade   | −0,6  | média     | interpretação | Gotha, seção 3: "This equal right is an unequal right for unequal labor"                                                                            |
| Karl Marx        | igualdade   | −0,6  | média     | interpretação | Manifesto, cap. 2: "abolition of bourgeois individuality, bourgeois independence, and bourgeois freedom"                                            |
| Karl Marx        | poder       | −0,7  | média     | tese          | Manifesto, cap. 2: "centralise all instruments of production in the hands of the State"                                                             |
| Karl Marx        | poder       | +0,6  | média     | interpretação | Guerra civil na França, cap. 5: Comuna como "working, not a parliamentary body"; "destruction of the state power"; exército permanente e burocracia |
| Friedrich Engels | mercado     | −0,8  | alta      | tese          | Socialismo: utópico e científico, cap. 3: "Anarchy reigns in socialized production"; "a social regulation of production upon a definite plan"       |
| Friedrich Engels | mercado     | −0,6  | média     | interpretação | Manifesto (coautoria), cap. 2: centralização dos instrumentos de produção no Estado                                                                 |
| Friedrich Engels | revolução   | −0,9  | média     | tese          | Manifesto (coautoria), cap. 4: "forcible overthrow of all existing social conditions"                                                               |
| Friedrich Engels | revolução   | +0,6  | média     | interpretação | Introdução de 1895: "The time of surprise attacks ... is past"; "universal suffrage"                                                                |
| Eduard Bernstein | revolução   | +0,8  | alta      | tese          | Prefácio de 1899: "the movement means everything for me ... 'the final aim of socialism' is nothing"                                                |
| Eduard Bernstein | revolução   | +0,7  | média     | interpretação | Crítica de Luxemburg (leitura atribuída à autora): "to make of social reforms, the means of the class struggle, its aim"                            |
| Eduard Bernstein | poder       | +0,5  | média     | interpretação | Prefácio de 1899: "democracy is, at any given time, as much government by the working classes as these are capable of practising"                   |
| Rosa Luxemburg   | revolução   | −0,8  | alta      | tese          | Reforma ou revolução, introdução: "The struggle for reforms is its means; the social revolution, its aim"                                           |
| Rosa Luxemburg   | poder       | +0,7  | alta      | tese          | A revolução russa, cap. 3: "democratic forms of political life ... indispensable foundations of socialist policy"                                   |
| Vladimir Lenin   | revolução   | −0,9  | alta      | tese          | O Estado e a revolução, cap. 3: "to smash the old bureaucratic machine at once ... the direct and immediate task of the revolutionary proletariat"  |
| Vladimir Lenin   | poder       | −0,7  | média     | tese          | O Estado e a revolução, cap. 3: proletariado "organized as the ruling class" como etapa transitória                                                 |
| Mao Zedong       | revolução   | −0,9  | alta      | tese          | Problemas da guerra e da estratégia, seção II: "Political power grows out of the barrel of a gun"                                                   |

## Resultado (bloco de posições no capítulo Debates)

| Entidade         | Eixo        | Estado         | Valor | Leitura                                                                             |
| ---------------- | ----------- | -------------- | ----- | ----------------------------------------------------------------------------------- |
| Karl Marx        | propriedade | estimada       | −0,86 | Manifesto e Gotha concordam                                                         |
| Karl Marx        | igualdade   | estimada       | −0,74 | Gotha e Manifesto concordam                                                         |
| Karl Marx        | poder       | **divergente** | −0,05 | Manifesto (−0,7) e Comuna (+0,6) divergem: a camada mostra o intervalo, não a média |
| Friedrich Engels | mercado     | estimada       | −0,72 | Manifesto e 1880 concordam                                                          |
| Friedrich Engels | revolução   | **divergente** | −0,15 | Manifesto (−0,9) e introdução de 1895 (+0,6) divergem                               |
| Eduard Bernstein | revolução   | estimada       | 0,76  | Prefácio e crítica de Luxemburg                                                     |
| Eduard Bernstein | poder       | indicativa     | 0,5   | uma fonte                                                                           |
| Rosa Luxemburg   | revolução   | indicativa     | −0,8  | uma fonte                                                                           |
| Rosa Luxemburg   | poder       | indicativa     | 0,7   | uma fonte                                                                           |
| Vladimir Lenin   | revolução   | indicativa     | −0,9  | uma fonte                                                                           |
| Vladimir Lenin   | poder       | indicativa     | −0,7  | uma fonte                                                                           |
| Mao Zedong       | revolução   | indicativa     | −0,9  | uma fonte                                                                           |

Os demais eixos aparecem como **sem evidência suficiente**.

O maior contraste estimado do bloco fica em revolução, entre Bernstein (0,76) e Lenin (−0,9), com diferença de 1,66 com os dados disponíveis.

## Como a verificação foi feita (e o que falhou)

- Usadas: textos primários em marxists.org (Manifesto, Gotha, Engels 1880 e 1895, Luxemburg 1918, Lenin 1917, Marx 1871, Mao 1938, Bernstein 1899).
- Não usada para propriedade de Marx: a Stanford Encyclopedia of Philosophy. O trecho lido não sustentou a afirmação.
- Não localizado: a frase de Luxemburg sobre liberdade "apenas para os apoiadores do governo" nos capítulos lidos (1–4). Usou-se o trecho do capítulo 3 sobre formas democráticas.
- Não obtido: "Fundamentos do leninismo" (Stalin), URL devolveu 404. Escala para Stalin não foi semeada.

## Limites

- Dezenove afirmações cobrem seis entidades e seis eixos; a maioria dos eixos continua sem evidência. A camada é infraestrutura: o gargalo é a escrita de afirmações com duas fontes distintas.
- Duas fontes distintas são exigidas para `estimada`. Mesmo texto ou mesma edição não contam como duas.
- Divergências entre textos do mesmo autor (Marx, Engels) são mostradas como divergência, não resolvidas por média.
- Não há cálculo de proximidade na interface; a função `largestPairDifference` mostra apenas a maior diferença entre entidades do bloco.
- Os vetores de 12 eixos do projeto de referência não foram usados como dados.

## Próximos passos

1. Para cada entidade e eixo, listar pelo menos duas fontes distintas e primárias.
2. Escrever cada afirmação com citação conferida e classificação correta.
3. Revisão humana antes de qualquer status diferente de `pending`.
4. Decidir se o bloco deve ocultar eixos sem evidência por padrão, para não poluir a leitura.

## Decisões de interface

- **Eixos sem evidência não viram ponto.** Cada entidade mostra apenas os eixos com afirmações; os demais aparecem numa linha recolhida ("Sem evidência em N eixos"). Isso evita dezenas de linhas vazias num capítulo que já é denso.
- **Evidência ao alcance do leitor.** Cada eixo abre suas afirmações, com a classificação, a confiança, o valor e o título da fonte. Quem quer conferir não precisa sair da página.
- **Legenda colocada antes dos dados.** "Como ler estas estimativas" explica os quatro estados em texto, sem depender de cor.
- **Entidade leva à ficha.** O nome da entidade abre a ficha contextual já usada no resto do ATLAS, com fontes e percurso, sem mudar de rota.
- **Contraste resumido em uma frase.** O maior contraste aparece em linguagem simples, com a diferença numa escala de 0 a 2, e o aviso de que vale apenas para os dados disponíveis.
- **Conferido em 375 e 1440 px.** Sem overflow horizontal, com alvos de toque de pelo menos 44 px nos controles de abertura.
