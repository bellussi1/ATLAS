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
├── /sobre                            Missão e propósito do ATLAS
└── qualquer caminho desconhecido     Página 404
```

Valores válidos de `:tipo`: `verbete`, `artigo`, `dossie`, `pessoa`, `evento`, `atlas`, `visualizacao` e `trilha`. Os índices são gerados a partir de `src/app/content/content-types.ts`; as páginas de detalhe e seu conteúdo estão em `src/app/content/editorial-entries.ts`.

## Entradas da página inicial

| Intenção | Destino | Resultado |
| --- | --- | --- |
| Tenho uma dúvida | `/explorar/verbete/como-ler-um-verbete` | Exemplo acessível que explica o tratamento editorial de um verbete |
| Quero explorar | `/explorar` | Índice navegável das oito categorias |
| Quero estudar | `/estudar` | Apresentação do formato de trilhas, com link para seu exemplo de metodologia |

A primeira entrada não simula uma resposta de busca: leva a uma página real que explica como o ATLAS pretende contextualizar conceitos. A busca da home continua explicitamente indisponível.

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

Os três exemplares descrevem a metodologia e as intenções declaradas do próprio projeto. As páginas dos outros formatos estão marcadas como previstas e descrevem somente sua função editorial futura. Não há dados ou afirmações históricas fictícias nestas páginas.

## Navegação, breadcrumbs e acessibilidade

- A navegação principal usa links Angular Router com `routerLinkActive`; a rota corrente recebe `aria-current="page"`.
- Breadcrumbs globais mostram Início, os níveis de navegação e a página corrente. O início não exibe breadcrumb redundante.
- A rota curinga e os slugs/categorias desconhecidos mostram estado de não encontrado com um caminho de retorno.
- Os pontos de entrada, índices e links de retorno são âncoras nativas, alcançáveis por teclado e com foco visível. A navegação quebra linha em telas estreitas e os índices mudam para coluna única em viewport móvel.
- Rotas de categoria e detalhe conhecidas são prerenderizadas a partir dos mesmos dados editoriais; o build permanece static-first.
