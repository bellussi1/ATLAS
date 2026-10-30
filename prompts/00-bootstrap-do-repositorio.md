# PROMPT 00 — EXECUTE AGORA: inicialize o ATLAS em Angular e faça rodar

Você está no diretório `C:\Users\Bellussi\Documents\Workspace\ATLAS`. O projeto está recomeçando do zero. **A stack está decidida: Angular moderno (versão 22, se disponível no registro e compatível com o Node instalado), standalone components, Angular Router, TypeScript strict, SCSS e Tailwind CSS.** Não use Next.js, React, Fastify ou Express. **Crie arquivos e execute comandos agora. Não entregue brainstorming ou espere autorização.**

## Faça nesta execução

1. Inspecione os arquivos existentes e as versões de Node/npm. **Preserve integralmente `prompts/`, `referencias/`, `templates/` e os documentos existentes.** Não importe o projeto legado. Caso Angular 22 não esteja disponível ou seja incompatível, verifique a versão estável suportada, explique a substituição e continue com uma versão suportada, sem inventar versões.
2. Inicialize o Angular CLI na **raiz do ATLAS**, com routing, SCSS, strict, package manager npm e configuração de SSR/prerender quando compatível. Se o CLI recusar uma raiz não vazia por causa dos prompts, gere o scaffold numa pasta temporária fora da raiz e integre **somente arquivos novos** à raiz, preservando os existentes. Não deixe a aplicação aninhada numa pasta `atlas/`.
3. Instale as dependências; configure Tailwind CSS segundo as instruções compatíveis com a versão do Angular e do Tailwind instalada. Evite bibliotecas não utilizadas.
4. Implemente efetivamente `AppComponent` com cabeçalho ATLAS, missão do projeto, uma busca visual claramente não funcional/sem simular resultados e três entradas: **Entender uma dúvida**, **Explorar a história**, **Seguir uma trilha**. Crie rotas reais `/explorar`, `/estudar`, `/sobre`, além da página inicial e fallback de rota não encontrada. Use `routerLink` e `router-outlet`.
5. Crie componentes standalone em TypeScript strict, CSS/SCSS responsivo provisório, marcação semântica, foco acessível e tratamento de estados. **Não implemente a identidade final nesta etapa**: as três referências visuais serão aplicadas no Prompt 04. Não use dashboard SaaS genérico nem coleções de cards idênticos.
6. Configure os scripts `start`, `build`, `test`, `lint` e `typecheck` conforme as ferramentas instaladas. Não anuncie comandos como funcionais sem executá-los. Se ESLint precisar ser adicionado, configure-o corretamente. Configure `.gitignore`, `.editorconfig`, README de desenvolvimento e testes unitários mínimos.
7. Execute instalação, compilação, testes e checagem de tipos; valide pelo menos a rota inicial e as rotas internas. Corrija os erros. Inicialize Git se necessário, sem push, sem deploy e sem apagar arquivos do usuário.

## Entrega obrigatória

- Aplicação Angular executável via `npm start` ou `ng serve`.
- Homepage real e `/explorar`, `/estudar`, `/sobre` navegáveis.
- Dependências e scripts testados.
- Arquivos e comandos apresentados com os resultados reais.

**NÃO pergunte se deve usar Angular. NÃO encerre apenas descrevendo o que faria. NÃO avance para o Prompt 01.** Se houver bloqueio real, entregue todo o código possível e detalhe o erro reproduzível.
