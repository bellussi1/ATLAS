# Knowledge Explorer: contratos e validação

Entrega de 01/11/2026 sobre o commit `26e0577`, em Windows, Node 24 e npm 11. O escopo foi ampliado por pedido explícito para busca universal, catálogos e páginas permanentes. A implementação parcial encontrada no workspace foi preservada, revisada e concluída nesta entrega.

## Comportamento entregue

- `/conhecimento` pesquisa o índice compilado: 48 entidades, 86 fontes, oito exemplos metodológicos e duas leituras, totalizando 144 entradas. Nomes, aliases, resumos e textos indexados são normalizados sem distinção de caixa/acentos; todos os termos da consulta devem ocorrer. A ordenação é alfabética.
- `/entidades`, `/ideologias`, `/pessoas` e `/obras` recortam os registros do grafo. Exemplos de metodologia sobre pessoas ou artigos continuam disponíveis na busca universal, mas não são apresentados como registros históricos nesses catálogos.
- `/verbete/:slug` é a página permanente compartilhada por todos os catálogos. Reutiliza IDs/slugs existentes e exibe contexto, seções, afirmações, fontes, imagens autorizadas e conexões com direção, evidências e procedência. As leituras `/marxismo` e `/liberalismo` mantêm seus URLs próprios.
- `/fontes#source-<id>` publica as referências e os registros que as citam. Fontes têm âncoras permanentes no índice; não recebem cópias em páginas individuais.
- `/explorar/:tipo/:slug` torna acessíveis os oito exemplos metodológicos já cadastrados, com identificação explícita de exemplo ou formato previsto.
- `q`, `tipo` e `estado` preservam busca/filtros em reload e histórico. `origem` permite retornar ao recorte anterior, validando os destinos locais permitidos. O link permanente e o canonical excluem esses parâmetros.
- Home encaminha a busca para `/conhecimento`, sem carregar o grafo. Header, footer e prévias contextuais abrem os novos destinos. Catálogos e registros são lazy e preparados pelo resolver antes da ativação, reutilizando cache e TransferState.

## Arquivos e responsabilidades

As páginas e as rotas estão em `features/exploration/pages` e `features/exploration/routes`. Consultas/facetas ficam em `core/content/queries/knowledge-explorer.ts`. Metadados dos destinos públicos e rótulos editoriais ficam em `core/content/editorial`, sem importar implementação das features.

`scripts/content/build-content.mjs` inclui os textos dos dossiês publicados no índice durante o build. `discovery-index.ts` mantém destinos reais e considera a situação editorial do registro quando não há afirmações associadas. A apresentação não declara revisão humana para os registros importados pendentes.

`app.routes.server.ts` enumera os parâmetros publicados. `app-shell.component.ts` usa o título resolvido da rota para os metadados de compartilhamento, evitando capturar o título da navegação anterior. README, escopo e arquitetura foram atualizados junto com os testes de navegação.

## Verificações executadas

| Comando | Resultado observado |
| --- | --- |
| `npm run typecheck` | Passou, aplicação e testes |
| `npm test` | 125 testes passaram em 25 arquivos |
| `npm run test:content` | Quatro testes passaram: composição, determinismo offline, validação e atualização seletiva de hashes |
| `npm run lint` | Passou: Angular/templates, seis testes arquiteturais, Biome e Prettier |
| `npm run build` | Passou; 65 rotas prerenderizadas e headers/CSP gerados |
| `npm run check:links` | Links e âncoras internas de 66 HTMLs verificados, incluindo o shell CSR |
| `npm run test:e2e -- --workers=2` | 30 testes passaram, incluindo seis jornadas do Explorer |
| `git diff --check` | Sem erros de whitespace |

A suíte de navegador cobre busca desde a Home, aliases/acentos, filtros, histórico, reload, retorno aos resultados, catálogo vazio, parâmetro indisponível, verbete ausente e rejeição de retorno externo. Segue uma relação de Karl Marx a O capital, abre uma fonte por âncora e navega de uma prévia contextual à página permanente correspondente.

Todos os 144 destinos do índice são consultados na saída estática, verificando título, `og:title`, canonical e fragmentos. Catálogos e registros foram auditados em 320px, com movimento reduzido e Axe sem achados serious/critical nos estados examinados. O link de pular conteúdo foi operado por teclado. As jornadas anteriores de leitura, contexto, toque, foco, geometria e recuperação de erro também passaram.

Capturas locais revisadas: `output/playwright/explorer-people-desktop.png` e `output/playwright/explorer-record-mobile.png`. Elas não são ativos publicados nem evidência histórica.

## Problemas corrigidos durante a revisão

- O template do registro não compilava ao receber relação sem situação editorial. O rótulo agora trata a ausência como situação não informada; typecheck e testes foram repetidos.
- O teste de títulos inicialmente presumiu que o nome curto de uma leitura seria seu título SEO completo. Foi corrigido para preservar os títulos próprios de Marxismo e Liberalismo.
- A nova asserção de `og:title` falhou de fato: uma página permanente recebia o título da Home. `NavigationEnd` ocorre antes da atualização de título pelo Router; o shell passou a ler o snapshot resolvido. A checagem foi repetida contra todos os destinos.
- O lint identificou anotação redundante e leitura de `innerText` no teste; ambas foram corrigidas.
- README e arquitetura ainda continham trechos sobre a busca restrita a duas leituras; foram atualizados para o comportamento desta entrega.

## Limites

Não houve coleta, alteração dos snapshots canônicos/dossiês, tradução automática nem nova revisão historiográfica. Alguns resumos importados permanecem em outros idiomas e os estados editoriais continuam visíveis. O Explorer organiza o acervo existente; não garante completude histórica.

Busca é local, textual e alfabética, sem backend, ranking semântico, paginação ou consulta a serviços remotos. Catálogos e páginas de registro ainda preparam o conjunto global de coleções/índices, conforme a política da fase 2. O índice de busca gerado tem 154.601 bytes; o build informou 351,12 kB iniciais brutos / 98,65 kB estimados para transferência. Não se afirma ganho universal de velocidade.

Verbetes inexistentes apresentam recuperação na SPA; arquivos não prerenderizados retornam 404 no preview. O piloto mantém `noindex, nofollow`. Canonicals são relativos à raiz porque não há host de produção definido. Não houve auditoria WCAG integral, verificação de URLs externas, workflow remoto, push ou deploy.
