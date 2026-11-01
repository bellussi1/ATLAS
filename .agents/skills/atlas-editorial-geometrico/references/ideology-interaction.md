# Contrato de exploração de ideologias

## Resultado esperado

Uma enciclopédia visual viva: leitura contínua, com fichas, palavras, retratos, eventos, princípios, vertentes e argumentos que abrem contexto. A riqueza está nas descobertas disponíveis e no retorno expressivo de cada ação. Composição própria por tema; componentes e convenções compartilhados.

## Estabilidade é requisito funcional

- Imagens e diagramas têm dimensões ou proporção reservadas. Estados vazios, carregados e de erro ocupam a mesma região em painéis de seleção.
- Selecionar um evento ou argumento troca o conteúdo dentro de painel com geometria estável e rolagem interna identificada. Carregamento assíncrono não empurra o texto já visível.
- Fichas densas abrem contexto com CDK Dialog; reservar o tamanho do painel, limitar à viewport, permitir scroll interno, restaurar foco e posição ao fechar. Expansão inline é possível quando o fluxo ajuda a compreensão; registrar que a expansão é intencional e verificar o gatilho antes/depois.
- Pré-render e hidratação exibem os mesmos dados. Evitar apagar conteúdo pronto para mostrar um loader. Controlar fontes locais e medir troca de métricas; não tratar preload como prova de estabilidade.
- CLS: meta operacional ≤ 0,1, buscar < 0,02 na amostra de laboratório. Registrar viewport, modo de motion, carregamento, janela de CLS, interações e erros. CLS exclui vários deslocamentos após input: medir também posição do gatilho, tamanho dos painéis e scroll antes/depois. Não prometer zero universal.

## Vocabulário de ação

| Ação | Semântica e pista persistente | Resultado verificável |
| --- | --- | --- |
| Abrir ficha/termo | `button`, sublinhado ou rótulo “Abrir contexto”, indicador de expansão | painel com título, definição, fonte e conexões; Escape fecha e devolve foco |
| Selecionar evento/nó | `button`, `aria-pressed` e nome da seleção | seleção, linhas e painel atualizam juntos; posições não mudam |
| Navegar no capítulo | `a` com âncora, nome do destino | foco no capítulo; scroll controlado pela pessoa; ponto anterior |
| Abrir documento | botão de ampliação ou link com nome da origem | imagem/documento com dimensões, alt e crédito |
| Outra ideologia | link nomeando a tradição | rota existente; contexto da relação antes da saída |
| Ênfase sem ação | `strong`/`em`, sem cursor de botão nem sublinhado de ação | texto continua estático |

Hover é uma resposta adicional: foco e toque acessam o mesmo conteúdo. Acrescentar contraste, sublinhado e transformação de poucos pixels sem mudar área clicável, altura ou espessura de borda no fluxo. `:active` confirma toque; estados selecionado/expandido continuam visíveis depois da ação. Não usar `span` clicável.

## Hipertexto editorial

Selecionar termos por relevância e registro existente. Renderizar partes tipadas com interpolação Angular, sem HTML gerado. Diferenciar conceito, pessoa, obra, evento e tradição por rótulo/forma e cor redundante. O botão do termo abre definição, relação com a leitura e fontes, sem sair da página. Preview em hover/foco pode antecipar; clique/toque é o caminho completo. Evitar transformar todas as ocorrências em controle.

## Timeline e grafo

Timeline: trilho temporal e eventos operáveis, filtro com rótulo, seleção/posição preservadas, painel de período, mídia licenciada, conexões com pessoas/obras e lista semântica. Datas aproximadas continuam aproximadas. Sequência não prova causalidade.

Grafo: posições determinísticas; hover/foco realçam nó e arestas incidentes; seleção atualiza contexto e legenda. Filtro nunca altera o significado de uma aresta. Zoom/pan somente se necessário, sempre com controles alternativos. Conservar tabela/lista com tipos, direção, certeza e fonte. Não converter hyperlink em influência. O número de nós deve permitir leitura, com descoberta progressiva.

## Princípios, vertentes e debate

Princípio explica problema → pressuposto/valor → mecanismo → divergência. Não uniformizar uma tradição heterogênea.

Vertente inclui recorte, ideias distintivas, pensadores/obras e evidência da associação. Genealogia exige relações documentadas; comparação de posições não é descendência. Ausência de fonte é lacuna explícita, não licença para inventar a conexão.

Argumento tem campos obrigatórios: **defesa atribuída**, **crítica atribuída**, **resposta documentada ou ausência explícita**, **limites/controvérsias**, natureza (normativa/hipótese/interpretação/empírica), fontes/localizadores e recorte da posição. “Como defender/criticar” ensina a reconstruir e avaliar argumentos; não é treinamento de propaganda. Não fabricar réplica para produzir simetria.

## Motion e verificação

Animar feedback, relação, revelação e orientação. Maximizar respostas significativas: termos, fichas, nós, conectores, filtros e documentos. Não aplicar a mesma entrada a todos os capítulos. Preservar tokens 120/240/480 ms e curva V4; preferir transform/opacity. Sem loop infinito, parallax agressivo, scroll hijacking ou espera artificial. Texto em leitura não se move. Ações interrompem animações anteriores. Teclado e movimento reduzido mantêm feedback instantâneo.

Verificar desktop e mobile; ponteiro, foco, Enter/Escape, toque; cliques rápidos; volta de foco e scroll; imagem lenta; filtro vazio; URL compartilhada; CLS e deslocamento do gatilho. Só registrar como implementado o que código e comportamento demonstram.
