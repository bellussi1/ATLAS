# PROMPT 12 — Testes pipeline e publicacao piloto

## Missão desta execução

Prepare deploy de demonstração sem publicar conteúdo não revisado.

## Execute

1. Configure Vitest, Playwright, axe-core, link checker, validação editorial, lint, typecheck e build.
2. Configure CI em GitHub Actions, sem segredo ou deploy externo automático sem autorização.
3. Configure cabeçalhos e política de segurança compatíveis com hospedagem estática.
4. Implemente sitemap, robots, Open Graph e páginas indexáveis para material aprovado.
5. Bloqueie promoção de rascunhos como verificados; identifique conteúdo piloto incompleto.
6. Rode suíte e documente falhas e testes não executados.
7. Prepare staging ou comando de preview sem publicar publicamente sem autorização.

## Critérios de aceite

- [ ] Pipeline reproduzível
- [ ] Rotas e dados verificados
- [ ] Staging preparado
- [ ] Pendências documentadas
## Regras obrigatórias de execução

- **Implemente código e mudanças verificáveis no repositório imediatamente; não encerre com plano, brainstorming, perguntas sobre stack ou relatório sem alterações concretas.**
- Inspecione o estado real do projeto antes de editar; em caso de recomeço limpo, não importe automaticamente o legado.
- Trabalhe exclusivamente no escopo deste prompt. Não execute o próximo prompt sozinho. Não peça permissão para as mudanças explicitamente autorizadas nesta tarefa; escreva código e valide a entrega atual.
- Não invente conteúdo histórico, citações, links, licenças, resultados de testes ou funcionalidades.
- Preserve dados e alterações existentes; não faça push, deploy público ou comandos destrutivos sem autorização.
- Execute testes proporcionais às alterações; reporte os comandos executados e eventuais falhas.
- Registre decisões duradouras na documentação, evitando duplicação e arquivos excessivos.
- Na entrega, informe: arquivos alterados, funcionalidades realmente implementadas, verificações executadas, limitações e próximo passo.
