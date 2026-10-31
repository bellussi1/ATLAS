# Arquitetura técnica

## Aplicação

O projeto usa Angular 21.2.25, compatível com o ambiente Node documentado no README, componentes standalone, Angular Router e TypeScript strict. O roteador carrega as páginas com `loadComponent`; a navegação e os breadcrumbs compartilhados permanecem na aplicação raiz. O estado local da nova página de verbete é derivado dos parâmetros do Router com `toSignal` e `computed`.

## Conteúdo e contratos

`src/content/atlas.json` é o registro estático de metodologia. O Angular o importa no bundle da aplicação e também copia o diretório para `content/` na saída de build. `ContentRepository` valida o registro durante a inicialização com os esquemas Zod em `src/app/core/content-schema.ts` e expõe consultas por slug; não existe backend ou serviço HTTP nesta etapa.

Os contratos cobrem `Atlas`, `Entity` e suas variantes `Person`, `Concept`, `Event` e `Article`, além de `Source`, `Claim`, `Relationship` e `LearningPath`. A validação verifica formato e unicidade de IDs/slugs, referências a entidades e fontes, e IDs listados pelo atlas e pelas trilhas.

O registro documenta metodologia declarada pelo projeto, com uma afirmação ligada a uma fonte do repositório. Ele não representa conteúdo histórico revisado nem declara validação humana.

## Rotas e geração estática

- `/verbete/:slug` apresenta entidades conceituais do registro e mostra estado de não encontrado para slugs desconhecidos.
- O build prerenderiza somente slugs `concept` encontrados no registro estático por `getPrerenderParams` em `src/app/app.routes.server.ts`.
- As rotas `/explorar`, `/estudar`, `/sobre` e seus detalhes existentes permanecem disponíveis; as páginas de navegação são carregadas sob demanda.
- `src/content` é copiado para `dist/atlas/browser/content`. A rota do verbete e o asset JSON devem ser conferidos na saída real do build.

Não afirmamos que slugs futuros ou todas as combinações dinâmicas são prerenderizados. Um conteúdo novo precisa entrar no JSON válido e passar pelo build para ser publicado estaticamente.

## Limites e evolução

O repositório estático é adequado ao catálogo pequeno desta etapa. Não oferece publicação remota, pesquisa, edição, cache distribuído ou atualização sem novo build. Conteúdo futuro pode manter os contratos e trocar a implementação de `ContentRepository` por um carregador de API ou CMS quando existir uma necessidade de publicação independente; a tela consulta o serviço e não usa APIs do navegador diretamente. O modelo deve então incorporar metadados de proveniência/licença mais completos e fontes públicas acessíveis antes de receber conteúdo histórico.

Não foi introduzido `@defer`: o registro atual é pequeno, carregado com a página lazy, e não há bloco pesado secundário cujo adiamento traga benefício mensurável.
