# Arquitetura do ATLAS

Estado em 01/11/2026. Angular 21 (standalone, Signals, Router, TypeScript strict, SCSS, Zod). Frontend estático com prerender; sem backend permanente nem banco. O Knowledge Explorer amplia as URLs públicas sem alterar o conteúdo histórico.

## Mapa de responsabilidades

```text
src/app/
  app.config*.ts              providers e SSR
  app.routes*.ts              composição central e prerender
  core/
    content/
      models/                 contratos globais Zod, contexto e estudo
      repositories/           ContentRepository: grafo local e consultas
      queries/                grafo, índice de descoberta, contexto de entidade
      editorial/              catálogo e contratos editoriais preservados
      media/                  autorização de reprodução por licença
    routing/                  resolvers editoriais preservados
  shared/
    ui/<componente>/          apresentação genérica, diálogos e leitura
    directives/<diretiva>/    comportamento compartilhado, abertura de diálogos
  features/
    ideologies/
      pages/                  contêiner de dossiê e composição do Liberalismo
      components/             blocos, atlas reutilizável, hipertexto, debate de valor
      models/                 contrato Zod do dossiê e termos de conhecimento
      services/               IdeologyRepository: carregamento e TransferState
      data/                   registro publicado, vocabulário, composições editoriais
      utils/                  segmentação pura do hipertexto
      routes/                 rotas públicas com loadComponent
    exploration/components/   rede de evidências e visualizações históricas
    exploration/pages/        catálogos, busca universal, registros permanentes
    exploration/routes/       composição lazy das rotas de descoberta
    study/data/               trilha demonstrativa preservada
    study/utils/              progresso e tentativas de estudo
  layouts/app-shell/          navegação, metadados, breadcrumbs, transição, rodapé
  pages/home/                 busca universal e mesa de pesquisa
content/                      snapshots versionados, sem dependências Angular
public/                       mídia, fontes, marca, headers e redirects
scripts/ingestion/wikimedia/  configuração, cliente remoto e normalização
scripts/architecture/         regra ESLint e testes dos limites
scripts/*.mjs                 ingestão, build, preview e verificações
e2e/                          jornadas independentes dos unitários
```

Sem pastas vazias para pipes, acessibilidade ou features futuras: criar quando houver responsabilidade concreta. Fontes e conhecimento permanecem como contratos globais e componentes compartilhados até existir jornada própria que justifique outra feature. `shared/ui` aceita widgets editoriais baseados nos contratos de core; vocabulário específico do Marxismo pertence à feature de ideologias.

## Dependências e APIs

Fluxo permitido: composição da aplicação → páginas e layouts → feature → shared → core. Features também acessam core diretamente. Core não importa apresentação; shared não importa features; features não acessam implementações internas umas das outras. Modelos e serviços de conteúdo não dependem de componentes Angular.

- **Aliases:** `@core/*`, `@shared/*`, `@ideologies/*`, `@exploration/*`, `@study/*`, `@layouts/*`, `@pages/*`, `@app/*`.
- A regra ESLint resolve aliases e caminhos relativos, incluindo imports dinâmicos e reexports, e verifica ciclos. Não usar barrels para contornar limites.
- API que precise atravessar features: promover deliberadamente a core (dados e infraestrutura) ou shared (apresentação e comportamento), com responsabilidade documentada.
- Regra local `architecture/boundaries`: roda no lint e no CI já existente. Seus testes cobrem imports relativos, aliases, lazy loading, composição central, isolamento de modelos e serviços, e um ciclo. Verifica dependências TypeScript; não substitui revisão de coesão, acessibilidade ou conteúdo.

## Convenções Angular e testes

- Cada componente tem pasta: `nome.component.ts`, `nome.component.html`, `nome.component.scss` quando necessário, e `nome.component.spec.ts` só com testes reais. Sem arquivos vazios. HTML e SCSS visuais são externos.
- Primitivas separadas por componente; estilos genéricos globais em `shared/ui/ui-primitives.scss`, importados por `src/styles.scss`.
- Diretivas: `nome.directive.ts`. Serviços injetáveis: `nome.service.ts`. Schemas, contratos e funções puras usam o nome da responsabilidade. Imports no mesmo componente podem ser relativos.
- Testes unitários junto ao código. Contratos com snapshots reais; componentes com estados e ações. E2E em `e2e`, por jornada de leitura, navegação e atlas.
- Seletores e classes existentes preservados. Por compatibilidade, `ValueDebateComponent` mantém o seletor `app-marx-atlas-page` (bloco interno, sem rota). `AppComponent` continua como bootstrap, agora no layout do shell.

## Conteúdo e renderização

Evolução da enciclopédia, matriz de responsabilidades e fases: [Exploração contextual](EXPLORACAO-CONTEXTUAL.md). Fases 1–3 implementadas: ingestão reproduzível, índices antecipados, catálogos públicos. A ficha mantém cada relação por ID, direção, evidências, localizadores e procedência, com retorno de foco, scroll e detalhes abertos. Registros e catálogos pertencem a exploration; contratos, rótulos e consultas puras ficam em core. `public-readings.ts` declara só metadados de destinos públicos, sem importar implementações das features.

**Grafo e publicação:**
- Grafo canônico: `content/knowledge/manifest.json` e coleções com hash. `scripts/content/build-content.mjs` valida referências globais e gera, sem rede, snapshots compactos, busca, adjacência reversa e layouts em `generated/content`.
- `scripts/publish-r2.mjs` (`npm run content:publish`) envia artefatos e mídias com licença conhecida e reproduzível ao bucket público do R2, e grava `content/content-pointer.json` com hashes, bytes e licenças. Objetos imutáveis; publicar não exige redeploy.
- `scripts/content/fetch-content.mjs` (`prebuild`) preenche `generated/content-cache` a partir do ponteiro e recusa objeto com tamanho ou SHA-256 divergente.
- `ContentRepository` consome só a URL base pública: lê `pointer.json`, depois `c/<sha256>.json`, com cache de promessas, verificação e Zod. O resolver das leituras prepara o conjunto antes dos componentes. O SSR lê o cache verificado por `readContentAssetOnServer` e transfere os assets pela hidratação.
- Home não carrega o acervo; o grafo não entra no bundle cliente. Detalhes e limites em [Dados e carregamento](DADOS-E-CARREGAMENTO.md).

**Grafo em tela cheia (`/grafo`):** `GraphComponent` (exploration/pages/graph) ocupa a janela inteira; a rota declara `data.fullscreen` e o shell omite cabeçalho, trilha e rodapé. `core/content/queries/knowledge-network.ts` achata o grafo em nós e arestas únicos, define os oito tipos de nó (cor, forma, ícone) e as famílias de ligação (cor e tracejado), filtra por tipo, ligação e coleção, busca por nome e calcula um layout de forças determinístico, só no navegador após a primeira pintura. Coleções internas (`atlas-methodology`) ficam fora e os títulos perdem notas de produção. Tipos de ligação ainda ausentes do contrato (fundou, foi membro de, sucedeu, governou, ocorreu em) já têm legenda e aparecem com contagem zero até existirem nos dados.

**Rede e comparador:** a rede pública mostra a vizinhança de um registro, com busca no recorte e contexto ao lado. `buildExplorationLayout` gera vistas locais em `networks['focus:<coleção>:<entidade>']` (registro e vizinhos diretos). Coordenadas e curvas são antecipadas e determinísticas; filtros ocultam elementos sem reposicionar os demais. O comparador mantém pares, modo e filtros na URL, com inversão dos lados e critérios alinhados no desktop. Fontes, formulações e limites em disclosures nativos; no mobile, leitura em fluxo vertical. A cronologia reutiliza o eixo global, aberto por solicitação na rede.

**Ideologias:**
- `IdeologyRepository` (feature) usa `published-ideologies.ts` como registro explícito dos snapshots. No servidor carrega os JSON e valida o dossiê; TransferState evita segunda requisição na hidratação. No browser, sem estado transferido, consulta os assets locais. Slug ausente retorna `null`. Arquivos em `ideologies/examples` são exemplos não publicados.
- Marxismo e Liberalismo compõem a orientação editorial com `IdeologyReadingComponent`: abertura e capítulos são projetados; layout do índice, progresso, capítulo ativo, retorno, foco, navegação por fragmento e preferência de movimento ficam nele. `IdeologyReadingIndexComponent` mantém a apresentação dos controles. Contratos de seção e referência ficam em `features/ideologies/models`, sem dependência de componentes.
- `EditorialSourcesComponent` apresenta fontes de capítulo, bibliografia pesquisável e evidências de conexões; resolução, seleção e deduplicação continuam nos consumidores. As duas páginas preservam aberturas e composições, com os mesmos dados e âncoras públicas. Essas APIs pertencem à feature porque os consumidores atuais são leituras de ideologias.
- `IdeologyPageComponent` orquestra loading, erro, ausência, retry e leitura. `IdeologyBlockComponent` seleciona o bloco pelo discriminante Zod e contém os controles de seleção associados; não existe árvore de componentes por tradição. `ValueDebateComponent` mantém o debate de valor e trabalho, cuja configuração de exercício fica em data. `IdeologyAtlasComponent` recebe IDs de atlas e entidade, origem e abertura editorial, e oferece rede, timeline, seleção e mídia para diferentes coleções. O contêiner do Liberalismo fornece só sua configuração.
- `KnowledgeContextComponent` é compartilhado e recebe o contrato de core; a montagem de fontes e conexões é feita por `entity-context.ts`, independente da UI.

**Mídia:** `reproducibleAsset` (core/content/media) libera só ativos conhecidos e autorizados. Créditos, licença, URLs de origem e estados de revisão continuam nos snapshots. Nenhum componente consulta Wikimedia ao renderizar.

## Rotas, SEO e compatibilidade

- **Catálogos:** países, regimes, partidos, instituições, acontecimentos, conceitos e lugares, compostos pelo mesmo registro de catálogos. `countrySchema` exige identidade, recorte e evidências; `regimeSchema` exige início temporal e perfil com países e classificações atribuídas, edição e limites. O grafo valida referências e tipo dos países. `EntityProfileComponent` (exploration) apresenta esses contratos sem duplicar páginas nem promover automaticamente `place`, `government` ou `historical-polity` a país ou regime.
- **Traduções:** `content/translations/catalogue.json`, fora dos assets diretos. `content-translation.ts` define texto, idioma, revisão de origem e digest, e revisão linguística (`human` ou `assistant`). O build valida a origem e incorpora só traduções aprovadas ao índice de busca existente; sem serviço remoto nem asset adicional. O runtime seleciona campos traduzidos sem alterar identidade, perfil ou estado historiográfico. `idioma` é query param de catálogos e registros, com `lang` por trecho e fallback explícito. Canonical mantém o permalink original. Sem variantes prerenderizadas por idioma nem `hreflang` de páginas integralmente traduzidas, pois interface e dossiês seguem na redação de origem.
- **Edições editoriais:** `scripts/content/apply-editorial-edition.mjs` valida o grafo completo e reutiliza a publicação canônica por hash e rename, sem sobrescrever coleção existente divergente. Receita inicial em `scripts/editorial/2026-11-01-constitutional-contexts.json`. Capturas Wikimedia e coleções anteriores intactas. [Fontes e verificações](../quality/AMPLIACAO-EDITORIAL-E-IDIOMAS.md).
- **Rede e comparadores (fase 4):** `/rede` e `/comparar` em `explorationRoutes`, com `AnalysisComponent` como página de composição. `AnalysisFiltersComponent` e `selectAnalysisGraph` compartilham o recorte das duas jornadas. `KnowledgeNetworkComponent` recebe entidades, relações e layouts; `RelationEvidenceComponent` apresenta a direção original e as referências de cada vínculo. `shared/ui/knowledge-timeline` recebe entidades e escala compilada, usada pela rede e pela comparação; não importa features. Não substitui os formatos dos dossiês nem reativa componentes antigos não publicados.
- **Layout compilado:** `scripts/content/exploration-layout.mjs` gera posições e curvas por ID para todas as coleções e para o conjunto global; vínculos paralelos têm curvas distintas. O mesmo artefato traz a escala temporal global, pontos e intervalos por entidade. `core/content/models/exploration-layout.ts` valida o contrato dentro do artefato `layouts`, preservando manifesto, hash, cache e TransferState. Coleção seleciona um perfil compilado; filtros não movem nós. O eixo temporal é global e não é recalculado no cliente. Um único extremo temporal é ponto conhecido, sem duração inferida. [Rede e comparadores](../quality/REDE-E-COMPARADORES.md).
- **Rotas públicas:** `/`, `/marxismo`, `/liberalismo`, `/conhecimento`, `/grafo`, `/entidades`, `/ideologias`, `/pessoas`, `/obras`, `/fontes`, `/verbete/:slug`, `/rede`, `/comparar`, `/paises`, `/regimes`, `/partidos`, `/instituicoes`, `/acontecimentos`, `/conceitos`, `/lugares`. `app.routes.ts` compõe Home, `ideologyRoutes`, `explorationRoutes` e fallback; componentes lazy. `app.routes.server.ts` enumera entidades e exemplos para o prerender. Catálogos apontam para a mesma página permanente de entidade, sem duplicar conteúdo ou canonical.
- **Busca e registros:** pertencem à feature exploration. Estudo e páginas institucionais seguem fora do escopo. Caminhos desconhecidos voltam à Home pelo Router; o preview estático responde 404 para arquivos inexistentes. Busca compartilha filtros por `q`, `tipo` e `estado`; `origem` permite retornar ao catálogo anterior, validado contra destinos locais permitidos. Canonical relativo exclui filtros. Fontes em contexto, âncoras e restauração de foco nas prévias permanecem.
- Documentos de etapas anteriores são históricos; prevalecem este documento e [ESCOPO-ATUAL.md](../product/ESCOPO-ATUAL.md).

## Como criar uma feature

1. Identifique a jornada e crie só as pastas necessárias em `features/<dominio>`.
2. Páginas e contêineres em `pages`; apresentação de domínio em `components`; contratos em `models`; dados específicos em `data`. Infraestrutura global e funções reutilizáveis vão para core ou shared, por decisão explícita.
3. Defina rotas perto do domínio e componha-as no roteador central, preservando lazy loading e o escopo de publicação autorizado.
4. Contratos sem dependência de componentes, Signals ou templates. Testes reais junto ao código e jornadas E2E separadas.
5. Rode lint, typecheck e testes; se afetar navegação ou renderização, rode também build, E2E e links.

## Como adicionar uma ideologia

1. Siga [PAGE_STANDARD.md](../design/PAGE_STANDARD.md). Registre recorte, classificação, fontes, revisão real, âncoras e IDs estáveis nos JSON. Valide com `ideologyPageSchema` e `validateIdeologyDossier`.
2. Para leitura por dossiê, adicione a configuração em `published-ideologies.ts` só com publicação autorizada. O serviço genérico carrega e valida os arquivos sem cópia de implementação.
3. Para exploração de coleção, forneça configuração própria ao `IdeologyAtlasComponent`; não copie o atlas do Liberalismo. Leitura pode usar o renderer de blocos existente.
4. Adicione rota lazy e metadados na feature, só dentro do escopo autorizado. Teste referências, slugs, estados vazio e erro, teclado, mobile, conteúdo prerenderizado e links. Exemplos não publicados ficam fora do registro e das rotas.

Para uma tradição nova de ponta a ponta (registro, extração, grafo, capítulos, imagens e verificação), use o pipeline `npm run tradicao -- <slug>`: estágios, portas e estado em `scripts/tradicao` e no skill `atlas-pipeline-tradicao`. O piso de cobertura (`scripts/tradicao/coverage-floor.json`) é medido nas leituras de Marxismo e Liberalismo e testado em `npm run test:content`.

## Como adicionar um bloco interativo

Comece pelo contrato discriminado em `models/ideology-page.schema.ts`, com IDs, referências e validação editorial. Adicione apresentação em `components` e integre ao renderer de blocos. Interação complexa com estado próprio vira componente separado; não criar componentes idênticos por ideologia. Dados específicos ficam em `data` ou snapshots, e consultas puras fora do template. Preservar âncoras, query params, teclado, foco, reduced motion e estados vazios. Testar o comportamento observável e a integridade das referências.

Geometria do dossiê em `features/ideologies/utils/visualization-geometry.ts`; D3 calcula curvas e eixos no build. Componentes públicos consomem layouts compilados e só filtram e selecionam; o renderer mantém SVG, controles e coordenadas no prerender e na hidratação. O atlas usa pontos e ordem materializados, sem trigonometria em runtime. Matriz de escolhas em [DEPENDENCIES.md](../reference/DEPENDENCIES.md).

## Wikimedia e armazenamento

- `ingest:liberalism` e `ingest:marxism` compartilham a CLI `scripts/ingest-wikimedia-atlas.mjs`; o wrapper do Liberalismo preserva as flags.
- Em `scripts/ingestion/wikimedia`: configuração e cliente de rede separados do arquivo de captura (`archive.mjs`), da reconciliação global (`reconcile.mjs`), da montagem sem escrita (`transform.mjs`) e da publicação (`pipeline.mjs`). Captura é explícita; replay offline usa configuração, base e respostas versionadas com hashes, sem fallback de rede. O pipeline reutiliza o schema Zod de core antes de substituir o snapshot por rename. Detalhes em [Ingestão reproduzível](INGESTAO-REPRODUZIVEL.md). Capturas brutas não entram nos assets públicos. `test:ingestion` e `ingest:verify` rodam no CI.
- **Grafo:** `content/knowledge/manifest.json` e `collections`. **Dossiês:** `content/ideologies/<slug>/page.json`. **Suplementos:** `content/graph`.
- **Mídia:** metadados e licenças nos snapshots; imagens servidas pelos servidores do Wikimedia (`--media remote`). Ativos locais licenciados vão para `m/<sha256>.<ext>` e são registrados no ponteiro; referências de template ainda apontam para `public/`.
- O build não copia `generated/content` para o site: o prerender lê o cache verificado do release. Dossiês e suplementos seguem como snapshots JSON do bundle; fontes canônicas e fixtures de teste não são assets.
- A ingestão compartilha o leitor e escritor canônico e publica novos shards antes de trocar o manifesto. Ingestão externa nunca roda durante uma visita.

## Validação da migração

Comandos: typecheck, lint (inclui governança), `npm test`, build, `test:content`, `test:e2e` e `check:links`. O E2E cobre leituras, catálogos, busca universal, fontes, páginas permanentes, contexto, teclado, toque e responsividade. Não equivale a auditoria WCAG integral. Detalhes em [Knowledge Explorer](../quality/KNOWLEDGE-EXPLORER.md).
