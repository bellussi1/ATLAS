# ATLAS — Regras para agentes

## Missão
Construir plataforma educacional pública, gratuita, interativa e rigorosa sobre história, política, economia e sociedade, com perspectiva mundial e brasileira.

## Stack
Angular moderno; standalone components; Angular Router; TypeScript strict; Signals para estado local; `@if`/`@for`; SCSS + Tailwind; static-first com prerendering quando adequado; Angular CDK se necessário. Nenhum React, Next.js ou Fastify como framework base.

## Implementação
- Cada prompt numerado exige **alterações reais no código**, instalações necessárias e testes executados, não somente planejamento.
- Ao concluir cada prompt numerado, revise o diff e os requisitos, corrija os problemas encontrados e faça um único commit local, atômico e restrito ao escopo daquele prompt. Rode as verificações exigidas antes do commit; não misture trabalho de prompts diferentes e não faça push sem pedido explícito.
- Não peça aprovação de tecnologia já decidida. Preserve prompts, imagens e alterações locais.
- Ao terminar: liste arquivos alterados, comandos executados, resultados e limitações.
- Não execute o prompt seguinte automaticamente.

## Design
Inspecione as três imagens em `referencias`: modernismo suíço; atlas histórico editorial; arquivo digital experimental. Não substituir por um dashboard genérico, um tema escuro uniforme ou templates de cards repetitivos.

## Conteúdo
- Afirmações históricas precisam de evidência contextual; não inventar fontes, datas, citações ou validação humana.
- Distinguir fato documentado, interpretação, hipótese e alegação controversa.
- Não reproduzir imagens ou textos sem direitos compatíveis; referências visuais do usuário são **inspiração**, não ativos autorizados a serem republicados na aplicação.

## Qualidade
Testar rotas, acessibilidade, conteúdo e build. Não declarar conformidade WCAG integral sem auditoria. Evitar subagentes concorrentes no mesmo arquivo.
