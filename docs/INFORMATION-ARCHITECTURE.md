# Arquitetura da informação do ATLAS

Este sitemap registra a navegação implementada no Prompt 02. Na leitura do repositório para esta etapa não foram encontrados documentos de produto ou UX separados; as decisões abaixo seguem `AGENTS.md`, `README.md`, os prompts do projeto e a aplicação existente.

## Sitemap

```text
/                                      Início e três pontos de entrada
├── /relacoes                         Rede de relações e evidências cadastradas
├── /tempo-e-espaco                   Estado da interface temporal/espacial
├── /conhecimento                     Busca nos registros disponíveis
├── /explorar                         Índice de categorias editoriais
│   └── /explorar/:tipo               Índice de uma categoria
│       └── /explorar/:tipo/:slug     Detalhe editorial ou de metodologia
├── /estudar                          Apresentação do formato de trilhas
│   └── /estudar/:slug                Detalhe de uma trilha
├── /verbete/:slug                    Registro conceitual validado do ATLAS
├── /fontes                           Biblioteca das fontes e seus usos cadastrados
├── /sistema                          Sistema visual e componentes acessíveis
├── /sobre                            Missão e propósito do ATLAS
└── qualquer caminho desconhecido     Página 404
```

Valores válidos de `:tipo`: `verbete`, `artigo`, `dossie`, `pessoa`, `evento`, `atlas`, `visualizacao` e `trilha`. Os índices são gerados a partir de `src/app/content/content-types.ts`; as páginas de detalhe e seu conteúdo estão em `src/app/content/editorial-entries.ts`.

## Entradas da página inicial

| Caminho | Destino | Resultado |
| --- | --- | --- |
| Investigar conexões | `/relacoes` | Rede de relações e evidências cadastradas |
| Situar acontecimentos | `/tempo-e-espaco` | Interface de cronologia/mapas ainda indisponível; registros existentes podem ser consultados nos verbetes |
| Pesquisar e ler | `/conhecimento` | Busca nos registros carregados e caminhos para leituras reais |

A home destaca três textos de metodologia e oferece busca real nos registros do grafo e nas entradas editoriais. O grafo inclui entidades e relações documentadas sobre o processo constituinte de 1987–1988 e a Constituição de 1988. A interface de cronologia e mapas ainda não está disponível; nenhum mapa ou fronteira é simulado.

Em `/conhecimento`, a busca inclui entidades, aliases, fontes e formatos editoriais disponíveis, normaliza acentos e aceita filtros de tipo e estado. Fontes abrem em âncoras estáveis da biblioteca. Verbete e fonte mantêm um retorno contextual à busca; prévias usam botões que funcionam por toque e teclado. Backlinks são gerados das relações e citações registradas e informam seus rótulos e contextos sem sugerir influência.

A jornada de cinco registros coberta pelo teste de navegação segue: evento de promulgação → obra constitucional → conceito de igualdade → artigo 5º → fonte constitucional, com cada vínculo e destino conferidos.

O verbete de metodologia em `/explorar/verbete/como-ler-um-verbete` também aponta para `/verbete/metodologia-do-atlas`, a rota canônica que consome o registro estruturado validado por Zod.

## Tipos e estado editorial

| Tipo | Índice | Página de detalhe atual |
| --- | --- | --- |
| Verbete | `/explorar/verbete` | `/explorar/verbete/como-ler-um-verbete` — exemplar de metodologia |
| Artigo | `/explorar/artigo` | `/explorar/artigo/conhecimento-com-contexto` — exemplar; `/verbete/constituicao-de-1988` — registro artigo com fonte e estado editorial |
| Dossiê | `/explorar/dossie` | `/explorar/dossie/como-o-atlas-organiza-dossies` — formato previsto |
| Pessoa | `/explorar/pessoa` | `/verbete/ulysses-guimaraes` — perfil com contexto e relações documentadas; a página-exemplo de formato permanece prevista |
| Evento | `/explorar/evento` | `/verbete/promulgacao-constituicao-1988` — evento com período e fonte; a página-exemplo de formato permanece prevista |
| Atlas | `/explorar/atlas` | `/explorar/atlas/atlas-de-metodo` — exemplar de metodologia |
| Visualização | `/explorar/visualizacao` | `/explorar/visualizacao/como-ler-uma-visualizacao` — formato previsto |
| Trilha | `/explorar/trilha` | `/explorar/trilha/como-usar-trilhas` — formato previsto; também acessível em `/estudar/como-usar-trilhas` |

Os três exemplares descrevem a metodologia e as intenções declaradas do próprio projeto. Artigos, pessoas e eventos com registros no grafo aparecem também em suas categorias; páginas-exemplo que descrevem formatos sem conteúdo próprio ficam marcadas como previstas. A rota canônica de verbete apresenta afirmações estruturadas, classificação, estado de revisão e referências do registro JSON. Perfis e eventos incluem contexto, período e relações com localizadores quando esses dados existem. A biblioteca `/fontes` reúne fontes, edições, localizadores e verbetes que as citam, sem tratar o cadastro como validação humana. Páginas de leitura incluem sumário com âncoras, contexto de estado e caminhos relacionados existentes. As afirmações históricas cadastradas permanecem com o estado de revisão indicado no registro; não há dados ou afirmações históricas fictícias nestas páginas.

## Metadados

O título de cada rota vem do Angular Router. A aplicação atualiza a descrição e o link `rel="canonical"` na navegação, removendo query strings e fragmentos do endereço canônico. Como o projeto ainda não define o domínio público, o `href` canônico é root-relative (`/caminho`); a hospedagem poderá publicá-lo como URL absoluta quando o domínio estiver configurado.

## Navegação, breadcrumbs e acessibilidade

- A navegação principal usa links Angular Router com `routerLinkActive`; a rota corrente recebe `aria-current="page"`.
- Breadcrumbs globais mostram Início, os níveis de navegação e a página corrente. O início não exibe breadcrumb redundante.
- A rota curinga e os slugs/categorias desconhecidos mostram estado de não encontrado com um caminho de retorno.
- Os pontos de entrada, índices e links de retorno são âncoras nativas, alcançáveis por teclado e com foco visível. A navegação quebra linha em telas estreitas e os índices mudam para coluna única em viewport móvel.
- Home, biblioteca de fontes e perfil de pessoa foram verificadas em desktop (1440 px) e mobile (390 px), sem rolagem horizontal. Por teclado, Tab alcança o link de pular conteúdo e Enter move o foco para o conteúdo principal.
- Categorias e slugs inexistentes mostram estados específicos com link de retorno ao índice de conteúdos.
- Rotas de categoria e detalhe conhecidas são prerenderizadas a partir dos mesmos dados editoriais; o build permanece static-first.
- Capturas reais desta etapa: `output/playwright/prompt-08-home-desktop.png`, `output/playwright/prompt-08-home-mobile.png`, `output/playwright/prompt-08-artigo-mobile.png`, `output/playwright/prompt-08-fontes-desktop.png`, `output/playwright/prompt-08-fontes-mobile.png`, `output/playwright/prompt-08-pessoa-desktop.png` e `output/playwright/prompt-08-pessoa-mobile.png`.
