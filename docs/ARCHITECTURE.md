# Arquitetura técnica

## Aplicação

O projeto usa Angular 21.2.25, compatível com o ambiente Node documentado no README, componentes standalone, Angular Router e TypeScript strict. O roteador carrega as páginas com `loadComponent`; a navegação e os breadcrumbs compartilhados permanecem na aplicação raiz. O estado local da nova página de verbete é derivado dos parâmetros do Router com `toSignal` e `computed`.

## Conteúdo e contratos

`src/content/atlas.json` é o registro versionado do grafo de conhecimento. Ele contém uma coleção de atlas e é importado como fallback local para SSR; o Angular também copia o diretório para `content/` na saída de build. No navegador, `ContentRepository` carrega `/content/atlas.json` com `HttpClient` e valida a resposta com `knowledgeGraphSchema` em `src/app/core/content-schema.ts`; no prerender, usa o JSON empacotado, sem fazer requisições ou acessar APIs do navegador.

O grafo tipa `Person`, `Ideology`, `Concept`, `Work`, `Event`, `HistoricalPolity`, `Place`, `Party`, `Institution`, `Government` e `Policy`; `Atlas` identifica cada coleção e `Relation` liga entidades. Entidades e atlas mantêm IDs estáveis distintos de slugs, e entidades incluem aliases, contexto, revisão numérica, extensão temporal e grau de incerteza. Os intervalos temporais usam anos e permitem limites abertos. IDs e slugs de rota são únicos no grafo.

Relações têm origem, destino, rótulo direto, rótulo inverso, contexto, período, incerteza e tipo: ligação editorial, associação documentada, influência ou alegação causal. Relações históricas precisam referenciar evidências; alegações causais e influências não são deduzidas de proximidade temporal. Uma ligação editorial é distinta de qualquer afirmação histórica. Evidências e citações podem ser consultadas entre atlas pelo validador global.

As funções puras em `src/app/core/knowledge-graph.ts` consultam entidades por ID, termo/alias, período, tipo e atlas, e relações por entidade, direção, período e tipo. `ContentRepository` expõe essas consultas sobre o grafo carregado. A rede em `/relacoes` apresenta as entidades, filtros e rótulos direcionais, incluindo a distinção entre tipos de relação.

Os demais contratos incluem `Source`, `Evidence`, `Citation`, `Claim`, `Review`, `AssetLicense` e `LearningPath`. Localizadores sempre apontam para fonte existente e cada afirmação requer evidência citada e exatamente um estado editorial correspondente ao registro de revisão. As relações de citação são sustenta, contesta e contextualiza.

Afirmações registram sua natureza como fato documentado, tese atribuída, interpretação, hipótese, inferência, alegação contestada ou não verificado. Os estados são rascunho, pendente, verificada, contestada e precisa de atualização. Estados concluídos exigem pessoa revisora identificada e data; a interface mostra os dados efetivamente registrados e não promove automaticamente nenhum conteúdo. URL e identificador bibliográfico ajudam a localizar uma fonte, mas não comprovam por si só o conteúdo nela encontrado.

O registro contém três atlas ligados por entidades e relações: metodologia editorial, processo constituinte de 1987–1988 e direitos constitucionais. A amostra inclui Ulysses Guimarães, Assembleia Nacional Constituinte, sessão de promulgação, plenário, Constituição de 1988 e igualdade perante a lei, vinculados a registros oficiais da Câmara dos Deputados. Relações pessoais, institucionais e textuais apontam para localizadores específicos; o conceito de igualdade permanece pendente de revisão humana. Não há atribuição de ideologia por nacionalidade.

O registro de licenças exige nome e URL da licença para ativos liberados; `AtlasLicensedAssetComponent` só renderiza imagem ou link se o caminho estiver registrado como conhecido e liberado. Ativos não registrados, com licença desconhecida ou reprodução bloqueada são omitidos. Crédito não substitui autorização. A licença do logotipo permanece desconhecida para reprodução como ativo editorial; seu uso pelo próprio site não confere licença a terceiros.

## Rotas e geração estática

- `/verbete/:slug` apresenta entidades de todos os atlas e mostra estado de não encontrado para slugs desconhecidos.
- O build prerenderiza todos os slugs de entidades de todos os atlas por `getPrerenderParams` em `src/app/app.routes.server.ts`.
- As rotas `/explorar`, `/estudar`, `/sobre` e seus detalhes existentes permanecem disponíveis; as páginas de navegação são carregadas sob demanda.
- `src/content` é copiado para `dist/atlas/browser/content`. A rota do verbete e o asset JSON devem ser conferidos na saída real do build.

Não afirmamos que slugs futuros ou todas as combinações dinâmicas são prerenderizados. Um conteúdo novo precisa entrar no JSON válido e passar pelo build para ser publicado estaticamente.

## Limites e evolução

O repositório estático é adequado ao catálogo pequeno desta etapa. Não oferece publicação remota, edição colaborativa, cache distribuído ou atualização sem novo build. Os períodos atualmente usam anos, não datas diárias ou calendários alternativos; a incerteza é uma categoria editorial, não uma probabilidade estatística. As decisões de revisão e licenciamento são registros manuais; não há workflow de aprovação ou publicação automatizado. O contrato permite múltiplos atlas e relações entre eles sem atribuir influência ou causalidade sem evidência declarada.

Não foi introduzido `@defer`: o registro atual é pequeno, carregado com a página lazy, e não há bloco pesado secundário cujo adiamento traga benefício mensurável.
