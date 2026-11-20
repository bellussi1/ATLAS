Status: plano
Última verificação: 19/11/2026

# Leituras contínuas e itinerários: próxima fila

Plano de expansão editorial para os temas com mais procura e melhor base no grafo. O critério combina três coisas, nesta ordem:

1. presença no grafo e em fontes já capturadas;
2. recorrência do tema em currículos de história, ciência política e exames de acesso;
3. existência de um rascunho ou tradição que já possa ser medido por `npm run tradicao:coverage`.

Não é uma lista de desejos: cada item declara o que falta e a verificação que fecha a etapa.

## Publicado nesta rodada

| Leitura | Tipo | Por que entra | Estado |
|---|---|---|---|
| Era Vargas | período | Estado social, CLT, trabalhismo e industrialização; tema central do Brasil republicano | `page.json` publicado com selo `com-fontes`; piso atingido |
| Golpe de 1964 | acontecimento | ruptura democrática, atores civis e militares, justificativas e consequências | `page.json` publicado com selo `com-fontes`; piso atingido |

As duas leituras já tinham 12 capítulos, mais de 2.000 palavras de prosa, 7 tipos de bloco e 70+ fontes. A publicação não declara revisão humana: o selo é `com-fontes`, com revisão por IA registrada no conteúdo.

## Wave 2: fechar o que está a uma ou duas lacunas

| Leitura | Tipo | Lacunas atuais | Próxima ação |
|---|---|---|---|
| Estado | conceito | 4 tipos de bloco (piso 7) e 2.008 palavras | adicionar `timeline`, `atlas` e um bloco de debate com fonte; revisar capítulos parciais |
| Revolução | conceito | 4 tipos de bloco e 1.877 palavras | adicionar `timeline` e `atlas`; completar 123 palavras com fonte |
| Karl Marx | pessoa | 4 tipos de bloco e 1.205 palavras | ampliar "Situar" e "Avaliar" com fonte acadêmica; 795 palavras |
| Adam Smith | pessoa | 4 tipos de bloco e 1.181 palavras | idem; 819 palavras e 3 tipos |
| Segunda Guerra Mundial | acontecimento | 3 tipos de bloco e 1.152 palavras | cronologia, debate e leitura guiada com fonte; 848 palavras |
| Ditadura militar brasileira | período | 3 tipos de bloco, 946 palavras e 3 capítulos pendentes | completar capítulos pendentes e ampliar para 2.000 palavras |

## Wave 3: Brasil e formação nacional

| Leitura | Tipo | Base existente | O que falta |
|---|---|---|---|
| Primeira República | período | grafo, `republicanismo`, `constituicoes-e-republica-no-brasil` | criar rascunho com 12 capítulos e fontes sobre coronelismo, federalismo e exclusão |
| Escravidão e abolição | período | grafo, Lei Áurea, Lei do Ventre Livre, Lei Eusébio de Queirós no corpus | leitura própria, com tráfico, resistência, abolicionismo e pós-abolição |
| República e cidadania | conceito | `republicanismo`, `constituicoes-e-republica-no-brasil` | decidir se é leitura própria ou capítulo de Primeira República |
| Getúlio Vargas | pessoa | `era-vargas`, `trabalhismo`, `karl-marx` como contraste | separar trajetória, decisões e legado da leitura de período |

## Wave 4: conceitos e processos globais

| Leitura | Tipo | Base existente | O que falta |
|---|---|---|---|
| Revolução Francesa | acontecimento | `revolucao`, `liberalismo`, `revolucoes-e-contrarrevolucoes` | rascunho com cronologia, atores, Jacobinismo, Haiti e recepção |
| Iluminismo | conceito | `liberalismo`, `adam-smith`, `karl-marx`, SEP no corpus | leitura com esfera pública, religião, colonialismo e críticas |
| Nacionalismo | conceito | tradição `nacionalismo`, `nacao-nacionalismo-e-imperio` | criar rascunho medido; distinguir nação, Estado e etnia |
| Colonialismo e imperialismo | processo | grafo, corpus de documentos e Wikipédia | leitura com partilha da África, Índia, América Latina e descolonização |
| Guerra Fria | período | `guerra-fria-e-ordem-internacional`, ONU, OTAN, URSS | leitura com blocos, conflitos periféricos e fim da URSS |
| Democracia | conceito | `estado`, `liberalismo`, `social-democracia` | decidir entre leitura própria e capítulo de Estado |
| Fascismo | ideologia | `nazismo`, `stalinismo`, `corporativismo`, `integralismo-brasileiro` | leitura comparada, sem confundir com nazismo |

## Wave 5: temas contemporâneos

| Leitura | Tipo | Base existente | O que falta |
|---|---|---|---|
| Populismos | conceito | `populismo-de-direita`, `populismo-de-esquerda`, `peronismo`, `trabalhismo` | unificar ou separar as duas leituras; decidir o recorte |
| Meio ambiente e justiça climática | conceito | `ambientalismo`, `ecossocialismo`, `ecologia-profunda` | leitura com história do movimento, ciência e disputas de justiça |
| Direitos humanos | conceito | ONU, constituições, abolição | leitura com declarações, críticas e efetividade |
| Tecnologia e poder | conceito | `tecnocracia`, `aceleracionismo` | recorte sobre expertise, algoritmos e regulação |

## Itinerários (roadmaps)

Já existentes: 9. Nesta rodada entram seis novos, gerados com aterramento no grafo e validação determinística:

1. `revolucoes-e-contrarrevolucoes`
2. `autoritarismo-totalitarismo-e-resistencia`
3. `nacao-nacionalismo-e-imperio`
4. `religiao-politica-e-secularizacao`
5. `desigualdade-capital-e-trabalho`
6. `guerras-mundiais-e-ordem-internacional`

Próxima fila de itinerários:

7. `esquerda-direita-e-populismos`
8. `escravidao-abolicionismo-e-cidadania`
9. `primeira-republica-e-cidadania`
10. `ciencia-estado-e-tecnocracia`
11. `direitos-humanos-e-efetividade`
12. `america-latina-revolucoes-e-ditaduras`

Cada itinerário precisa de 6 paradas, pelo menos dois tipos de destino e todas as paradas ancoradas em verbetes, leituras ou grafos publicados. O gerador não inventa entidade: `validateItinerary` bloqueia slug inexistente.

## Ordem de execução

1. Rodar `npm run tradicao:coverage -- <slug>` antes de tocar no texto.
2. Preencher primeiro os capítulos com fonte; marcar `partial` + `gap` no que faltar.
3. Repetir a régua até o piso.
4. Revisar conexões: 3 a 5, cada uma com razão e relação tipada.
5. Rodar `npm run content:build`, `npm test`, `npm run lint`, `npm run typecheck` e `npm run check:links`.
6. Publicar como `com-fontes` ou `rascunho` visível; `revisado` só com pessoa identificada.

## Critério de parada

Uma leitura só entra em `published-ideologies.ts` quando:

- tem 12 capítulos canônicos;
- atinge o piso de `coverage-floor.json` ou declara a lacuna com `partial`/`pending`;
- tem 3 a 5 conexões curadas para leituras publicadas;
- o build e os testes passam;
- o selo de revisão corresponde ao que aconteceu de fato.
