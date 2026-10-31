# Arquitetura técnica

## Aplicação

O projeto usa Angular 21.2.25, compatível com o ambiente Node documentado no README, componentes standalone, Angular Router e TypeScript strict. O roteador carrega as páginas com `loadComponent`; a navegação e os breadcrumbs compartilhados permanecem na aplicação raiz. O estado local da nova página de verbete é derivado dos parâmetros do Router com `toSignal` e `computed`.

## Conteúdo e contratos

`src/content/atlas.json` é o registro estático de metodologia. O Angular o importa como fallback local para SSR e também copia o diretório para `content/` na saída de build. No navegador, `ContentRepository` carrega `/content/atlas.json` com `HttpClient` e valida a resposta com os esquemas Zod em `src/app/core/content-schema.ts`; no prerender, usa o JSON empacotado, sem fazer requisições ou acessar APIs do navegador. O serviço expõe consultas por slug e não depende de backend.

Os contratos cobrem `Atlas`, `Entity` e suas variantes `Person`, `Concept`, `Event` e `Article`, além de `Source`, `Evidence`, `Citation`, `Claim`, `Review`, `AssetLicense`, `Relationship` e `LearningPath`. IDs são únicos entre todos os registros; localizadores sempre apontam para uma fonte cadastrada e cada afirmação exige citações e exatamente um estado editorial correspondente a seu registro de revisão. As relações possíveis da citação são sustenta, contesta e contextualiza.

Afirmações registram sua natureza como fato documentado, tese atribuída, interpretação, hipótese, inferência, alegação contestada ou não verificado. Os estados são rascunho, pendente, verificada, contestada e precisa de atualização. Estados concluídos exigem pessoa revisora identificada e data; a interface mostra os dados efetivamente registrados e não promove automaticamente nenhum conteúdo. URL e identificador bibliográfico ajudam a localizar uma fonte, mas não comprovam por si só o conteúdo nela encontrado.

O registro de licenças exige nome e URL da licença para ativos liberados; `AtlasLicensedAssetComponent` só renderiza uma imagem ou link de ativo se o caminho estiver registrado como conhecido e liberado, e apresenta o link dos termos da licença. Ativos não registrados, com licença desconhecida ou reprodução bloqueada são omitidos. Crédito não substitui autorização. O registro inclui metodologia declarada pelo projeto e uma amostra histórica curta ligada ao texto constitucional hospedado pela Câmara dos Deputados. A amostra está pendente de revisão humana e não declara validação editorial. A licença do logotipo permanece desconhecida para reprodução como ativo editorial; o uso da marca pelo próprio site não confere licença a terceiros.

## Rotas e geração estática

- `/verbete/:slug` apresenta entidades conceituais do registro e mostra estado de não encontrado para slugs desconhecidos.
- O build prerenderiza todos os slugs de entidades encontrados no registro estático por `getPrerenderParams` em `src/app/app.routes.server.ts`.
- As rotas `/explorar`, `/estudar`, `/sobre` e seus detalhes existentes permanecem disponíveis; as páginas de navegação são carregadas sob demanda.
- `src/content` é copiado para `dist/atlas/browser/content`. A rota do verbete e o asset JSON devem ser conferidos na saída real do build.

Não afirmamos que slugs futuros ou todas as combinações dinâmicas são prerenderizados. Um conteúdo novo precisa entrar no JSON válido e passar pelo build para ser publicado estaticamente.

## Limites e evolução

O repositório estático é adequado ao catálogo pequeno desta etapa. Não oferece publicação remota, pesquisa, edição, cache distribuído ou atualização sem novo build. Conteúdo futuro pode manter os contratos e trocar a implementação de `ContentRepository` por um carregador de API ou CMS quando existir uma necessidade de publicação independente; a tela consulta o serviço e não usa APIs do navegador diretamente. As decisões de revisão e licenciamento ainda são registros editoriais manuais; não há workflow de aprovação ou publicação automatizado.

Não foi introduzido `@defer`: o registro atual é pequeno, carregado com a página lazy, e não há bloco pesado secundário cujo adiamento traga benefício mensurável.
