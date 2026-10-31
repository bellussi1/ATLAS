# Arquitetura da informação do ATLAS

Este sitemap registra a navegação implementada no Prompt 02. Na leitura do repositório para esta etapa não foram encontrados documentos de produto ou UX separados; as decisões abaixo seguem `AGENTS.md`, `README.md`, os prompts do projeto e a aplicação existente.

## Sitemap

```text
/                                      Início e três pontos de entrada
├── /explorar                         Índice de categorias editoriais
│   └── /explorar/:tipo               Índice de uma categoria
│       └── /explorar/:tipo/:slug     Detalhe editorial ou de metodologia
├── /estudar                          Apresentação do formato de trilhas
│   └── /estudar/:slug                Detalhe de uma trilha
├── /verbete/:slug                    Registro conceitual validado do ATLAS
├── /fontes                           Biblioteca das fontes e seus usos cadastrados
├── /sobre                            Missão e propósito do ATLAS
└── qualquer caminho desconhecido     Página 404
```

Valores válidos de `:tipo`: `verbete`, `artigo`, `dossie`, `pessoa`, `evento`, `atlas`, `visualizacao` e `trilha`. Os índices são gerados a partir de `src/app/content/content-types.ts`; as páginas de detalhe e seu conteúdo estão em `src/app/content/editorial-entries.ts`.

## Entradas da página inicial

| Caminho | Destino | Resultado |
| --- | --- | --- |
| Investigar conexões | `/relacoes` | Rede metodológica entre afirmação e evidência |
| Situar acontecimentos | `/tempo-e-espaco` | Estado vazio explícito até existirem eventos datados e localizados |
| Pesquisar e ler | `/conhecimento` | Busca nos registros carregados e caminhos para leituras reais |

A home destaca três textos de metodologia e oferece busca real nos registros do grafo e nas entradas editoriais. O grafo inclui entidades e relações documentadas sobre o processo constituinte de 1987–1988 e a Constituição de 1988. A interface de cronologia e mapas ainda não está disponível; nenhum mapa ou fronteira é simulado.

O verbete de metodologia em `/explorar/verbete/como-ler-um-verbete` também aponta para `/verbete/metodologia-do-atlas`, a rota canônica que consome o registro estruturado validado por Zod.

## Tipos e estado editorial

| Tipo | Índice | Página de detalhe atual |
| --- | --- | --- |
| Verbete | `/explorar/verbete` | `/explorar/verbete/como-ler-um-verbete` — exemplar de metodologia |
| Artigo | `/explorar/artigo` | `/explorar/artigo/conhecimento-com-contexto` — exemplar de metodologia |
| Dossiê | `/explorar/dossie` | `/explorar/dossie/como-o-atlas-organiza-dossies` — formato previsto |
| Pessoa | `/explorar/pessoa` | `/explorar/pessoa/como-o-atlas-apresenta-pessoas` — formato previsto |
| Evento | `/explorar/evento` | `/explorar/evento/como-o-atlas-contextualiza-eventos` — formato previsto |
| Atlas | `/explorar/atlas` | `/explorar/atlas/atlas-de-metodo` — exemplar de metodologia |
| Visualização | `/explorar/visualizacao` | `/explorar/visualizacao/como-ler-uma-visualizacao` — formato previsto |
| Trilha | `/explorar/trilha` | `/explorar/trilha/como-usar-trilhas` — formato previsto; também acessível em `/estudar/como-usar-trilhas` |

Os três exemplares descrevem a metodologia e as intenções declaradas do próprio projeto. As páginas de detalhe marcadas como previstas descrevem somente a função editorial futura daquele formato. A rota canônica de verbete apresenta afirmações estruturadas, classificação, estado de revisão e referências do registro JSON. A biblioteca `/fontes` reúne fontes, edições, localizadores e verbetes que as citam, sem tratar o cadastro como validação humana. Páginas de leitura incluem sumário com âncoras, contexto de estado e caminhos relacionados existentes. As afirmações históricas cadastradas permanecem com o estado de revisão indicado no registro; não há dados ou afirmações históricas fictícias nestas páginas.

## Metadados

O título de cada rota vem do Angular Router. A aplicação atualiza a descrição e o link `rel="canonical"` na navegação, removendo query strings e fragmentos do endereço canônico. Como o projeto ainda não define o domínio público, o `href` canônico é root-relative (`/caminho`); a hospedagem poderá publicá-lo como URL absoluta quando o domínio estiver configurado.

## Navegação, breadcrumbs e acessibilidade

- A navegação principal usa links Angular Router com `routerLinkActive`; a rota corrente recebe `aria-current="page"`.
- Breadcrumbs globais mostram Início, os níveis de navegação e a página corrente. O início não exibe breadcrumb redundante.
- A rota curinga e os slugs/categorias desconhecidos mostram estado de não encontrado com um caminho de retorno.
- Os pontos de entrada, índices e links de retorno são âncoras nativas, alcançáveis por teclado e com foco visível. A navegação quebra linha em telas estreitas e os índices mudam para coluna única em viewport móvel.
- A home e uma página de detalhe foram verificadas em viewport de 320 px; a escala do título principal se ajusta nesse breakpoint para evitar rolagem horizontal.
- Categorias e slugs inexistentes mostram estados específicos com link de retorno ao índice de conteúdos.
- Rotas de categoria e detalhe conhecidas são prerenderizadas a partir dos mesmos dados editoriais; o build permanece static-first.
- Capturas reais desta etapa: `output/playwright/prompt-08-home-desktop.png`, `output/playwright/prompt-08-home-mobile.png`, `output/playwright/prompt-08-artigo-mobile.png`, `output/playwright/prompt-08-fontes-desktop.png` e `output/playwright/prompt-08-fontes-mobile.png`.
