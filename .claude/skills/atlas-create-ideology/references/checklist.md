# Checklist de criação

## Antes de escrever

- [ ] Classificação justificada em `classificationNote`; a categoria do grafo não decide sozinha.
- [ ] Recorte histórico-geográfico explícito, incluindo o que fica de fora.
- [ ] Entidades reconciliadas com os snapshots existentes; nenhum ID duplicado.
- [ ] Licença conferida por arquivo no Commons (`status: known`, `reproduction: allowed`, atribuição, página do arquivo).

## Por capítulo

- [ ] Pergunta do iniciante (`question`) responde a uma dúvida real.
- [ ] Cada afirmação nova tem fonte, localizador, natureza e confiança registrados no plano.
- [ ] `sourceIds` resolvem; `entityIds` existem (`validateIdeologyDossier`).
- [ ] Sem conteúdo verificado: `coverage: pending` + `gap`. Incompleto: `partial` + `gap`.
- [ ] Nenhum conceito reapresentado em cinco capítulos; use referência cruzada.

## Antes de propor publicação

- [ ] `npm run content:build`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e`.
- [ ] Screenshots desktop/mobile do preview local; teclado e reduced motion.
- [ ] Relatório de lacunas no padrão de `docs/editorial/ideologies-content-gap.md`.
- [ ] Aprovação explícita do usuário para incluir em `published-ideologies.ts` e nas rotas.

## Remover um rascunho

Apague `content/ideologies/<slug>/` e `content/graph/<slug>.json` e rode `npm run content:build`. Como o rascunho não entra em rotas nem no registro publicado, nada mais precisa mudar.
