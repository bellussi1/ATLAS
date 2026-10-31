# ATLAS — Regras para agentes

## Missão e produto

Construir uma plataforma educacional pública, gratuita, interativa e rigorosa sobre história, política, economia e sociedade, com perspectiva mundial e brasileira. O conteúdo deve ajudar o público a compreender relações e contextos, sem apresentar opinião como fato.

## Stack e arquitetura

- Angular 21, standalone components, Angular Router e TypeScript strict.
- Usar Signals para estado local e os blocos de template `@if` e `@for`.
- SCSS é o estilo padrão dos componentes; Tailwind está configurado. Angular CDK pode ser adicionado quando resolver uma necessidade concreta de interação ou acessibilidade.
- Preservar a arquitetura e os componentes existentes. Não introduzir React, Next.js ou Fastify como framework base.
- Manter a aplicação static-first. O build Angular atual gera saída estática e faz prerender das rotas públicas; manter SSR/prerender apenas onde compatível com a natureza pública do conteúdo.
- Rotas atuais: `/`, `/relacoes`, `/tempo-e-espaco`, `/conhecimento`, `/explorar` (índice), `/explorar/:tipo`, `/explorar/:tipo/:slug`, `/atlas/marxismo`, `/atlas/marxismo/valor-e-trabalho`, `/estudar`, `/estudar/:slug`, `/sobre`, `/fontes`, `/verbete/:slug`, `/sistema` e fallback 404 em `src/app/app.routes.ts`. Os oito tipos editoriais válidos estão em `src/app/content/content-types.ts`; o grafo validado e suas fontes ficam em `src/content/atlas.json`. Toda nova rota deve ter título, estado de carregamento/vazio/erro pertinente e cobertura de navegação/teste.
- `ContentRepository` mantém o acesso ao conteúdo estático desacoplado das telas; no browser, carrega o asset local com `HttpClient` e, no SSR, usa o JSON empacotado. Schemas Zod em `src/app/core/content-schema.ts` validam IDs, slugs e referências.

## Desenvolvimento e verificações

Use Node.js 24 e npm 11, como documentado no `README.md`. Instale dependências com `npm install` quando necessário. Os comandos abaixo foram executados no Prompt 01; repita as verificações pertinentes após cada mudança:

| Comando | Finalidade |
| --- | --- |
| `npm start` | Servidor local Angular |
| `npm run build` | Build de produção e saída estática/prerender |
| `npm test` | Testes unitários Vitest em execução única |
| `npm run lint` | ESLint em TypeScript e templates Angular |
| `npm run typecheck` | Checagem TypeScript do app e dos testes |

O Prompt 01 também executou `npm run watch`, `npm run ng -- version` e uma inicialização local de `npm start` (na porta 4300 porque a 4200 estava ocupada). O watch compilou e foi encerrado após a compilação inicial.

Execute as verificações relevantes ao escopo alterado e reporte o resultado observado; não afirme que um comando passou sem executá-lo. Para mudanças em rotas ou conteúdo, verifique também navegação, estados vazios e acessibilidade aplicável. Ao corrigir uma falha, repita a verificação que falhou.

## Padrão de testes e critérios de aceite

- Testes devem validar comportamento observável, rotas, conteúdo essencial, estados e interações; prefira testes acessíveis por nome/role e mantenha os testes em execução única no CI/local.
- Build, lint e typecheck devem passar para alterações que os afetem. Não adicione testes ou ferramentas sem necessidade; use a infraestrutura já configurada.
- Interfaces precisam funcionar com teclado, foco visível, semântica HTML, nomes acessíveis e contraste adequado. Verifique responsividade e mensagens de erro/vazio quando a interface mudar. Não declarar conformidade WCAG integral sem auditoria completa.
- Critérios de aceite devem ser verificáveis e específicos ao prompt. Revise o diff contra cada requisito obrigatório antes de concluir.

## Design e conteúdo

- Ao trabalhar no design da plataforma, inspecione as três imagens em `referencias`: modernismo suíço, atlas histórico editorial e arquivo digital experimental. Use-as como inspiração, sem replicar um dashboard genérico, tema escuro uniforme ou sequência repetitiva de cards.
- Afirmações históricas devem ter fontes confiáveis e contexto suficiente para o leitor conferir a evidência. Diferencie fato documentado, interpretação, hipótese e alegação controversa; não invente fonte, data, citação ou validação humana.
- Reproduza imagens, mapas e textos apenas quando os direitos permitirem o uso. Os arquivos em `referencias` são inspiração visual e não ativos autorizados para publicação.
- Registre fontes e licenças perto do conteúdo ou no mecanismo editorial definido pelo projeto.

## Integração e commits

- Cada prompt numerado exige alterações reais no código ou nos arquivos que ele especificar, além das verificações pertinentes; não pare em planejamento.
- Ao concluir cada prompt numerado, revise requisitos e diff, corrija problemas encontrados e crie um único commit local, atômico e limitado ao escopo daquele prompt. Não misture prompts diferentes e não faça push sem pedido explícito.
- Preserve prompts, imagens e alterações locais. Não execute o próximo prompt automaticamente.
- Evite agentes concorrentes editando o mesmo arquivo. A configuração do repositório limita a um subagente simultâneo por padrão.
- Ao terminar, informe objetivamente os arquivos alterados, comandos executados, resultados e limitações reais.


## Direção visual específica do ATLAS

### Seleção de skills por tarefa

As skills são ferramentas especializadas, não um pacote obrigatório. Antes de começar, confira o catálogo disponível nesta sessão e carregue apenas as skills pertinentes ao escopo. A presença de um `SKILL.md` no computador não garante que a skill possa ser invocada nesta sessão; se não estiver no catálogo, trate-a como referência local, não como skill ativa. Não copie instruções globais para este arquivo nem crie versões duplicadas.

- **Identidade e decisões visuais do ATLAS:** `atlas-editorial-geometrico` é a referência artística primária. Consulte-a ao criar ou revisar UI do projeto; preserve a combinação de enciclopédia hipertextual, modernismo suíço, atlas histórico editorial e museografia digital experimental.
- **Composição ou direção visual de telas/componentes:** use `frontend-design` quando a tarefa exigir decisões de composição, hierarquia e apresentação. Combine com a identidade ATLAS; não substitua nem redesenhe o design system existente sem necessidade concreta.
- **Exploração interativa ou prototipagem:** use `interaction-design` para definir e implementar interações; use `prototype` apenas quando estiver disponível no catálogo da sessão e a tarefa pedir exploração/prova de conceito. Para componentes de produto, preserve caminhos reais de conteúdo e navegação.
- **Oportunidades e implementação de motion:** use `find-animation-opportunities` para escolher momentos que ajudam orientação, seleção ou continuidade; use `animate` ao projetar/implementar movimento funcional. Selecione uma ou ambas conforme o trabalho, sem carregá-las por padrão em tarefas estáticas.
- **Implementação Angular:** use `angular-developer` quando criar ou alterar componentes, serviços, rotas ou padrões Angular. Siga a arquitetura standalone, Signals, templates e estilos já adotados no projeto.
- **Auditoria e refinamento:** use `improve-animations` para revisar motion existente e `impeccable` para auditoria/refinamento visual quando o escopo justificar. A auditoria complementa a implementação; não encerre uma tarefa de implementação autorizada apenas com recomendações.

Ao desenvolver componentes, priorize interatividade real, continuidade entre conteúdos, motion contextual, navegação por teclado, suporte mobile e respeito a `prefers-reduced-motion`. Escolha a combinação mínima de skills que cubra a tarefa; não é necessário carregá-las simultaneamente.

Partir do briefing deste projeto e de suas referências visuais. Não transportar composições, paletas ou padrões de outros projetos do usuário. Preservar funcionalidades, arquitetura, acessibilidade e integridade editorial ao reconstruir a apresentação. Não alegar remoção de memória do modelo ou de histórico de chats.


A skill própria `atlas-editorial-geometrico`, versionada em `.agents/skills/atlas-editorial-geometrico`, orienta a identidade aprovada do ATLAS. Ela complementa as skills gerais, preserva a mesa de pesquisa e organiza cores secundárias, palavras navegáveis e motivos geométricos.
