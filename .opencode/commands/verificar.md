---
description: Executa a menor verificação pertinente ao diff atual
agent: build
---

Identifique o escopo com `git status` e `git diff --stat`. Rode a menor verificação pertinente: `npm test -- --include <spec>`, `npm run typecheck`, `npm run lint` ou `npm run test:e2e -- <spec>`. Reporte cada comando e o resultado real. Não faça push, não publique e não relaxe testes.
