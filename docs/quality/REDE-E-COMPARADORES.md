# Rede e comparadores

> Estado atual (02/11/2026): `/rede` e `/comparar` redirecionam para `/conhecimento` no escopo temporário de 01/11/2026, e o diretório `features/exploration/pages/analysis` não existe nesta árvore. O texto abaixo é o registro histórico da entrega, não uma descrição de rotas ativas.

Entrega de 01/11/2026, baseada no commit `43d911e`, em Windows, Node 24 e npm 11. Implementa a fase 4 da exploração com o acervo existente, preservando as 48 entidades, 66 relações, fontes, IDs e estados editoriais. Não altera snapshots históricos nem faz novas coletas.

## Código e responsabilidades

- `scripts/content/exploration-layout.mjs`: gera geometria determinística global e por coleção, curvas por ID de vínculo e escala temporal global. Relações paralelas preservam IDs e curvas diferentes. Ordenação por tipo/ID organiza a leitura; não representa proximidade histórica.
- `core/content/models/exploration-layout.ts`: contrato Zod incorporado ao artefato `layouts` existente, com hash/manifesto/TransferState. Não há nova requisição independente ou dependência de geometria no bundle cliente.
- `core/content/queries/exploration-analysis.ts`: parser, validação e recorte puro compartilhado; mantém todas as relações elegíveis entre os IDs visíveis. Seleções explícitas ausentes não são substituídas silenciosamente. Os valores padrão da comparação procuram registros distintos; uma duplicação explícita exige correção pelo usuário.
- `features/exploration/pages/analysis`: composição lazy de `/rede` e `/comparar`. `analysis-filters`, `knowledge-network` e `relation-evidence` separam controles, projeção visual e evidências.
- `shared/ui/knowledge-timeline`: apresentação reutilizada pela rede e pela comparação histórica. Recebe entidades e posições prontas; não importa features nem calcula uma escala no navegador.
- Catálogos e páginas permanentes oferecem os novos caminhos. Rotas, critérios de publicação, README, escopo e arquitetura foram atualizados. Os componentes antigos não publicados de rede/visualizações permanecem preservados; não se afirma migração de todo código legado.

## Filtros e estabilidade

`colecao`, `tipo`, `relacao`, `de`, `ate` e `semData` definem o mesmo recorte nas duas páginas. A navegação entre Rede e Comparadores mantém esses filtros. `/rede?no=<id>` seleciona uma entidade; `/comparar?esquerda=<id>&direita=<id>&modo=historica|conceitual` permite compartilhar a comparação. Histórico e reload mantêm os parâmetros; canonicals usam apenas o caminho da página.

Coleção escolhe um perfil já compilado. Dentro desse perfil, tipo, vínculo, período e seleção não reposicionam os nós nem recalculam as curvas. Os eixos temporais são globais e permanecem iguais inclusive ao trocar coleção ou selecionar apenas dois registros. O filtro de vínculo exige que as duas extremidades estejam visíveis; não injeta vizinhos ocultos no resultado.

Anos são inteiros entre −100000 e 100000; intervalo invertido ou malformado produz erro e recorte vazio. O período filtra os anos conhecidos das entidades, não as datas dos vínculos. Com dois extremos conhecidos usa a interseção do intervalo; com apenas um, usa aquele ano, sem prolongar o período. `semData=nao` exclui registros sem data; o padrão os mantém, com indicação explícita.

O SVG permite selecionar por clique, Enter e Espaço; a lista alternativa oferece os mesmos registros. A lista é priorizada no mobile. Seleção na rede preservou foco e scroll no teste observado, com diferença máxima aceita de 2px. Não se promete estabilidade universal nem se mede CLS nesta entrega.

## Comparação e método editorial

O modo conceitual apresenta questão/contexto, formulações registradas e afirmações/evidências de cada lado. O modo histórico acrescenta a timeline em escala comum. A página oferece dois conceitos e duas revoluções como recortes iniciais; os registros podem ser trocados sem gerar novas afirmações históricas.

A comparação é documental: não calcula similaridade, ranking ou equivalência teórica, não infere causalidade nem produz síntese automática. Tipos diferentes recebem aviso de não equivalência. Fontes compartilhadas são apenas referências com o mesmo ID nas afirmações dos dois registros; a procedência sintética `context-origin` não cria uma falsa referência comum. Ausência de fonte ou vínculo não demonstra ausência histórica.

Cada vínculo direto ou incidente à seleção mostra a direção original, verbo, contexto, ID, tipo, situação editorial, incerteza e evidências com localizadores/data de consulta. Links importados mantêm a procedência e o aviso de revisão. Afirmações reutilizam `AtlasClaimReferencesComponent`, preservando classificação, revisão e referências. Lacunas e ausência de revisão humana permanecem visíveis.

Na timeline, ponto significa um único ano conhecido; barra significa dois extremos conhecidos. Um extremo ausente não representa duração; registros sem data continuam na lista. Precisão e incerteza são textuais. O significado dos períodos varia entre pessoas, obras e acontecimentos; a interface orienta a conferir contexto e fontes no registro, sem rotular automaticamente um ano como nascimento, publicação ou início de uma tradição.

## Verificações observadas

| Comando | Resultado |
| --- | --- |
| `npm run build` | Passou após os ajustes finais; 67 rotas prerenderizadas, sem erros ou avisos de template Angular |
| `npm run typecheck` | Passou para aplicação e testes |
| `npm test` | 129 testes passaram em 26 arquivos |
| `npm run test:content` | Cinco testes passaram; inclui geometria por IDs, independência da ordem de entrada, datas ausentes/únicas e determinismo offline |
| `npm run lint` | Passou: Angular/templates, seis testes arquiteturais, Biome e Prettier |
| `npm run test:e2e -- --workers=2` | 35 testes passaram em 34,3s, incluindo os cinco novos testes de rede/comparadores |
| `npm run test:e2e -- e2e/network-comparison.spec.ts --workers=2` | Cinco testes passaram novamente após o ajuste visual final do eixo mobile |
| `npm run check:links` | Links e âncoras de 68 HTMLs verificados, incluindo shell CSR |
| `git diff --check` | Sem erros de whitespace |

Os E2E verificam coordenadas/eixo invariantes após filtro, transferência de filtros, reload, Back/Forward, duas modalidades de comparação, fontes/localizadores, lacunas, datas parciais, ausência de data, seleção por teclado, foco/scroll, intervalo inválido, coleção ausente e par duplicado. URLs diretas têm HTML/canonical; a hidratação das novas páginas não repetiu downloads `/content/*`. As jornadas anteriores de leitura e exploração também passaram.

Rede e comparadores foram verificados em 320px e desktop, com movimento reduzido. Axe não encontrou violações serious/critical nos estados auditados. Capturas locais: `output/playwright/network-desktop.png` e `output/playwright/comparison-mobile.png`. Isso não equivale a auditoria WCAG integral ou testes em todos os dispositivos.

## Problemas encontrados e corrigidos

- Typecheck expôs inferência de propriedades opcionais numa lista de casos inválidos do teste; a lista recebeu o contrato correto. Avisos Angular em mapas de rótulos foram resolvidos com tipagem parcial, e ordem de imports/formatação foram corrigidas.
- Um select dinâmico podia exibir a opção padrão apesar de o recorte da URL já estar aplicado. As opções agora refletem explicitamente a seleção, inclusive coleções/IDs indisponíveis. As jornadas foram repetidas até passar.
- O teste de estabilidade inicialmente capturava o SVG estático global antes de a hidratação aplicar a coleção da URL. Passou a aguardar o estado inicial do filtro e então comparar coordenadas do mesmo perfil, sem ocultar mudanças reais de geometria.
- O teste de recorte vazio também encontrava o status do rodapé; foi limitado ao conteúdo principal. Controles são localizados pelo role/nome acessível.
- A revisão visual encontrou quebra vertical do último ano do eixo em 320px; rótulos agora permanecem em uma linha. O build e os cinco E2E pertinentes foram repetidos.

## Custos e limites

O artefato de layouts tem 25.118 bytes compactos em JSON, incluindo geometrias editoriais anteriores, seis perfis de rede e a timeline. Release: `2aae531074a2b9312e848808ce9e1cacfb5bfb5de7be4de05fedd89d41dc519b`. O build informou 351,56 kB iniciais brutos / 98,78 kB estimados para transferência; o novo chunk lazy de análise tem 34,73 kB / 9,59 kB estimados. Não se afirma ganho geral de performance.

Continua a política de preparar o conjunto global de coleções/índices nas rotas de conteúdo. O prerender cobre as páginas padrão; filtros da URL são aplicados na hidratação. Isso pode alterar o recorte inicial de um acesso direto filtrado, embora a geometria do perfil seja pré-calculada. Sem zoom/arraste/force simulation, backend ou dependência nova.

Não houve alteração em `src/content`, `public` ou ingestão; os dados e suas licenças são os mesmos. O aviso Node `MODULE_TYPELESS_PACKAGE_JSON` do compilador de conteúdo permanece informativo e já existia. Não houve push, deploy, workflow remoto ou execução da fase 5.
