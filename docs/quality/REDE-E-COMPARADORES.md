# Rede e comparadores

> **Estado atual (02/11/2026):** `/rede` e `/comparar` redirecionam para `/conhecimento` no escopo temporário de 01/11/2026, e `features/exploration/pages/analysis` não existe nesta árvore. O texto abaixo é o registro histórico da entrega, não uma descrição de rotas ativas.

Entrega de 01/11/2026, sobre o commit `43d911e`, em Windows, Node 24 e npm 11. Implementa a fase 4 da exploração com o acervo existente, preservando as 48 entidades, 66 relações, fontes, IDs e estados editoriais. Não altera snapshots históricos nem faz coletas.

## Código e responsabilidades

- `scripts/content/exploration-layout.mjs`: geometria determinística global e por coleção, curvas por ID de vínculo e escala temporal global. Relações paralelas preservam IDs e curvas distintas. Ordenação por tipo e ID organiza a leitura; não representa proximidade histórica.
- `core/content/models/exploration-layout.ts`: contrato Zod incorporado ao artefato `layouts`, com hash, manifesto e TransferState. Sem nova requisição independente nem geometria no bundle cliente.
- `core/content/queries/exploration-analysis.ts`: parser, validação e recorte puro compartilhados; mantém todas as relações elegíveis entre os IDs visíveis. Seleções explícitas ausentes não são substituídas em silêncio. Valores padrão da comparação procuram registros distintos; duplicação explícita exige correção pelo usuário.
- `features/exploration/pages/analysis`: composição lazy de `/rede` e `/comparar`. `analysis-filters`, `knowledge-network` e `relation-evidence` separam controles, projeção visual e evidências.
- `shared/ui/knowledge-timeline`: apresentação reutilizada pela rede e pela comparação histórica. Recebe entidades e posições prontas; não importa features nem calcula escala no navegador.
- Catálogos e páginas permanentes oferecem os novos caminhos. Rotas, critérios de publicação, README, escopo e arquitetura atualizados. Componentes antigos não publicados de rede e visualizações seguem preservados; não se afirma migração de todo o código legado.

## Filtros e estabilidade

- `colecao`, `tipo`, `relacao`, `de`, `ate` e `semData` definem o mesmo recorte nas duas páginas, mantido ao navegar entre Rede e Comparadores.
- `/rede?no=<id>` seleciona uma entidade; `/comparar?esquerda=<id>&direita=<id>&modo=historica|conceitual` permite compartilhar a comparação. Histórico e reload mantêm os parâmetros; canonicals usam só o caminho da página.
- Coleção escolhe um perfil já compilado. Dentro dele, tipo, vínculo, período e seleção não reposicionam nós nem recalculam curvas. Eixos temporais globais, iguais inclusive ao trocar de coleção ou selecionar só dois registros. O filtro de vínculo exige as duas extremidades visíveis; não injeta vizinhos ocultos.
- Anos são inteiros entre −100000 e 100000; intervalo invertido ou malformado gera erro e recorte vazio. O período filtra os anos conhecidos das entidades, não as datas dos vínculos. Com dois extremos conhecidos, usa a interseção do intervalo; com um, usa esse ano sem prolongar o período. `semData=nao` exclui registros sem data; o padrão os mantém, com indicação explícita.
- SVG selecionável por clique, Enter e Espaço; a lista alternativa oferece os mesmos registros e é priorizada no mobile. No teste observado, a seleção preservou foco e scroll com diferença máxima de 2 px. Sem promessa de estabilidade universal nem medição de CLS nesta entrega.

## Comparação e método editorial

- **Conceitual:** questão e contexto, formulações registradas e afirmações e evidências de cada lado. **Histórico:** acrescenta a timeline em escala comum.
- Recortes iniciais: dois conceitos e duas revoluções; registros trocáveis sem gerar afirmações históricas novas.
- A comparação é documental: não calcula similaridade, ranking ou equivalência teórica, não infere causalidade e não produz síntese automática. Tipos diferentes recebem aviso de não equivalência. Fontes compartilhadas são referências com o mesmo ID nas afirmações dos dois registros; a procedência sintética `context-origin` não cria referência comum falsa. Ausência de fonte ou vínculo não demonstra ausência histórica.
- Cada vínculo direto ou incidente à seleção mostra direção original, verbo, contexto, ID, tipo, situação editorial, incerteza e evidências com localizadores e data de consulta. Links importados mantêm procedência e aviso de revisão. Afirmações reutilizam `AtlasClaimReferencesComponent`, preservando classificação, revisão e referências. Lacunas e ausência de revisão humana permanecem visíveis.
- **Timeline:** ponto é um ano conhecido; barra são dois extremos conhecidos. Extremo ausente não representa duração; registros sem data continuam na lista. Precisão e incerteza são textuais. A interface orienta a conferir contexto e fontes no registro, sem rotular automaticamente um ano como nascimento, publicação ou início de tradição.

## Verificações observadas

| Comando | Resultado |
|---|---|
| `npm run build` | Passou após os ajustes finais; 67 rotas prerenderizadas, sem erros ou avisos de template |
| `npm run typecheck` | Passou para aplicação e testes |
| `npm test` | 129 testes em 26 arquivos |
| `npm run test:content` | Cinco testes: geometria por IDs, independência da ordem de entrada, datas ausentes e únicas, determinismo offline |
| `npm run lint` | Passou: Angular/templates, seis testes arquiteturais, Biome e Prettier |
| `npm run test:e2e -- --workers=2` | 35 testes em 34,3 s, incluindo os cinco novos de rede e comparadores |
| `npm run test:e2e -- e2e/network-comparison.spec.ts --workers=2` | Cinco testes, repetidos após o ajuste visual final do eixo mobile |
| `npm run check:links` | Links e âncoras de 68 HTMLs, incluindo shell CSR |
| `git diff --check` | Sem erros de whitespace |

E2E: coordenadas e eixo invariantes após filtro, transferência de filtros, reload, Back e Forward, duas modalidades de comparação, fontes e localizadores, lacunas, datas parciais, ausência de data, seleção por teclado, foco e scroll, intervalo inválido, coleção ausente e par duplicado. URLs diretas têm HTML e canonical; a hidratação das novas páginas não repetiu downloads de `/content/*`. Jornadas anteriores de leitura e exploração também passaram.

Verificados em 320 px e desktop, com movimento reduzido. Axe sem violações serious ou critical nos estados auditados. Capturas locais: `output/playwright/network-desktop.png` e `output/playwright/comparison-mobile.png`. Não equivale a auditoria WCAG integral.

## Problemas corrigidos

- Typecheck expôs inferência de propriedades opcionais numa lista de casos inválidos do teste; a lista recebeu o contrato correto. Avisos Angular em mapas de rótulos resolvidos com tipagem parcial; ordem de imports e formatação corrigidas.
- Select dinâmico exibia a opção padrão apesar de o recorte da URL já estar aplicado. Agora as opções refletem a seleção, inclusive coleções ou IDs indisponíveis.
- Teste de estabilidade capturava o SVG global antes da hidratação aplicar a coleção da URL. Passou a aguardar o estado inicial do filtro e comparar coordenadas do mesmo perfil.
- Teste de recorte vazio encontrava o status do rodapé; limitado ao conteúdo principal. Controles localizados por role e nome acessível.
- Revisão visual achou quebra vertical do último ano do eixo em 320 px; rótulos agora ficam em uma linha.

## Custos e limites

- Artefato de layouts: 25.118 bytes compactos, incluindo geometrias editoriais anteriores, seis perfis de rede e a timeline. Release `2aae531074a2b9312e848808ce9e1cacfb5bfb5de7be4de05fedd89d41dc519b`.
- Build: 351,56 kB iniciais brutos e 98,78 kB estimados para transferência. Chunk lazy de análise: 34,73 kB e 9,59 kB estimados. Não se afirma ganho geral de performance.
- Continua a política de preparar o conjunto global de coleções e índices nas rotas de conteúdo. Prerender cobre as páginas padrão; filtros da URL são aplicados na hidratação, o que pode alterar o recorte inicial de um acesso direto filtrado, embora a geometria do perfil seja pré-calculada. Sem zoom, arraste, force simulation, backend ou dependência nova.
- Sem alteração em `src/content`, `public` ou ingestão; dados e licenças iguais. O aviso `MODULE_TYPELESS_PACKAGE_JSON` do compilador de conteúdo permanece informativo e já existia. Sem push, deploy, workflow remoto nem execução da fase 5.
