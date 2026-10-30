# ATLAS — Regras para agentes

## Missão e produto

Construir uma plataforma educacional pública, gratuita, interativa e rigorosa sobre história, política, economia e sociedade, com perspectiva mundial e brasileira. O conteúdo deve ajudar o público a compreender relações e contextos, sem apresentar opinião como fato.

## Stack e arquitetura

- Angular 21, standalone components, Angular Router e TypeScript strict.
- Usar Signals para estado local e os blocos de template `@if` e `@for`.
- SCSS é o estilo padrão dos componentes; Tailwind está configurado. Angular CDK pode ser adicionado quando resolver uma necessidade concreta de interação ou acessibilidade.
- Preservar a arquitetura e os componentes existentes. Não introduzir React, Next.js ou Fastify como framework base.
- Manter a aplicação static-first. O build Angular atual gera saída estática e faz prerender das rotas públicas; manter SSR/prerender apenas onde compatível com a natureza pública do conteúdo.
- Rotas atuais: `/`, `/explorar`, `/estudar`, `/sobre` e fallback 404 em `src/app/app.routes.ts`. Toda nova rota deve ter título, estado de carregamento/vazio/erro pertinente e cobertura de navegação/teste.

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
