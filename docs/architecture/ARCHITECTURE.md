# Arquitetura do ATLAS

Estado vigente em 01/11/2026. Angular 21, componentes standalone, Signals, Router, TypeScript strict, SCSS e Zod. Frontend estático com prerender; sem backend permanente ou banco de dados. A refatoração não altera URLs, conteúdo histórico ou direção visual.

## Mapa de responsabilidades

```text
src/app/
  app.config*.ts              composição de providers e SSR
  app.routes*.ts              composição central e prerender
  core/
    content/
      models/                contratos globais Zod, contexto e estudo
      repositories/          ContentRepository: grafo local e consultas
      queries/               grafo, índice de descoberta e contexto de entidade
      editorial/             catálogo e contratos editoriais preservados
      media/                 autorização de reprodução por licença
    routing/                 resolvers editoriais preservados
  shared/
    ui/<componente>/         apresentação genérica, diálogos e leitura
    directives/<diretiva>/   comportamento compartilhado, abertura de diálogos
  features/
    ideologies/
      pages/                 contêiner de dossiê e composição do Liberalismo
      components/            blocos, atlas reutilizável, hipertexto e debate de valor
      models/                contrato Zod do dossiê e termos de conhecimento
      services/              IdeologyRepository: carregamento/TransferState
      data/                  registro publicado, vocabulário e composições editoriais
      utils/                 segmentação pura do hipertexto
      routes/                rotas públicas com loadComponent
    exploration/components/  rede de evidências e visualizações históricas
    study/data/              trilha demonstrativa preservada
    study/utils/             progresso e tentativas de estudo
  layouts/app-shell/         navegação, metadados, breadcrumbs, transição e rodapé
  pages/home/                busca local e mesa de pesquisa
src/content/                 snapshots versionados, sem dependências Angular
public/                      mídia, fontes, marca, headers e redirects
scripts/ingestion/wikimedia/ configuração, cliente remoto e normalização
scripts/architecture/        regra ESLint e testes dos limites
scripts/*.mjs                entrada de ingestão, build, preview e verificações
e2e/                        jornadas independentes dos unitários
```

Não há pastas vazias para pipes, acessibilidade ou features futuras. Criá-las quando existir responsabilidade concreta. Fontes e conhecimento permanecem contratos globais e componentes compartilhados enquanto não houver uma jornada própria que justifique outra feature. `shared/ui` aceita widgets editoriais reutilizáveis baseados nos contratos de core; o vocabulário específico de Marxismo pertence à feature de ideologias.

## Dependências e APIs

Fluxo permitido: composição da aplicação → páginas/layouts → feature → shared → core. Uma feature também acessa core diretamente. Core não importa apresentação; shared não importa features; features não acessam implementações internas umas das outras. Modelos e serviços de conteúdo não dependem de componentes Angular.

Aliases: `@core/*`, `@shared/*`, `@ideologies/*`, `@exploration/*`, `@study/*`, `@layouts/*`, `@pages/*`, `@app/*`. A regra ESLint resolve tanto aliases quanto caminhos relativos, incluindo imports dinâmicos e reexports. Também verifica ciclos. Não usar barrels para contornar limites. Uma API que precise atravessar features deve ser promovida deliberadamente a core (dados/infraestrutura) ou shared (apresentação/comportamento), com responsabilidade documentada.

A regra local `architecture/boundaries` roda no lint e no CI já existente. Seus testes exercitam imports relativos, aliases, lazy loading, composição central, isolamento de modelos/serviços e um ciclo. Ela verifica dependências locais TypeScript; não substitui revisão de coesão, acessibilidade ou conteúdo editorial.

## Convenções Angular e testes

Cada componente tem uma pasta: `nome.component.ts`, `nome.component.html`, `nome.component.scss` quando necessário e `nome.component.spec.ts` somente com testes reais. Não adicionar arquivos vazios. HTML e SCSS visuais são externos. Primitivas antes agregadas estão separadas por componente; estilos genéricos globais permanecem em `shared/ui/ui-primitives.scss`, importados por `src/styles.scss`.

Diretivas: `nome.directive.ts`; serviços injetáveis: `nome.service.ts`; schemas, contratos e funções puras usam nomes da responsabilidade. Imports dentro do mesmo componente podem ser relativos. Testes unitários ficam próximos ao código. Testes de contratos usam snapshots reais; testes de componentes verificam estados e ações. E2E fica em `e2e`, por jornada de leitura, navegação e atlas.

Seletores e classes CSS existentes foram preservados para evitar regressões. Por compatibilidade, `ValueDebateComponent` ainda usa o seletor `app-marx-atlas-page`; é um bloco interno, sem rota. `AppComponent` continua sendo o bootstrap, agora localizado no layout do shell.

## Conteúdo e renderização

A evolução proposta da enciclopédia, a matriz de responsabilidades e as fases estão em [Exploração contextual](EXPLORACAO-CONTEXTUAL.md). A primeira fatia preserva o armazenamento e as três rotas: a ficha mantém cada relação por ID, direção, evidências/localizadores e procedência, com retorno de foco, scroll e detalhes abertos. Ela reutiliza o hipertexto da feature nas duas tradições; catálogos públicos e índices antecipados continuam fases posteriores.

O grafo canônico é composto por `src/content/knowledge/manifest.json` e coleções com hash. `scripts/content/build-content.mjs` valida referências globais e gera snapshots compactos, busca, adjacência reversa e layouts em `generated/content`, sem rede. `ContentRepository` carrega esses assets com HttpClient, cache de promessas, hashes e Zod; o resolver das leituras prepara o conjunto antes dos componentes. O SSR usa um provider de arquivos exclusivo do servidor e transfere os assets pela hidratação. Home não carrega o acervo, e não há import do grafo no bundle cliente. Detalhes e limites em [Dados e carregamento](DADOS-E-CARREGAMENTO.md).

`IdeologyRepository` pertence à feature e usa `published-ideologies.ts` como registro explícito dos snapshots de dossiês. No servidor carrega os módulos JSON e valida o dossiê; TransferState evita uma segunda requisição na hidratação. No browser, sem estado transferido, consulta os assets locais. Slug ausente do registro retorna null. Arquivos em `ideologies/examples` são exemplos não publicados.

`IdeologyPageComponent` orquestra loading, erro, ausência, retry e leitura. `IdeologyBlockComponent` seleciona o bloco pelo discriminante Zod e contém os controles de seleção associados; não existe árvore de componentes por tradição. `ValueDebateComponent` conserva o debate específico de valor e trabalho, cuja configuração de exercício fica em data. `IdeologyAtlasComponent` recebe IDs de atlas/entidade, origem e abertura editorial, e oferece rede, timeline, seleção e mídia para diferentes coleções. O contêiner do Liberalismo apenas fornece sua configuração. `KnowledgeContextComponent` é compartilhado e recebe o contrato de core; a montagem das fontes/conexões é feita por `entity-context.ts`, independente da UI.

`reproducibleAsset` fica em core/content/media e só libera ativos conhecidos e autorizados. Créditos, licença, URLs de origem e estados de revisão continuam nos snapshots. Nenhum componente consulta Wikimedia ao renderizar.

## Rotas, SEO e compatibilidade

Somente `/`, `/marxismo` e `/liberalismo` estão publicadas. `app.routes.ts` compõe Home, `ideologyRoutes` e fallback; componentes continuam lazy. O spread das definições de feature preserva a tabela plana, títulos, breadcrumbs e dados de rota, sem introduzir um segmento novo na URL. `app.routes.server.ts` mantém o prerender das rotas públicas conhecidas.

As páginas antigas de verbetes, fontes, busca geral, estudo e institucionais não foram recriadas. Caminhos desconhecidos retornam à Home pelo Router; hospedagem deve usar o fallback estático/redirects existentes. Busca local da Home, fontes em contexto, query params, âncoras, restauração de foco e canonical relativo permanecem. Documentos de etapas anteriores que descrevam outras rotas são históricos; prevalecem este documento e [ESCOPO-ATUAL.md](../product/ESCOPO-ATUAL.md).

## Como criar uma feature

1. Identifique a jornada e crie apenas as pastas necessárias em `features/<dominio>`.
2. Coloque páginas/contêineres em pages, apresentação de domínio em components, contratos em models e dados específicos em data. Infraestrutura global e funções reutilizáveis têm destino deliberado em core/shared.
3. Defina as rotas perto do domínio e componha-as no roteador central, preservando lazy loading e o escopo de publicação autorizado.
4. Use contratos sem dependência de componentes, Signals e templates Angular. Coloque testes reais junto ao código e jornadas E2E separadas.
5. Rode lint, typecheck, testes e, quando afetar navegação/renderização, build, E2E e links.

## Como adicionar uma ideologia

1. Siga [PAGE_STANDARD.md](../design/PAGE_STANDARD.md); registre recorte, classificação, fontes, revisão real, âncoras e IDs estáveis nos JSONs. Valide com `ideologyPageSchema` e `validateIdeologyDossier`.
2. Para leitura por dossiê, adicione a configuração em `published-ideologies.ts` apenas quando a publicação estiver autorizada. O serviço genérico carrega e valida os novos arquivos sem cópia de implementação.
3. Para exploração de coleção, forneça uma configuração própria ao `IdeologyAtlasComponent`; não copie o atlas do Liberalismo. Uma composição de leitura pode usar o renderer de blocos existente.
4. Adicione a rota lazy e seus metadados na feature somente dentro do escopo autorizado. Teste referências, slugs, estados vazios/erro, teclado, mobile, conteúdo prerenderizado e links. Exemplos não publicados continuam fora do registro/rotas.

## Como adicionar um bloco interativo

Comece pelo contrato discriminado em models/ideology-page.schema.ts, com IDs/referências e validação editorial. Adicione apresentação em components e integre ao renderer de blocos. Separe uma interação complexa em componente próprio quando possuir estado/responsabilidade independente; não crie componentes idênticos por ideologia. Mantenha dados específicos em data/snapshots e consultas puras fora do template. Preserve âncoras/query params, teclado, foco, reduced motion e estados vazios. Teste o comportamento observável e a integridade das referências.

Os algoritmos de geometria do dossiê ficam em `features/ideologies/utils/visualization-geometry.ts`; D3 calcula curvas/eixos durante o build. Os componentes públicos consomem layouts compilados e apenas filtram/selecionam dados; o renderer Angular mantém SVG, controles e coordenadas no prerender e na hidratação. O atlas usa pontos/ordem materializados, sem trigonometria no runtime. A matriz de escolhas permanece em [DEPENDENCIES.md](../reference/DEPENDENCIES.md).

## Wikimedia e armazenamento

Os comandos `ingest:liberalism` e `ingest:marxism` compartilham a CLI em `scripts/ingest-wikimedia-atlas.mjs`; o wrapper Liberalismo preserva flags. Em `scripts/ingestion/wikimedia`, configurações e cliente de rede ficam separados do arquivo de captura (`archive.mjs`), reconciliação global (`reconcile.mjs`), montagem sem escrita (`transform.mjs`) e publicação (`pipeline.mjs`). Captura é explícita; replay offline usa configuração/base/respostas versionadas e hashes, sem fallback de rede. O pipeline reutiliza o schema Zod de core antes de substituir o snapshot por rename. Detalhes e limites em [Ingestão reproduzível](INGESTAO-REPRODUZIVEL.md); capturas brutas não entram nos assets públicos. `test:ingestion` e `ingest:verify` também rodam no CI.

Grafo: `src/content/knowledge/manifest.json` e `collections`. Dossiês: `src/content/ideologies/<slug>/page.json`. Suplementos: `src/content/graph`. Mídia: `public/assets`, `public/images`. O build publica os derivados de `generated/content` e os dossiês/suplementos; fontes canônicas e fixtures de teste não são assets. A ingestão compartilha o leitor/escritor canônico e publica novos shards antes de trocar o manifesto. Ingestão externa nunca roda durante uma visita.

## Validação da migração

Comandos: typecheck, lint (inclui governança), npm test, build, test:e2e e check:links. A integridade dos arquivos de conteúdo e public é comparada por hash com o estado inicial; E2E cobre as três páginas, busca local, fontes, contexto, teclado/toque e responsividade. Isso não equivale a uma auditoria WCAG integral.
