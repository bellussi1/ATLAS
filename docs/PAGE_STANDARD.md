# PARTE A — Padrão permanente

## A1. Princípio e unidade de experiência

A unidade principal do ATLAS é a **página de ideologia**: uma página longa, contínua e interativa que explica uma tradição político-intelectual do início ao fim. Verbetes, obras, fontes e entidades continuam existindo como infraestrutura secundária (pesquisa, SEO, aprofundamento), mas **nunca são necessários para compreender a narrativa principal**.

**Teste de orientação.** Qualquer visitante deve responder em cinco segundos: onde estou, o que vem depois, quanto falta e como volto. Toda página implementa: índice de capítulos com tempo estimado de leitura, indicador de capítulo atual, progresso de leitura e retorno ao ponto anterior.

## A2. Regras não negociáveis

1. Uma ideologia = uma página. Sem abas, sem sub-rotas para partes da narrativa, sem carrosséis ou acordeões que escondam capítulos inteiros.
2. Scroll vertical nativo. Sem scroll hijacking, sem atrasos artificiais, sem animação que impeça encontrar informação.
3. Cada capítulo tem pelo menos uma interação que **ensina algo** (compara, localiza no tempo, mostra relação, revela fonte). Interação decorativa é reprovada.
4. Nenhuma informação depende só de hover. Todo hover tem equivalente por foco de teclado e por toque.
5. Nenhuma relação, citação ou data sem fonte identificada ou sem marcação explícita de incerteza.
6. Frontend-first: Angular estático/prerenderizado, JSON versionado, sem backend de produção nem banco de dados, salvo justificativa técnica documentada.
7. Conteúdo gerado por IA nunca recebe status de revisado por humano.
8. Mídia só entra com licença verificada e atribuição registrada.

## A3. Arquitetura de informação e URLs

- `/ideologias`: hub de entrada. Não é uma lista de cards: é uma visão de conjunto (mapa genealógico ou constelação de tradições) que mostra de onde cada ideologia vem e com quais se relaciona. É o ponto de partida do ATLAS.
- `/ideologias/:slug`: a grande página (ex.: `/ideologias/marxismo`).
- Estado de exploração (nó focado, período, pensador aberto) em query params ou fragmento, com `replaceUrl`, para que o link compartilhado reproduza o contexto. Âncoras de capítulo estáveis (`#origens`, `#correntes`).
- Verbetes, fontes e entidades: rotas secundárias, indexáveis, com canonical próprio e link de volta ao ponto da ideologia de onde vieram.
- Rotas existentes (`/atlas/marxismo`, `/atlas/marxismo/valor-e-trabalho`, `/atlas/liberalismos`, `/verbete/:slug`) não são removidas: recebem redirects no roteador Angular e a configuração equivalente de hospedagem documentada.
- Nem tudo é ideologia. O agente classifica cada tema como ideologia, corrente, tradição, movimento, programa político ou categoria historiográfica, e só cria página de ideologia quando a classificação se sustenta. Lista inicial ilustrativa: Marxismo, Liberalismo, Conservadorismo, Social-democracia, Anarquismo, Socialismo democrático, Fascismo, Nacionalismo, Trabalhismo, Nacional-desenvolvimentismo, Positivismo.

## A4. Anatomia da página: contrato de cobertura editorial

Os capítulos abaixo são um **contrato de cobertura**, não um template visual. Ordem, tamanho e recursos se adaptam ao tema e às fontes disponíveis. Não se força mapa, gráfico quantitativo ou árvore quando os dados não os justificam.

**Capítulos centrais (toda página):**

1. **Introdução.** Nome, definição curta e rigorosa, recorte temporal e geográfico, uma imagem ou composição principal significativa, convite discreto a explorar. Sem hero de landing page, sem CTA promocional.
2. **Origens e formação.** Circunstâncias históricas, debates anteriores, documentos e imagens de época. Aparência de reportagem histórica ou exposição, não de artigo fatiado em cards.
3. **Princípios e conceitos.** Ideias fundamentais em diagramas e argumentos expansíveis. Divergências internas explicitadas; nunca uma posição única para uma tradição heterogênea.
4. **Pensadores.** Retratos licenciados, períodos, obras, argumentos, concordâncias e divergências documentadas entre autores. Formatos: galeria editorial, genealogia intelectual, constelação. Não uma grade uniforme de biografias. Abrir um pensador expande no lugar, sem destruir o contexto de leitura.
5. **Desenvolvimento histórico.** Timeline interativa com eixo sticky, seleção de períodos e eventos, mídia contextualizada, escala ajustável quando útil, fontes acessíveis. Simultaneidade, associação e causalidade são tratadas como coisas distintas.
6. **Correntes e divergências.** Grafo genealógico e conceitual com tipos de aresta explícitos (A8). Correntes não descendem linearmente umas das outras por padrão; relações disputadas mostram a incerteza.
7. **Críticas e debates.** Crítica acadêmica, crítica política, autocrítica histórica e controvérsia historiográfica, cada uma rotulada, com fontes. Sem falsa equivalência e sem linguagem de convencimento.
8. **Fontes e aprofundamento.** Bibliografia, textos originais, Wikimedia e acadêmicos. As referências também aparecem perto das afirmações (SourceDrawer), não só no fim.

**Capítulos condicionais (quando as fontes e o tema justificam):**

- **Experiências históricas:** movimentos, instituições, governos, partidos, políticas, revoluções. Forma conforme o dado: mapa, diagrama institucional, cronologia, comparação. Não equiparar a ideologia a tudo que governos ou partidos associados fizeram.
- **Desdobramentos e conexões:** relações com outras ideologias (Marxismo e social-democracia; Liberalismo e neoliberalismo; Trabalhismo e nacional-desenvolvimentismo). A conexão é explorável no contexto atual antes de oferecer navegação para outra página.

**Personalidade por ideologia.** A estrutura técnica é comum, a composição não. Cada página define em configuração: uma cor auxiliar, um gesto compositivo recorrente e uma visualização-chave que responde às perguntas daquele tema (genealogia de correntes no Marxismo; teorias sobre liberdade e Estado no Liberalismo; modelos históricos de bem-estar na Social-democracia; experiências e organização no Anarquismo; instituições e programas econômicos no Trabalhismo e no nacional-desenvolvimentismo). Páginas que parecem a mesma com título e cor trocados são reprovadas.

## A5. Biblioteca de blocos

Blocos orientados a dados, independentes da ideologia. Antes de criar um, procurar equivalente existente e evoluí-lo.

| Bloco | Pergunta que responde | Alternativa acessível obrigatória |
| --- | --- | --- |
| InteractiveTimeline | Quando e em que ordem? | Lista cronológica semântica |
| KnowledgeGraph / IdeologyGenealogy | Como se relacionam? | Tabela de relações com tipo e fonte |
| ThinkerConstellation / ThinkerPortrait | Quem pensou o quê? | Lista de autores com obras |
| ExpandableEditorialCard | O que há por trás deste item? | Conteúdo em `details` ou região expansível por teclado |
| ConceptDiagram / ArgumentComparison | Como a ideia funciona? Em que duas posições divergem? | Texto estruturado equivalente |
| HistoricalMap | Onde aconteceu? | Lista de lugares e rotas |
| DocumentViewer / MediaGallery | Qual é a evidência primária? | Transcrição e alt text |
| QuoteWithSource | Quem disse, onde? | Citação com referência completa |
| SourceDrawer | De onde vem esta afirmação? | Lista de fontes por afirmação |
| SectionProgressNavigation | Onde estou? | Índice por âncoras |
| RelatedIdeologies | Para onde posso ir? | Links com a natureza da relação |

Cada bloco recebe dados tipados e tem estados de carregamento, vazio e erro.

## A6. Direção visual

Preservar a identidade aprovada: modernismo suíço, tipografia editorial expressiva, papel quente, preto e vermelho, cartografia histórica, museografia digital, composição geométrica, leitura confortável com alta densidade informacional e hierarquia clara.

- Fundo claro como padrão. Cores auxiliares por tipo de entidade e por ideologia, sempre com forma ou rótulo redundante (a cor nunca carrega sozinha o significado).
- Variar composição entre capítulos: escala tipográfica, assimetria, colunas, divisórias, legendas integradas, respiros, sobreposição moderada, imagens recortadas com propósito.
- Vetado: tema escuro uniforme, gradientes e glassmorphism como substitutos de direção artística, grids de cards idênticos, heros de produto.

## A7. Motion system

- **Tokens:** rápido 120 ms (hover, foco), base 240 ms (painéis, filtros), lento 480 ms (entrada de nós, construção de linhas). Easing `cubic-bezier(.2,.7,.2,1)`. Sem bounce.
- **Funções do motion:** orientar (de onde veio o painel), relacionar (destacar conexões), revelar (conteúdo progressivo), registrar (progresso). Se uma animação não cumpre uma delas, é removida.
- **Scroll-driven:** preferir CSS nativo (`animation-timeline: view()` / `scroll()`) com `@supports` e fallback por IntersectionObserver. Eixo de timeline em `position: sticky`.
- **Transições entre estados e páginas:** View Transitions API do Angular Router onde houver suporte, com degradação para navegação normal.
- **Regras:** animações interrompíveis, funcionam em toque, nunca mais de algumas dezenas de elementos animando ao mesmo tempo, sem loop infinito.
- **`prefers-reduced-motion`:** durações caem para \~0, movimento vira mudança de contraste ou posição instantânea; além disso, um controle manual na interface.
- Bibliotecas de animação só com ganho concreto e mensurável sobre CSS.

## A8. Rigor editorial

**Tipos de aresta (obrigatórios no schema):** `influencia-documentada`, `divergencia-ou-critica`, `continuidade`, `desenvolvimento`, `associacao-tematica`, `descoberta-enciclopedica`. Cada aresta carrega `fontes[]` e `certeza` (`estabelecida` | `debatida` | `incerta`). Exceção: `descoberta-enciclopedica` não exige fonte, mas é rotulada na interface como "ligação de descoberta, não afirmação histórica".

**Regras:**

- Link entre artigos da Wikipédia não é prova de influência ou causalidade.
- Entidades reconciliadas por **QID do Wikidata**, nunca só pelo nome da página.
- Citações só com fonte primária ou secundária identificável. Nenhuma citação reconstruída de memória.
- Equidade: todas as ideologias recebem a mesma estrutura, o mesmo esforço e o mesmo tom. Cada uma é apresentada pelo que seus defensores sustentam e pelas críticas feitas por críticos reais, com o mesmo critério de fonte. Fatos estabelecidos (por exemplo, atrocidades documentadas cometidas por regimes) são afirmados com clareza e sem falsa equivalência. O ATLAS não emite veredito sobre controvérsias em aberto.
- Status de revisão por página e por bloco: `rascunho` | `com-fontes` | `revisado` (este exige revisor humano identificado).

## A9. Dados, Wikimedia e licenças

**Pipeline:** scripts Node.js (build ou desenvolvimento) consultam Wikipedia, Wikidata e Commons, normalizam, validam com Zod e gravam snapshots JSON versionados. O Angular só lê esses snapshots. Nada de chamada à Wikimedia a cada visita pública. Atualização por reingestão controlada e novo deploy.

**Divisão de papéis:**

- **Wikipedia:** contexto, descoberta de tópicos, links. Registrar `oldid` (revisão) e data de coleta.
- **Wikidata:** identidade (QID), datas, classificações e relações registradas.
- **Commons:** imagens e documentos. Ler licença, autor e crédito pelos metadados da API (`imageinfo` com `extmetadata`) e gravar a string de atribuição pronta.

**Etiqueta de API:** `User-Agent` descritivo com contato, respeito aos limites de taxa, cache local do bruto (fora do versionamento) e snapshots normalizados versionados.

**Licenças:** texto da Wikipédia é CC BY-SA; adaptar e redistribuir exige atribuição e mesma licença. A decisão padrão é conteúdo editorial próprio, com poucos trechos curtos atribuídos e link para o histórico do artigo. Qualquer reuso extenso de texto precisa de decisão explícita de quem responde pelo projeto (não é aconselhamento jurídico). Cada mídia guarda licença, autor, URL de origem e data.

**Organização:** snapshots particionados por domínio, por exemplo `src/content/ideologies/<slug>/page.json`, `src/content/graph/entities-*.json` e `src/content/media/manifest.json`. O agente avalia o custo de carregar o `atlas.json` atual inteiro e propõe a partição, ingerindo apenas o necessário para os módulos suportados.

**Banco de dados e backend:** não. Gerar centenas de páginas a partir de JSON, com URL própria, SEO e componentes interativos, é suficiente e entrega tudo estaticamente. Só se propõe backend com demonstração técnica de necessidade (por exemplo, contas de usuário ou busca que não caiba no cliente).

## A10. Modelo de página (esboço do contrato)

Separar fatos históricos (grafo comum) de instruções de apresentação (definição da página).

```ts
type IdeologyPage = {
  schemaVersion: number;
  id: string; slug: string;               // estáveis
  kind: 'ideologia' | 'corrente' | 'tradicao' | 'movimento' | 'programa';
  title: string; kicker: string; summary: string;
  review: { status: 'rascunho' | 'com-fontes' | 'revisado'; reviewer?: string; updatedAt: string };
  identity: { accent: string; signature: string; keyVisualization: BlockType };
  chapters: Chapter[];
  related: { slug: string; relation: EdgeType; sources: string[] }[];
};

type Chapter = {
  id: string; anchor: string; title: string; kicker: string;
  narrative: RichText;                    // conteúdo editorial próprio
  blocks: Block[];                        // união discriminada por `type`
  sourceIds: string[];
  layout: { variant: string };            // apresentação, não fatos
};

type Block =
  | { type: 'timeline'; eventIds: string[]; scale?: 'decada' | 'ano' }
  | { type: 'graph'; nodeIds: string[]; edgeFilter?: EdgeType[] }
  | { type: 'thinkers'; entityIds: string[]; mode: 'galeria' | 'genealogia' | 'constelacao' }
  | { type: 'concept'; conceptId: string }
  | { type: 'comparison'; positions: string[] }
  | { type: 'map'; placeIds: string[]; period?: [number, number] }
  | { type: 'document'; mediaId: string }
  | { type: 'quote'; quoteId: string };
```

Schemas em Zod, tipos derivados dos schemas. Referências a entidades por ID do grafo comum, nunca duplicando fatos na página.

## A11. Acessibilidade e performance

- Responsivo de 320 px ao desktop amplo. Uso completo por teclado, foco visível, semântica HTML primeiro e ARIA só quando necessário (padrões do WAI-ARIA Authoring Practices).
- Contraste: texto 4,5:1; componentes e linhas de interface 3:1 (WCAG 2.2). Separar cor de preenchimento de cor de texto quando a cor viva não passa.
- Todo grafo, mapa e infográfico tem alternativa textual equivalente (A5).
- Imagens responsivas com alt text e crédito. Estados de carregamento, vazio e erro em todo bloco.
- Módulos pesados (grafo, mapa) em `@defer` com placeholder estável, sem salto de layout.
- **Orçamentos propostos (ajustar depois de medir):** LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 (limiares "bom" do Core Web Vitals); JS inicial da rota ≤ \~200 KB gzip; grafo com até \~150 nós visíveis por vez (SVG) e canvas acima disso.

## A12. Definição de pronto (checklist por página)

- [ ] Compreensível de ponta a ponta sem sair da página.
- [ ] Sem tabs; capítulos no scroll nativo; índice e progresso funcionando.
- [ ] Cada capítulo central presente ou ausência justificada por falta de fonte.
- [ ] Pelo menos uma interação que ensina algo por capítulo.
- [ ] Todas as arestas com tipo, fonte e certeza; incertezas visíveis.
- [ ] Toda mídia com licença e atribuição.
- [ ] Hover, foco e toque equivalentes; reduced-motion testado.
- [ ] Alternativas textuais para grafo, mapa e infográficos.
- [ ] Estados de carregamento, vazio e erro.
- [ ] Redirects das rotas antigas; links e âncoras estáveis.
- [ ] Lint, typecheck, testes unitários, build e Playwright passando.
- [ ] Orçamento de performance medido e registrado.
- [ ] Composição própria (a página não é um clone com título trocado).

---

