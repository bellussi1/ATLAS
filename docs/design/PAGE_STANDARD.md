# ATLAS — Padrão de páginas de ideologia

Revisão de 01/11/2026: enciclopédia visual, interativa e exploratória. Substitui a organização V4, que previa hub e rotas secundárias. Tradições publicadas: **`/leitura/marxismo` e `/leitura/liberalismo`**; as antigas rotas top-level redirecionam para `/leitura/:slug`. Catálogos, verbetes e exploração (ver `AGENTS.md`) também são públicos. Outras tradições podem vir depois, sem publicação antecipada.

## 0. Direção artística: Atlas Editorial

Direção principal do produto: rigor do grid suíço com jornalismo visual, história ilustrada e museografia digital. Cada ideologia deve parecer uma publicação histórica percorrível, não um dashboard nem uma coleção repetida de widgets.

- **Base:** papel quente, tinta escura, vermelho de ação. IBM Plex Sans para estrutura, Source Serif 4 para leitura, IBM Plex Mono para metadados pontuais. Cores secundárias sustentam camadas específicas, sem pintar toda a interface.
- **Ritmo:** grid assimétrico, títulos expressivos, respiros e mudanças de escala. Documentos, retratos, linhas do tempo e diagramas entram quando dados e licenças permitem. Não repetir a mesma grade de fichas em todos os capítulos.
- **Interação:** seleção, expansão e contexto ligados à narrativa. Índice e progresso compartilham comportamento e linguagem; no celular, o índice vira seletor compacto. A composição interna pode variar conforme o assunto.
- **Conteúdo:** nada de preencher espaço com fatos, imagens, causalidades ou conexões sem suporte. Coleção de registros importados se apresenta como exploração e declara revisão humana pendente; não sugere narrativa abrangente que ainda não existe.

Referências do usuário orientam decisões sem serem ativos publicáveis: a composição tipográfica e geométrica de Rosmarie Tissi (grid disciplinado e vermelho); o Yemen Peace Project (texto, imagem e visualização interativa no mesmo percurso, incluindo adaptação móvel); a publicação sobre a Revolução Cultural (datas, imagens e narrativa entrelaçadas). A direção pertence ao ATLAS e preserva fontes, licenças, tokens e conteúdo verificado.

## 1. Unidade de experiência e orientação

Uma tradição = uma página longa com scroll vertical nativo. A narrativa principal permanece compreensível sem abas, subpáginas ou redirects. Controles locais selecionam tema, evento, relação ou argumento; não escondem capítulos inteiros. Cada capítulo oferece uma interação que ensina: comparar, contextualizar, revelar fonte ou seguir conexão.

O visitante identifica onde está, o capítulo seguinte, o progresso e o caminho de volta: índice com âncoras estáveis, estimativas identificadas como aproximadas, capítulo atual e retorno ao ponto anterior. Seleções podem usar query params com `replaceUrl` e scroll manual; só a ação de navegar ao capítulo rola a página. Sem espera artificial, scroll hijacking ou parallax que prejudique a leitura.

As imagens de abertura são curadas no dossiê, com IDs canônicos e justificativa; a seleção automática é só fallback. Regras, formato e escolhas atuais em `docs/design/IMAGENS-DE-ABERTURA.md`.

## 1.1 Contrato canônico de 12 capítulos

Toda página publicada tem os mesmos 12 capítulos, na mesma ordem, com `id` = âncora e rótulo canônico como _kicker_: `introducao`, `origens`, `principios`, `conceitos`, `epocas`, `pensadores`, `vertentes`, `experiencias`, `debates`, `conexoes`, `leituras`, `fontes`.

- Fonte única: `src/app/features/ideologies/models/ideology-chapters.ts`; o schema rejeita desvios.
- O índice agrupa em Entender (01–04), Situar (05–08) e Avaliar e continuar (09–12), sem esconder nenhum capítulo do scroll.
- Capítulo sem conteúdo verificado: `coverage: "pending"` com motivo em `gap`. Conteúdo incompleto: `"partial"`. Nunca preencher.
- Âncoras antigas (`#historia`, `#correntes`, `#lugares`, `#criticas`, `#acervo`) redirecionam.
- Leitura principal sem contêiner com scroll próprio; painéis reservam altura mínima.
- Proposta e mapeamento: `docs/research/ideologies-section-contract-proposal.md`. Nova tradição: skill `atlas-create-ideology`.

## 1.2 Leituras contínuas de outros assuntos

Uma leitura contínua não é exclusiva de ideologias. Pessoas, acontecimentos, instituições, períodos e conceitos podem ocupar a mesma página em `/<slug>` quando o assunto precisa de contexto, disputa e conexão. O verbete continua sendo a unidade para o que não sustenta esse recorte.

- A decisão e o protocolo estão em `atlas-create-reading`.
- O tipo do assunto adapta a pergunta de cada capítulo, não a ordem nem as âncoras.
- "Situar" e "Avaliar" exigem fontes acadêmicas e caso brasileiro documentado, não um parágrafo de atualidade.
- Cada leitura declara **3 a 5 conexões** curadas em `ideologyReadings[].connections`, cada uma com uma razão. O limite é editorial: mais do que cinco caminhos indica que o assunto deveria ser dividido.
- O mapa dos próximos assuntos, incluindo Governo Vargas, Trabalhismo, Golpe de 1964 e Ditadura militar, está em `docs/research/readings-map.md`.

## 2. Contrato de cobertura editorial

Define cobertura, não um layout repetível:

| Área       | Conteúdo                                                                                      | Exploração esperada                                                           |
| ---------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Introdução | definição, recorte, classificação, revisão                                                    | abrir recorte, conceito inicial ou fonte                                      |
| Origens    | circunstâncias históricas, antecedentes e documentos                                          | investigar documento e conexão; imagem licenciada quando houver               |
| Princípios | problemas, valores/pressupostos, sociedade, economia, Estado/poder, mecanismos e divergências | diagrama conceitual e fichas sobre fundamentos, sem doutrina unânime fictícia |
| Pensadores | contexto, obras, conceitos, críticas e relações                                               | retratos editoriais, constelação ou galeria assimétrica; contexto no lugar    |
| História   | eventos, publicações, instituições e períodos                                                 | timeline com seleção, filtro, mídia e conexões; sequência não é causalidade   |
| Vertentes  | recorte, diferenças, figuras, períodos e relações                                             | comparação ou genealogia sustentada; não presumir descendência linear         |
| Debate     | defesa, crítica, resposta e limitações                                                        | quadro argumentativo atribuído, fontes por posição, distinção de natureza     |
| Fontes     | primárias, estudos, metadados e licenças                                                      | fonte junto à afirmação, bibliografia pesquisável, localizadores              |

Experiências históricas, mapas e conexões com outras ideologias entram quando sustentados por dados e fontes. Não fabricar mapa, estatística ou árvore para preencher layout. Ausências de cobertura são justificadas explicitamente.

Classificar como ideologia, tradição, corrente, movimento ou programa conforme fontes e recorte; uma categoria técnica do grafo não resolve sozinha a classificação histórica. Marxismo, Liberalismo, Anarquismo, Social-democracia e Trabalhismo não são clones com título e cor trocados.

## 3. Estabilidade visual

Layout shift inesperado é defeito, inclusive quando a métrica CLS o exclui por ocorrer perto de um input.

- Reservar dimensões e `aspect-ratio` de imagens, documentos, vídeos e gráficos; o crédito também ocupa espaço reservado. Imagem sem licença não é requisitada nem renderizada.
- Painéis de seleção com tamanho previsível, scroll interno identificado, e estados vazio ou erro dentro da mesma região. Timeline e grafo mantêm coordenadas ao mudar seleção.
- Não apagar narrativa prerenderizada para mostrar loading na hidratação: transferir o snapshot validado ou manter cache coerente entre servidor e navegador.
- Fontes locais com estratégia explícita de preload e troca. Medir fontes lentas; preload não elimina CLS por si só.
- Conteúdo assíncrono não empurra o texto. Com `@defer`, placeholder e conteúdo têm contrato geométrico equivalente; remover adiamento desnecessário em blocos leves.
- Movimento com transform e opacity. Hover não muda espessura de borda, altura, tamanho tipográfico ou layout da ficha; usar borda reservada, outline ou desenho interno.
- Contexto denso abre em CDK Dialog ou drawer limitado à viewport, com foco gerenciado, Escape, restauração de foco e scroll. Informação de leitura não vira sucessão obrigatória de modais.
- Expansão inline é permitida quando ajuda a entender: indicar abrir/fechar e não deslocar o gatilho nem saltar da viewport. Expansão é distinta de troca assíncrona inesperada.

**Meta:** CLS ≤ 0,1, buscando < 0,02 em amostras locais representativas; não prometer zero universal. Registrar maior janela de CLS, viewport, navegador, condições de carregamento, motion e sequência de ações. Medir separadamente posição do gatilho, tamanho do painel e scroll antes e depois, pois CLS não cobre expansões nem inputs. LCP e INP também são medidos; valores locais não são percentis de campo. Orçamento proposto de JS ~200 KB gzip é objetivo a medir, não condição a dar como cumprida.

## 4. Linguagem universal de ação

| Ação                      | Semântica e pista                                                  | Feedback persistente                                 |
| ------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| Abrir ficha/termo         | `button` + "Abrir contexto"/indicador + `aria-haspopup` se diálogo | foco, estado expandido, painel com título            |
| Expandir inline           | `button aria-expanded` ou `details` com verbo e indicação          | região nomeada e recolhimento reconhecível           |
| Selecionar nó/evento/tema | `button aria-pressed` ou equivalente                               | seleção, painel, linhas e legenda sincronizados      |
| Navegar ao capítulo       | `a` com âncora e nome do destino                                   | foco no capítulo e caminho anterior                  |
| Abrir documento/imagem    | botão de ampliação ou link para a origem                           | legenda, dimensão, licença; fechar restaura contexto |
| Outra ideologia           | link com nome e natureza da conexão                                | apenas rota pública existente                        |
| Ênfase textual            | `strong`/`em` sem pista de ação                                    | não parece link nem recebe cursor de botão           |

Toda ação tem cursor adequado, pista persistente além da cor, hover, foco visível, clique/toque e estado selecionado/expandido quando aplicável. Alvos não mudam de lugar com hover. Controle que parece clicável e não funciona, ou funciona e parece decoração, é defeito. HTML semântico; nenhum `span` clicável no lugar de botão.

## 5. Hipertexto visual

Palavras-chave são portas de conhecimento: termos centrais (materialismo histórico, trabalho socialmente necessário, Estado, liberdade, reforma, revolução), só com contexto e fonte. Não transformar toda ocorrência em controle.

Termo interativo tem sublinhado e indicador de abertura. Pessoa, conceito, ideologia, evento, obra, documento e lugar têm rótulo ou forma redundantes à cor. Hover e foco podem antecipar definição, tipo e ação. Clique, teclado e toque abrem o contexto completo, com fonte e relação com o capítulo. Preview de hover nunca é o único acesso. Ênfase sem aparência de ação.

Renderizar partes tipadas com interpolação Angular; não usar HTML gerado para criar links. Preservar pontuação e texto; testar palavras dentro de outras palavras e repetições. Destinos internos limitados às páginas existentes; aprofundamento prioritariamente contextual.

## 6. Cards como unidades de exploração

Ficha de pessoa, conceito, obra, corrente ou acontecimento abre informação útil: definição, argumento, obra, fonte, documento ou relações. Expansão inline, painel, drawer, overlay ou detalhe progressivo conforme a densidade; não aplicar o mesmo arranjo a todos os capítulos.

Pensadores têm contexto, obras e relações quando registrados. Retratos com dimensões, `alt` e licença/atribuição visíveis; ausência de retrato não gera imagem inventada. Não reduzir a uma grade de biografias idênticas.

O gatilho comunica a ação antes do hover. Seleção e expansão persistem até fechar ou trocar; fechar devolve foco e contexto. Cliques rápidos não empilham animações nem geram dados incoerentes. O painel pode navegar por conexões com retorno interno, mantendo a página de origem.

## 7. Timeline

Explica recorte e ordem: trilho, eventos selecionáveis, períodos e filtros, indicador de posição e painel sincronizado. Fotografias e documentos com contexto e licença; sem mídia, a região continua estável. Eventos podem ligar pensadores, obras e correntes documentadas.

Na leitura de uma tradição, a linha do tempo de **épocas é vertical**: um trilho, anos e épocas expansíveis, com registros e pessoas do intervalo. Não usar eixo horizontal com zoom, pan e régua nessa página; a exploração horizontal fica restrita ao atlas, quando o recorte temporal for o próprio objeto.

Não basta listar datas: selecionar muda informação, conexões e, quando existe, evidência visual. A estrutura semântica continua lista cronológica. Filtro vazio apresenta saída e não deixa seleção invisível como se estivesse no recorte. Datas aproximadas permanecem aproximadas. Simultaneidade, associação e causalidade são distintas.

Conectores e progresso podem responder ao scroll ou à seleção, sem mover a narrativa. Animação de conector é curta, limitada aos vínculos relevantes, sem loop, com equivalente imediato em reduced motion.

## 8. Grafos e vertentes

Grafo representa proposições legíveis, não decoração. Nós com hover e foco destacando as arestas incidentes, seleção por clique e contexto sincronizado. Filtros de tipo, realce de caminho, descoberta progressiva e retorno quando ajudam a pergunta histórica. Zoom e pan só quando necessários, com controles alternativos e sem excluir o teclado.

Posições determinísticas, sem saltos ao selecionar. Começar com recorte legível; não abrir todos os nós por padrão. Oferecer tabela ou lista com direção, tipo, certeza e fonte.

Tipos de aresta: `influencia-documentada`, `divergencia-ou-critica`, `continuidade`, `desenvolvimento`, `associacao-tematica`, `descoberta-enciclopedica`. Cada aresta histórica exige fontes e certeza (`estabelecida`, `debatida`, `incerta`). Descoberta enciclopédica é rotulada como navegação, nunca como afirmação histórica. Crítica não é descendência; a certeza da existência de uma crítica não prova sua correção.

Vertentes incluem recorte, princípios distintivos, pessoas e obras, contexto temporal quando documentado e natureza da associação. Comparação de posições pode ser preferível a genealogia sem fonte suficiente.

## 9. Argumentação: defender, criticar, responder, limitar

Cada tema de debate tem quatro posições localizáveis e comparáveis:

1. **Defesa atribuída:** tese reconhecível, fundamento e autor, tradição ou vertente a que se aplica.
2. **Crítica atribuída:** objeção relevante, pressuposto contestado, autor e evidência.
3. **Resposta:** réplica ou esclarecimento documentado, com fonte. Se ausente, dizer que não foi incorporada, sem inventar defesa simétrica.
4. **Limites e controvérsias:** alcance, incertezas, disputa historiográfica, limites empíricos.

Cada posição distingue natureza normativa, tese atribuída, hipótese, interpretação ou alegação empírica. Fontes e localizadores no contexto. Não generalizar uma posição para a tradição inteira. Reconstruir o melhor argumento reconhecível, sem espantalho e sem falsa equivalência.

"Como defender ou criticar" significa identificar premissa, fonte, recorte e evidência, não ensinar propaganda. Argumento normativo não ganha comprovação empírica por aparecer num card. Fatos históricos estabelecidos são apresentados com clareza, sem relativização por simetria de opiniões.

## 10. Motion intenso e funcional

Maximizar respostas significativas nos pontos de interação: termos, fichas, eventos, nós, conectores, filtros, imagens e documentos, seleção e progresso. A intensidade vem da variedade e qualidade das respostas, sem tudo em movimento ao mesmo tempo.

Tokens compartilhados: 120 ms para feedback, 240 ms para contexto, até 480 ms para construir relações; `cubic-bezier(.2,.7,.2,1)`, sem bounce. CSS e recursos da plataforma; biblioteca só com benefício concreto. Transições interrompíveis, sem bloquear input nem reiniciar a página em mudança de query. Conteúdo permanece visível se a animação não executar.

Cada efeito orienta, relaciona, revela ou registra. Sem loops infinitos, parallax exagerado, scroll hijacking, atraso deliberado ou entrada idêntica em todos os capítulos. Sem deslocar texto durante a leitura. Teclado e `prefers-reduced-motion` ou controle manual mantêm a mesma descoberta, com feedback imediato de estado e contraste.

## 11. Dados, arquitetura e direitos

Angular 21 standalone, Signals, TypeScript strict, SCSS, Zod, static-first. Reaproveitar CDK Dialog, `ContentRepository` para o grafo, `IdeologyRepository` para dossiês e componentes existentes. Organização de arquivos, limites e passo a passo para novas tradições em [ARCHITECTURE.md](../architecture/ARCHITECTURE.md).

Novos blocos recebem dados tipados; a apresentação referencia IDs de entidade e fonte em vez de duplicar fatos. Schemas verificam IDs, âncoras, referências e fontes nas posições argumentativas. Novas tradições reutilizam contratos, com composição e configuração próprias.

Wikipedia fornece descoberta e contexto; Wikidata, identidade por QID, datas e relações registradas; Commons, mídia com licença, autor e atribuição. Coleta no desenvolvimento ou build, com User-Agent descritivo, limites de API e cache local do bruto; snapshots normalizados versionados. Sem consulta à Wikimedia a cada visita. Registrar URL de origem, revisão ou `oldid` quando houver, e data de coleta. Texto editorial próprio é o padrão; material reutilizado mantém atribuição e obrigações da licença. Imagens de referência não são ativos autorizados.

Conteúdo gerado por IA nunca recebe revisão humana fictícia. `revisado` exige pessoa e data identificadas; estados pendentes permanecem visíveis. Nenhuma fonte, citação, data, validação, coordenada ou métrica inventada. Sem backend, banco ou dependência significativa sem necessidade concreta e autorização quando aplicável.

## 12. Aceite e evidências

- Página compreensível no scroll; capítulos centrais presentes ou lacuna explicitada; apenas rotas autorizadas.
- Cards e termos com ação real, pista persistente e acesso por teclado e toque; ênfase não finge link.
- Timeline muda contexto; grafo tem seleção e conexões legíveis; ambos com alternativa textual e fontes.
- Princípios e vertentes não aparecem como doutrina homogênea nem genealogia sem evidência.
- Debate com defesa, crítica e resposta, ou ausência e limites, com natureza e recorte atribuídos.
- Sem deslocamento inesperado no carregamento, na troca de contexto, em imagem lenta, hover ou filtros. Medir CLS e deslocamentos não cobertos pela métrica, em desktop e mobile, com motion normal e reduzido.
- Teclado, foco e restauração, Escape, toque, mobile a partir de 320 px, texto ampliado e estados de erro e vazio verificados. Contraste: texto ≥ 4,5:1; interface e textos grandes ≥ 3:1. Sem declarar conformidade WCAG integral sem auditoria.
- Executar lint, typecheck, unitários, build com prerender, links e Playwright pertinentes. Registrar comandos, resultados reais, capturas antes e depois, condições e limites das medições.
- Atualização da skill acompanhada de cenários de aplicação antes e depois, não só de documentação mais longa. Fontes, editorial e performance seguem sujeitos a revisão.
