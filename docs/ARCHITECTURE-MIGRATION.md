# Auditoria e inventário da refatoração

Data: 01/11/2026. Estado inicial: working tree limpo; Node 24.13.0, npm 11.6.2.

## Diagnóstico

A árvore completa de src/app, conteúdo, scripts, docs e e2e foi inventariada. Shared mistura apresentação genérica, exploração e ideologias; core reúne testes de páginas e progresso específico de estudo. Pages reúne Home e páginas temáticas. ContentRepository acumula grafo e dossiê de ideologia. Ui-primitives agrega nove declarações Angular; prévias e contexto agregam componentes, diretivas e contratos. Templates e estilos inline dificultam localizar responsabilidades.

Ingestão já é comum às ideologias (o script Liberalismo é um wrapper); separar configuração, cliente Wikimedia e normalização, mantendo o pipeline único. Documentação arquitetural antiga descreve rotas removidas: o estado vigente é o de ESCOPO-ATUAL.md.

## Plano incremental

- [x] Migrar grupos coesos conforme inventário; atualizar todos os imports, recursos Angular e referências de ferramentas.
- [x] Separar primitivas, diretivas, contratos e funções puras dos componentes; externalizar HTML/SCSS sem mudar seletores, hosts ou conteúdo.
- [x] Extrair carregamento de dossiês para serviço da feature; manter ContentRepository independente de features e da apresentação.
- [x] Compor rotas centrais e rotas lazy da feature preservando URLs e metadados.
- [x] Separar responsabilidades do pipeline Wikimedia sem executar nova ingestão.
- [x] Documentar convenções e impor limites com ESLint; verificar ciclos e preservação de conteúdo.
- [x] Executar typecheck, lint, testes, build, E2E e links; revisar diff.

## Inventário origem → destino

Os recursos e testes acompanham seu componente. Extrações adicionais estão documentadas na arquitetura final e no diff. Não há diretórios vazios nem novas rotas.

| Origem | Destino |
| --- | --- |
| `src/app/app.ts` | `src/app/layouts/app-shell/app-shell.component.ts` |
| `src/app/app.html` | `src/app/layouts/app-shell/app-shell.component.html` |
| `src/app/app.scss` | `src/app/layouts/app-shell/app-shell.component.scss` |
| `src/app/app.spec.ts` | `src/app/layouts/app-shell/app-shell.component.spec.ts` |
| `src/app/app-shell.spec.ts` | `src/app/layouts/app-shell/app-shell.navigation.spec.ts` |
| `src/app/pages/home-page.ts` | `src/app/pages/home/home-page.component.ts` |
| `src/app/pages/home-page.html` | `src/app/pages/home/home-page.component.html` |
| `src/app/pages/home-page.scss` | `src/app/pages/home/home-page.component.scss` |
| `src/app/pages/ideology-page.ts` | `src/app/features/ideologies/pages/ideology/ideology-page.component.ts` |
| `src/app/pages/ideology-page.html` | `src/app/features/ideologies/pages/ideology/ideology-page.component.html` |
| `src/app/pages/ideology-page.scss` | `src/app/features/ideologies/pages/ideology/ideology-page.component.scss` |
| `src/app/pages/ideology-page.spec.ts` | `src/app/features/ideologies/pages/ideology/ideology-page.component.spec.ts` |
| `src/app/pages/liberalism-atlas-page.ts` | `src/app/features/ideologies/components/ideology-atlas/ideology-atlas.component.ts` |
| `src/app/pages/liberalism-atlas-page.html` | `src/app/features/ideologies/components/ideology-atlas/ideology-atlas.component.html` |
| `src/app/pages/liberalism-atlas-page.scss` | `src/app/features/ideologies/components/ideology-atlas/ideology-atlas.component.scss` |
| `src/app/pages/marx-atlas-page.ts` | `src/app/features/ideologies/components/value-debate/value-debate.component.ts` |
| `src/app/pages/marx-atlas-page.html` | `src/app/features/ideologies/components/value-debate/value-debate.component.html` |
| `src/app/pages/marx-atlas-page.scss` | `src/app/features/ideologies/components/value-debate/value-debate.component.scss` |
| `src/app/pages/liberalism-atlas-page-visual.scss` | `src/app/features/ideologies/components/ideology-atlas/ideology-atlas-visual.scss` |
| `src/app/pages/liberalism-interaction.scss` | `src/app/features/ideologies/components/ideology-atlas/ideology-atlas-interaction.scss` |
| `src/app/shared/ideology-block.ts` | `src/app/features/ideologies/components/ideology-block/ideology-block.component.ts` |
| `src/app/shared/ideology-block.html` | `src/app/features/ideologies/components/ideology-block/ideology-block.component.html` |
| `src/app/shared/ideology-block.scss` | `src/app/features/ideologies/components/ideology-block/ideology-block.component.scss` |
| `src/app/shared/ideology-exploration.scss` | `src/app/features/ideologies/components/ideology-block/ideology-exploration.scss` |
| `src/app/shared/evidence-network.ts` | `src/app/features/exploration/components/evidence-network/evidence-network.component.ts` |
| `src/app/shared/evidence-network.html` | `src/app/features/exploration/components/evidence-network/evidence-network.component.html` |
| `src/app/shared/evidence-network.scss` | `src/app/features/exploration/components/evidence-network/evidence-network.component.scss` |
| `src/app/shared/evidence-network.spec.ts` | `src/app/features/exploration/components/evidence-network/evidence-network.component.spec.ts` |
| `src/app/shared/historical-visualizations.ts` | `src/app/features/exploration/components/historical-visualizations/historical-visualizations.component.ts` |
| `src/app/shared/historical-visualizations.html` | `src/app/features/exploration/components/historical-visualizations/historical-visualizations.component.html` |
| `src/app/shared/historical-visualizations.scss` | `src/app/features/exploration/components/historical-visualizations/historical-visualizations.component.scss` |
| `src/app/shared/historical-visualizations.spec.ts` | `src/app/features/exploration/components/historical-visualizations/historical-visualizations.component.spec.ts` |
| `src/app/shared/breadcrumbs.ts` | `src/app/shared/ui/breadcrumbs/breadcrumbs.component.ts` |
| `src/app/shared/editorial-mark.ts` | `src/app/shared/ui/editorial-mark/editorial-mark.component.ts` |
| `src/app/shared/licensed-asset.ts` | `src/app/shared/ui/licensed-asset/licensed-asset.component.ts` |
| `src/app/shared/licensed-asset.spec.ts` | `src/app/shared/ui/licensed-asset/licensed-asset.component.spec.ts` |
| `src/app/shared/reading-outline.ts` | `src/app/shared/ui/reading-outline/reading-outline.component.ts` |
| `src/app/shared/study-exercise.ts` | `src/app/shared/ui/study-exercise/study-exercise.component.ts` |
| `src/app/shared/knowledge-context.ts` | `src/app/shared/ui/knowledge-context/knowledge-context.component.ts` |
| `src/app/shared/knowledge-context.scss` | `src/app/shared/ui/knowledge-context/knowledge-context.component.scss` |
| `src/app/shared/knowledge-text.ts` | `src/app/features/ideologies/components/knowledge-text/knowledge-text.component.ts` |
| `src/app/shared/knowledge-text.scss` | `src/app/features/ideologies/components/knowledge-text/knowledge-text.component.scss` |
| `src/app/shared/knowledge-text.spec.ts` | `src/app/features/ideologies/utils/knowledge-text-parts.spec.ts` |
| `src/app/shared/reading-preview.ts` | `src/app/shared/ui/reading-preview/reading-preview.component.ts` |
| `src/app/shared/discovery-preview.ts` | `src/app/shared/ui/discovery-preview/discovery-preview.component.ts` |
| `src/app/shared/editorial-text.ts` | `src/app/shared/ui/editorial-text/editorial-text.component.ts` |
| `src/app/shared/editorial-text.spec.ts` | `src/app/shared/ui/editorial-text/editorial-text.component.spec.ts` |
| `src/app/shared/continue-reading.ts` | `src/app/shared/ui/continue-reading/continue-reading.component.ts` |
| `src/app/shared/claim-references.ts` | `src/app/shared/ui/claim-references/claim-references.component.ts` |
| `src/app/shared/ui-primitives.ts` | `src/app/shared/ui/{button,text-field,content-summary,disclosure,menu,notice,page-template}/*.component.ts` e `shared/directives/{heading,editorial-link}/*.directive.ts` |
| `src/app/shared/ui-primitives.scss` | `src/app/shared/ui/ui-primitives.scss` |
| `src/app/shared/ui-contrast.spec.ts` | `src/app/shared/ui/ui-contrast.spec.ts` |
| `src/app/shared/brand-assets.spec.ts` | `src/app/shared/ui/brand-assets.spec.ts` |
| `src/app/core/content-schema.ts` | `src/app/core/content/models/content-schema.ts` |
| `src/app/core/content-schema.spec.ts` | `src/app/core/content/models/content-schema.spec.ts` |
| `src/app/core/study-schema.ts` | `src/app/core/content/models/study-schema.ts` |
| `src/app/core/ideology-page-schema.ts` | `src/app/features/ideologies/models/ideology-page.schema.ts` |
| `src/app/core/ideology-exploration.spec.ts` | `src/app/features/ideologies/models/ideology-exploration.spec.ts` |
| `src/app/core/ideology-page.spec.ts` | `src/app/features/ideologies/models/ideology-page.schema.spec.ts` |
| `src/app/core/marx-atlas.spec.ts` | `src/app/features/ideologies/data/marx-atlas.spec.ts` |
| `src/app/core/liberalism-atlas.spec.ts` | `src/app/features/ideologies/components/ideology-atlas/ideology-atlas.component.spec.ts` |
| `src/app/core/content-repository.ts` | `src/app/core/content/repositories/content-repository.service.ts` |
| `src/app/core/content-repository.spec.ts` | `src/app/core/content/repositories/content-repository.service.spec.ts` |
| `src/app/core/knowledge-graph.ts` | `src/app/core/content/queries/knowledge-graph.ts` |
| `src/app/core/knowledge-graph.spec.ts` | `src/app/core/content/queries/knowledge-graph.spec.ts` |
| `src/app/core/discovery-index.ts` | `src/app/core/content/queries/discovery-index.ts` |
| `src/app/core/discovery-index.spec.ts` | `src/app/core/content/queries/discovery-index.spec.ts` |
| `src/app/core/study-progress.ts` | `src/app/features/study/utils/study-progress.ts` |
| `src/app/core/study-progress.spec.ts` | `src/app/features/study/utils/study-progress.spec.ts` |
| `src/app/content/content-types.ts` | `src/app/core/content/editorial/content-types.ts` |
| `src/app/content/editorial-entries.ts` | `src/app/core/content/editorial/editorial-entries.ts` |
| `src/app/content/demonstration-path.ts` | `src/app/features/study/data/demonstration-path.ts` |
| `src/app/content/route-resolvers.ts` | `src/app/core/routing/route-resolvers.ts` |

## Extrações e decisões

| Origem/responsabilidade | Destino final |
| --- | --- |
| ContentRepository.loadIdeology e testes de dossiês | features/ideologies/services/ideology-repository.service.ts e .spec.ts |
| Registro antes condicionado ao slug dentro do serviço | features/ideologies/data/published-ideologies.ts |
| Composição e abertura editorial de Liberalismo | features/ideologies/pages/liberalism e data/liberalism-atlas.ts |
| Exercício do debate de valor | features/ideologies/data/value-study.ts |
| Vocabulário e tipos do hipertexto | features/ideologies/data/knowledge-vocabulary.ts e models/knowledge-term.ts |
| Segmentação do hipertexto e seus testes | features/ideologies/utils/knowledge-text-parts.ts e .spec.ts |
| KnowledgeContext/ContextRequest | core/content/models/knowledge-context.ts |
| entityContext | core/content/queries/entity-context.ts |
| reproducibleAsset | core/content/media/asset-license.ts |
| Diretivas de conhecimento e prévias | shared/directives/{knowledge-context,reading-preview,discovery-preview} |
| HTML e estilos inline de componentes de produto | arquivos .component.html/.component.scss junto ao componente |
| Rotas temáticas antes no roteador central | features/ideologies/routes/ideologies.routes.ts |
| Configurações Wikimedia/QIDs | scripts/ingestion/wikimedia/configurations.mjs |
| HTTP Wikimedia e download de mídia | scripts/ingestion/wikimedia/client.mjs |
| Normalização de datas/claims/referências | scripts/ingestion/wikimedia/normalize.mjs |
| Limites e ciclos | scripts/architecture/eslint-boundaries.cjs e .spec.cjs |

A árvore de blocos permanece única por domínio: o discriminante Zod seleciona interações no renderer, sem novas árvores por ideologia. Timeline/grafo já existentes não foram duplicados em componentes com os mesmos comportamentos. Os widgets de contexto/licença/estudo são compartilhados por contrato, enquanto o vocabulário histórico específico permanece na feature. Não foi criada feature sources/knowledge sem uma jornada independente no escopo atual.

A migração foi executada no checkout autorizado, branch codex/atlas-v4, inicialmente limpo. Execução autorizada expressamente pelo briefing. Sem mudanças de design ou novas rotas. Um único commit local abrange a refatoração; sem push/deploy.

## Registro de validação

Referência anterior: typecheck, lint, 100 testes em 19 arquivos e build com três rotas passaram antes de mover código. Durante a migração, uma extração inválida de comentário em SCSS impediu a compilação e foi corrigida; a nova fixture do atlas precisou de provideRouter para renderizar RouterLink. As verificações afetadas foram repetidas.

O primeiro E2E não iniciou porque a porta 4305 já estava ocupada. ATLAS_PREVIEW_PORT permite executar a mesma infraestrutura em outra porta, mantendo 4305 como padrão e sem encerrar o processo preexistente. Os testes das URLs removidas verificam o fallback do Router via navegação no cliente; a configuração de redirects da hospedagem permanece intocada.

Resultados finais observados:

- `npm run typecheck`: passou.
- `npm run lint`: passou, incluindo ESLint Angular/limites/ciclos, cinco testes da regra, Biome e Prettier.
- `npm test`: 105 testes em 20 arquivos passaram.
- `npm run build`: passou; três rotas prerenderizadas; headers CSP regenerados.
- `ATLAS_PREVIEW_PORT=4317 npm run test:e2e -- --workers=2`: 12 testes passaram (a variável foi definida no ambiente PowerShell).
- `npm run check:links`: passou; quatro HTMLs estáticos (três páginas e shell CSR).
- Integridade: 38 arquivos de src/content/public idênticos ao estado inicial por SHA-256. Texto, links, mídia, title, description e canonical do prerender das três páginas iguais à referência inicial.
- Wikimedia offline: configurações idênticas e 11 casos de normalização equivalentes às funções anteriores. Nenhuma ingestão remota executada.
- Revisão independente somente leitura: sem achados materiais; checklist documental atualizado. `git diff --cached --check` sem erros.

Limites: sem teste de nova ingestão na rede; não realizada comparação visual pixel a pixel nem auditoria WCAG integral. Os testes de navegação/foco, mobile, geometria de timeline/grafo, imagens e axe verificam os estados exercitados. Redirects dependem da hospedagem e não foram implantados nesta tarefa.
