# ATLAS — Padrão de páginas de ideologia

Revisão de 01/11/2026: enciclopédia visual, interativa e exploratória. Este contrato substitui a organização V4 que previa um hub e múltiplas rotas secundárias. O escopo público atual continua **home, `/marxismo` e `/liberalismo`**. O padrão pode receber outras tradições no futuro, sem publicá-las antecipadamente.

## 0. Direção artística: Atlas Editorial

O Atlas Editorial é a direção artística principal do produto. A experiência combina o rigor do grid suíço com jornalismo visual, história ilustrada e museografia digital: cada ideologia deve parecer uma publicação histórica que se percorre, não um dashboard nem uma coleção repetida de widgets.

- **Base comum:** papel quente, tinta escura, vermelho de ação; IBM Plex Sans para estrutura, Source Serif 4 para leitura e IBM Plex Mono para metadados pontuais. Cores secundárias existentes sustentam camadas específicas, sem pintar toda a interface.
- **Ritmo:** usar grid assimétrico, títulos expressivos, respiros editoriais e mudanças de escala. Documentos, retratos, linhas do tempo e diagramas entram na narrativa quando os dados e as licenças permitem. Não repetir a mesma grade de fichas em todos os capítulos ou ideologias.
- **Interação:** seleção, expansão e contexto permanecem ligados à narrativa. O índice e o progresso compartilham comportamento e linguagem; no celular, o índice vira um seletor de capítulo compacto. A composição interna pode variar conforme o assunto.
- **Conteúdo:** não preencher espaço visual com fatos, imagens, causalidades ou conexões sem suporte editorial. Uma coleção de registros importados precisa se apresentar como exploração e dizer quando a revisão humana está pendente; não deve sugerir uma narrativa abrangente que ainda não existe.

As referências enviadas pelo usuário orientam decisões, sem serem ativos publicáveis: a composição tipográfica e geométrica de Rosmarie Tissi inspira uso disciplinado do grid e do vermelho; o Yemen Peace Project inspira integrar texto, imagem e visualização interativa no mesmo percurso, incluindo sua adaptação móvel; a publicação sobre a Revolução Cultural inspira entrelaçar datas, imagens e narrativa histórica. A direção resultante pertence ao ATLAS e precisa preservar suas fontes, licenças, tokens e conteúdo verificado.

## 1. Unidade de experiência e orientação

Uma tradição = uma página longa no scroll vertical nativo. A narrativa principal permanece visível e compreensível sem navegar por abas, subpáginas ou redirects. Controles locais podem selecionar um tema, evento, relação ou argumento; não escondem capítulos inteiros. Cada capítulo oferece uma interação que ensina: comparar, contextualizar, revelar fonte ou seguir conexão.

O visitante identifica onde está, o capítulo seguinte, progresso e caminho de volta. Índice com âncoras estáveis, estimativas identificadas como aproximadas, capítulo atual e retorno ao ponto anterior. Seleções podem usar query params com `replaceUrl` e scroll manual; somente a ação de navegar ao capítulo provoca rolagem. Nenhuma espera artificial, scroll hijacking ou parallax que prejudique leitura.

## 2. Contrato de cobertura editorial

A estrutura define cobertura, não um layout repetível:

| Área | Conteúdo | Exploração esperada |
| --- | --- | --- |
| Introdução | definição, recorte, classificação, revisão | abrir recorte, conceito inicial ou fonte |
| Origens | circunstâncias históricas, antecedentes e documentos | investigar documento e conexão, com imagem licenciada quando disponível |
| Princípios | problemas, valores/pressupostos, sociedade, economia, Estado/poder, mecanismos e divergências | diagrama conceitual e fichas que explicam fundamentos, sem doutrina unânime fictícia |
| Pensadores | contexto, obras, conceitos, críticas e relações | retratos editoriais, constelação ou galeria assimétrica; contexto no lugar |
| História | eventos, publicações, instituições e períodos | timeline com seleção, filtro, mídia e conexões; sequência não é causalidade |
| Vertentes | recorte, diferenças, figuras, períodos e relações | comparação ou genealogia sustentada; não presumir descendência linear |
| Debate | defesa, crítica, resposta e limitações | quadro argumentativo atribuído, fontes por posição e distinção de natureza |
| Fontes | primárias, estudos, metadados e licenças | fonte junto à afirmação, bibliografia pesquisável e localizadores |

Experiências históricas, mapas e conexões com outras ideologias entram quando sustentados por dados e fontes. Não fabricar um mapa, uma estatística ou uma árvore para preencher o layout. Ausências de cobertura ficam explicitamente justificadas; não preencher com alegações não verificadas.

Classificar como ideologia, tradição, corrente, movimento ou programa conforme fontes e recorte. Uma categoria técnica do grafo não resolve sozinha a classificação histórica. Marxismo, Liberalismo, Anarquismo, Social-democracia e Trabalhismo não são clones com título e cor trocados.

## 3. Estabilidade visual

Layout shifting inesperado é defeito, inclusive quando a métrica CLS o exclui por ter ocorrido perto de um input.

- Reservar dimensões e `aspect-ratio` de imagens, documentos, vídeos e gráficos. Crédito também participa do espaço reservado. Imagem sem licença não é requisitada/renderizada.
- Painéis de seleção têm tamanho previsível, conteúdo com scroll interno identificado e estado vazio/erro dentro da mesma região. Timeline e grafo mantêm coordenadas e geometria enquanto se muda seleção.
- Não apagar narrativa prerenderizada para mostrar loading durante a hidratação. Transferir o snapshot validado ou manter cache coerente entre servidor/browser.
- Fontes locais têm estratégia explícita de preload e troca. Medir fontes lentas; não afirmar que preload elimina CLS por si só.
- Conteúdo assíncrono visível não empurra o texto. Se usar `@defer`, placeholder e conteúdo precisam de contrato geométrico equivalente; remover adiamento desnecessário de blocos leves.
- Priorizar transform/opacity para movimento. Hover não muda espessura de borda, altura, tamanho tipográfico ou layout da ficha. Usar borda reservada, outline ou desenho interno.
- Contexto denso pode abrir em CDK Dialog/drawer de dimensões limitadas à viewport, com foco gerenciado, Escape, restauração de foco e scroll. Não transformar informações de leitura em uma sucessão obrigatória de modais.
- Expansão inline intencional é permitida quando melhora o entendimento. Indicar abertura/fechamento e evitar deslocar o gatilho ou salto da viewport. A expansão é distinta de troca assíncrona inesperada.

Meta: CLS ≤ 0,1 e buscar < 0,02 em amostras locais representativas. Não prometer zero universal. Registrar maior janela de CLS, viewport, navegador, condições de carregamento, motion e sequência de ações. Medir separadamente a posição do gatilho, tamanho do painel e scroll antes/depois, pois CLS sozinho não cobre expansões e inputs. LCP/INP também são medidos; valores locais não são percentis de campo. Orçamento proposto de JS ~200 KB gzip continua objetivo a medir, não condição ficticiamente cumprida.

## 4. Linguagem universal de ação

| Ação | Semântica/pista | Feedback persistente |
| --- | --- | --- |
| Abrir ficha/termo | `button` + “Abrir contexto”/indicador + `aria-haspopup` quando diálogo | foco, estado expandido e painel com título |
| Expandir inline | `button aria-expanded`/`details` com verbo e indicação | região nomeada e recolhimento reconhecível |
| Selecionar nó/evento/tema | `button aria-pressed` ou estado equivalente | seleção, painel, linhas e legenda sincronizados |
| Navegar ao capítulo | `a` com âncora e nome do destino | foco no capítulo e caminho anterior |
| Abrir documento/imagem | botão de ampliação ou link para origem | legenda, dimensão e licença; fechar restaura contexto |
| Outra ideologia | link com nome e natureza da conexão | apenas rota pública existente |
| Ênfase textual | `strong`/`em` sem pista de ação | não parece link nem recebe cursor de botão |

Toda ação tem cursor apropriado, pista persistente além de cor, hover, foco visível, clique/toque e estado selecionado/expandido quando aplicável. Os alvos não mudam de lugar com hover. Controle que parece clicável e não funciona, ou funciona mas parece decoração, é defeito. Usar HTML semântico; nenhum `span` clicável para substituir botão.

## 5. Hipertexto visual

Palavras-chave são portas de conhecimento. Selecionar termos centrais (por exemplo, materialismo histórico, trabalho socialmente necessário, Estado, liberdade, reforma, revolução), somente quando há contexto e fonte. Não transformar toda ocorrência em controle.

Termo interativo tem sublinhado e indicador de abertura; pessoa, conceito, ideologia, evento, obra, documento e lugar têm rótulo/forma redundantes à cor. Hover/foco podem antecipar definição, tipo e ação. Clique, teclado e toque abrem contexto completo com fonte e relação com o capítulo. Preview de hover nunca é a única forma de acesso. Texto apenas importante usa ênfase, sem aparência de ação.

Renderizar partes tipadas com interpolação Angular; não usar HTML gerado para criar links. Preservar pontuação/texto e testar palavras dentro de outras palavras e repetições. Destinos internos limitam-se às páginas existentes; aprofundamento prioritariamente contextual.

## 6. Cards como unidades de exploração

Ficha de pessoa, conceito, obra, corrente e acontecimento abre informação útil: definição, argumento, obra, fonte, documento ou relações. Usar expansão inline, painel, drawer, overlay ou detalhe progressivo conforme a densidade; não aplicar o mesmo arranjo a todos os capítulos.

Pensadores têm contexto, obras e relações quando registrados. Retratos têm dimensões, alt e licença/atribuição visíveis. Ausência de retrato não gera imagem inventada. Não reduzir a apresentação a uma grade de biografias idênticas.

O gatilho comunica a ação antes de hover. Seleção/expansão persistem até fechar/trocar; fechar devolve foco e contexto. Cliques rápidos não empilham animações nem geram dados incoerentes. Painel pode navegar por conexões com retorno interno, mantendo a página de origem.

## 7. Timeline

Uma timeline explica recorte e ordem, com trilho, eventos selecionáveis, períodos/filtros, indicador de posição e painel sincronizado. Fotografias e documentos têm contexto e licença; quando não há mídia, a região continua estável. Eventos podem ligar pensadores, obras e correntes documentadas.

Não basta listar datas: selecionar muda informação, conexões e, quando existente, evidência visual. A estrutura semântica continua lista cronológica. Filtro vazio apresenta saída e não deixa uma seleção invisível como se estivesse no recorte. Datas aproximadas permanecem aproximadas. Simultaneidade, associação e causalidade são distintas.

Conectores/progresso podem responder ao scroll ou seleção, sem mover a narrativa. Animação de conector é curta, limitada aos vínculos relevantes, sem loop e com equivalente imediato em reduced motion.

## 8. Grafos e vertentes

Grafo representa proposições legíveis, não decoração. Nós têm hover/foco de destaque das arestas incidentes, seleção por clique e contexto sincronizado. Filtros de tipo, realce de caminho, descoberta progressiva e retorno são usados quando ajudam a pergunta histórica. Zoom/pan só quando necessários, com controles alternativos e sem excluir teclado.

Posições são determinísticas e não saltam ao selecionar. Começar com um recorte legível; não abrir todos os nós por padrão. Oferecer tabela/lista com direção, tipo, certeza e fonte.

Arestas editoriais: `influencia-documentada`, `divergencia-ou-critica`, `continuidade`, `desenvolvimento`, `associacao-tematica`, `descoberta-enciclopedica`. Cada aresta histórica exige fontes e certeza (`estabelecida`, `debatida`, `incerta`). Descoberta enciclopédica é rotulada como navegação, nunca como afirmação histórica. Relação de crítica não é relação de descendência; certeza da existência de uma crítica não prova sua correção.

Vertentes incluem recorte, princípios distintivos, pessoas/obras, contexto temporal quando documentado e natureza da associação. Comparação de posições pode ser preferível a genealogia sem fonte suficiente.

## 9. Argumentação: defender, criticar, responder, limitar

Cada tema de debate contém quatro posições findáveis e comparáveis:

1. **Defesa atribuída:** tese reconhecível, fundamento e autor/tradição/vertente a que se aplica.
2. **Crítica atribuída:** objeção relevante, pressuposto contestado, autor e evidência.
3. **Resposta:** réplica/esclarecimento documentado, com fonte; quando ausente, dizer que não foi incorporada, sem inventar uma defesa simétrica.
4. **Limites e controvérsias:** alcance, incertezas, disputa historiográfica e limites empíricos.

Cada posição distingue natureza normativa, tese atribuída, hipótese, interpretação ou alegação empírica. Fontes/localizadores aparecem no contexto. Não generalizar uma posição para uma tradição inteira. Reconstruir o melhor argumento reconhecível, sem espantalho e sem falsa equivalência.

“Como defender/criticar” significa aprender a identificar premissa, fonte, recorte e evidência; não ensinar propaganda. Um argumento normativo não ganha comprovação empírica pela seleção de um card. Fatos históricos estabelecidos são apresentados com clareza, sem relativização por simetria de opiniões.

## 10. Motion intenso e funcional

Maximizar respostas significativas nos pontos de interação: termos, fichas, eventos, nós, conectores, filtros, imagens/documentos, seleção e progresso. A intensidade vem da variedade e qualidade das respostas, sem colocar tudo em movimento ao mesmo tempo.

Tokens compartilhados: 120 ms para feedback, 240 ms para contexto, até 480 ms para construir relações; `cubic-bezier(.2,.7,.2,1)`, sem bounce. Usar CSS/plataforma; biblioteca somente com benefício concreto. Transições são interrompíveis, não bloqueiam input e não reiniciam a página em mudança de query. Conteúdo permanece visível se uma animação não executar.

Cada efeito orienta, relaciona, revela ou registra. Não usar loops infinitos, parallax exagerado, scroll hijacking, atraso deliberado ou entrada idêntica em todos os capítulos. Não deslocar texto durante a leitura. Teclado e `prefers-reduced-motion`/controle manual mantêm a mesma descoberta com feedback imediato de estado/contraste.

## 11. Dados, arquitetura e direitos

Angular 21, standalone, Signals, TypeScript strict, SCSS, Zod, static-first. Reaproveitar CDK Dialog, ContentRepository para o grafo, IdeologyRepository para dossiês e componentes existentes. A organização de arquivos, os limites e o passo a passo para novas tradições estão em [ARCHITECTURE.md](ARCHITECTURE.md). Novos blocos recebem dados tipados; apresentação referencia IDs de entidade/fonte em vez de duplicar fatos. Schemas verificam IDs, âncoras, referências e fontes nas posições argumentativas. Novas tradições devem reutilizar contratos, com composição/configuração próprias.

Wikipedia fornece descoberta/contexto; Wikidata, identidade por QID/datas/relações registradas; Commons, mídia com metadados de licença, autor e atribuição. Coletar no desenvolvimento/build, com User-Agent descritivo, limites de API e cache local de bruto; snapshots normalizados versionados. Não consultar Wikimedia a cada visita. Registrar URL de origem, revisão/oldid quando disponível e data de coleta. Texto editorial próprio é o padrão; material reutilizado mantém atribuição e obrigações da licença. Não reproduzir imagens de referência como ativos autorizados.

Conteúdo gerado por IA nunca recebe revisão humana fictícia. `revisado` exige pessoa e data identificadas; estados pendentes permanecem visíveis. Nenhuma fonte, citação, data, validação, coordenada ou métrica inventada. Não adicionar backend/banco nem dependência significativa sem necessidade concreta e autorização quando aplicável.

## 12. Aceite e evidências

- Página compreensível no scroll; capítulos centrais presentes ou lacuna explicitada; apenas rotas autorizadas.
- Cards/termos têm ação real, pista persistente e teclado/toque; ênfase não finge link.
- Timeline muda contexto; grafo tem seleção e conexões legíveis; ambas com alternativa textual e fontes.
- Princípios e vertentes não aparecem como doutrina homogênea ou genealogia sem evidência.
- Debate tem defesa/crítica/resposta ou ausência/limites, com natureza e recorte atribuídos.
- Sem deslocamento inesperado no carregamento, troca de contexto, imagem lenta, hover e filtros. Medir CLS e deslocamentos não cobertos pela métrica em desktop/mobile, motion normal/reduzido.
- Teclado, foco/restauração, Escape, toque, mobile a partir de 320 px, texto ampliado e estados de erro/vazio verificados. Contraste: texto ≥ 4,5:1; interface/grandes textos ≥ 3:1. Não declarar conformidade WCAG integral sem auditoria.
- Executar lint, typecheck, unitários, build/prerender, links e Playwright pertinentes. Registrar comandos e resultados reais, capturas antes/depois, condições e limites das medições.
- Atualização da skill é acompanhada por cenários de aplicação antes/depois, não só por documentação mais longa. Fontes/editorial e performance continuam sujeitos a revisão.
