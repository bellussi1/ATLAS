# Knowledge Explorer: contratos e validação

Entrega de 01/11/2026, sobre o commit `26e0577`, em Windows, Node 24 e npm 11. Escopo ampliado por pedido explícito para busca universal, catálogos e páginas permanentes. A implementação parcial encontrada no workspace foi preservada, revisada e concluída nesta entrega.

## Comportamento entregue

- **Busca (`/conhecimento`):** índice compilado com 48 entidades, 86 fontes, oito exemplos metodológicos e duas leituras, total de 144 entradas. Nomes, aliases, resumos e textos são normalizados sem distinção de caixa ou acentos; todos os termos da consulta devem ocorrer. Ordenação alfabética.
- **Catálogos (`/entidades`, `/ideologias`, `/pessoas`, `/obras`):** recortam os registros do grafo. Exemplos de metodologia sobre pessoas ou artigos seguem na busca universal, mas não aparecem como registros históricos nesses catálogos.
- **Verbete (`/verbete/:slug`):** página permanente compartilhada por todos os catálogos. Reutiliza IDs e slugs existentes e exibe contexto, seções, afirmações, fontes, imagens autorizadas e conexões com direção, evidências e procedência. `/marxismo` e `/liberalismo` mantêm seus URLs próprios.
- **Fontes (`/fontes#source-<id>`):** referências e registros que as citam. Âncoras permanentes no índice; sem cópias em páginas individuais.
- **Removido:** `/explorar/:tipo/:slug` (01–03/11/2026). Eram páginas-modelo sem conteúdo histórico. A metodologia vive em `/verbete/metodologia-do-atlas`.
- **Parâmetros:** `q`, `tipo` e `estado` preservam busca e filtros em reload e histórico. `origem` permite voltar ao recorte anterior, validando destinos locais permitidos. Link permanente e canonical excluem esses parâmetros.
- **Home:** encaminha a busca para `/conhecimento` sem carregar o grafo. Header, footer e prévias contextuais abrem os novos destinos. Catálogos e registros são lazy e preparados pelo resolver antes da ativação, reutilizando cache e TransferState.

## Arquivos e responsabilidades

- Páginas e rotas: `features/exploration/pages` e `features/exploration/routes`.
- Consultas e facetas: `core/content/queries/knowledge-explorer.ts`.
- Metadados de destinos públicos e rótulos editoriais: `core/content/editorial`, sem importar implementação das features.
- `scripts/content/build-content.mjs` inclui no índice o texto dos dossiês publicados. `discovery-index.ts` mantém destinos reais e considera a situação editorial do registro quando não há afirmações associadas. A apresentação não declara revisão humana para registros importados pendentes.
- `app.routes.server.ts` enumera os parâmetros publicados. `app-shell.component.ts` usa o título resolvido da rota nos metadados de compartilhamento, evitando capturar o título da navegação anterior. README, escopo e arquitetura atualizados com os testes de navegação.

## Verificações executadas

| Comando | Resultado |
|---|---|
| `npm run typecheck` | Passou, aplicação e testes |
| `npm test` | 125 testes em 25 arquivos |
| `npm run test:content` | Quatro testes: composição, determinismo offline, validação e atualização seletiva de hashes |
| `npm run lint` | Passou: Angular/templates, seis testes arquiteturais, Biome e Prettier |
| `npm run build` | Passou; 65 rotas prerenderizadas; headers e CSP gerados |
| `npm run check:links` | Links e âncoras internas de 66 HTMLs, incluindo o shell CSR |
| `npm run test:e2e -- --workers=2` | 30 testes, incluindo seis jornadas do Explorer |
| `git diff --check` | Sem erros de whitespace |

Cobertura de navegador: busca desde a Home, aliases e acentos, filtros, histórico, reload, retorno aos resultados, catálogo vazio, parâmetro indisponível, verbete ausente, rejeição de retorno externo. Segue uma relação de Karl Marx a O capital, abre uma fonte por âncora e navega de uma prévia contextual à página permanente correspondente.

Os 144 destinos do índice são consultados na saída estática, verificando título, `og:title`, canonical e fragmentos. Catálogos e registros auditados em 320 px, com movimento reduzido e Axe sem achados serious ou critical nos estados examinados. Link de pular conteúdo operado por teclado. Jornadas anteriores de leitura, contexto, toque, foco, geometria e recuperação de erro também passaram.

Capturas locais: `output/playwright/explorer-people-desktop.png` e `output/playwright/explorer-record-mobile.png`. Não são ativos publicados nem evidência histórica.

## Problemas corrigidos na revisão

- Template do registro não compilava com relação sem situação editorial. O rótulo agora trata a ausência como "situação não informada".
- Teste de títulos presumia que o nome curto de uma leitura fosse seu título SEO completo. Corrigido para preservar os títulos próprios de Marxismo e Liberalismo.
- Asserção de `og:title` falhou de fato: página permanente recebia o título da Home. `NavigationEnd` ocorre antes da atualização de título pelo Router; o shell passou a ler o snapshot resolvido.
- Lint apontou anotação redundante e leitura de `innerText` no teste; corrigidas.
- README e arquitetura ainda descreviam busca restrita a duas leituras; atualizados.

## Limites

Sem coleta, alteração de snapshots canônicos ou dossiês, tradução automática nem nova revisão historiográfica. Alguns resumos importados seguem em outros idiomas, e os estados editoriais continuam visíveis. O Explorer organiza o acervo existente; não garante completude histórica.

Busca local, textual e alfabética, sem backend, ranking semântico, paginação nem serviços remotos. Catálogos e páginas de registro ainda preparam o conjunto global de coleções e índices, conforme a política da fase 2. Índice de busca gerado: 154.601 bytes. Build: 351,12 kB iniciais brutos e 98,65 kB estimados para transferência. Não se afirma ganho universal de velocidade.

Verbetes inexistentes mostram recuperação na SPA; arquivos não prerenderizados retornam 404 no preview. O piloto mantém `noindex, nofollow`. Canonicals são relativos à raiz, pois não há host de produção definido. Sem auditoria WCAG integral, verificação de URLs externas, workflow remoto, push ou deploy.
