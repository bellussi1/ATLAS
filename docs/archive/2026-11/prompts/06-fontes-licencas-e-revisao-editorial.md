# PROMPT 06 — Fontes licencas e revisao editorial

## Missão desta execução

Implemente um **portão editorial verificável** antes de ampliar conteúdo.

## Execute

1. Crie esquemas Source, Evidence, Citation, Claim, Review e AssetLicense, com IDs estáveis e localizadores.
2. Diferencie fato documentado, tese atribuída, interpretação, hipótese, inferência, alegação contestada e não verificado.
3. Valide fonte existente, localizador, tipo de relação (sustenta/contesta/contextualiza), estado editorial e metadados obrigatórios.
4. Implemente componente de referência contextual no artigo com URL, edição, localizador, data e status real.
5. Crie estados draft, pending, verified, contested, needs-update; nenhuma IA promove automaticamente para verified.
6. Implante registro de licenças e bloqueio de reprodução de ativos com licença desconhecida.
7. Adicione fixtures reais pequenas e testes que falhem quando uma afirmação não possua evidência estrutural.

## Critérios de aceite

- [ ] Validador bloqueia dados inválidos
- [ ] Componente de fonte funciona
- [ ] Revisão não é falsamente certificada
- [ ] Licenciamento modelado

## Restrições e observações específicas

Crédito não é licença. DOI/URL não equivale a prova do conteúdo. Revisão humana de fontes permanece necessária.

## Regras obrigatórias de execução

- **Implemente código e mudanças verificáveis no repositório imediatamente; não encerre com plano, brainstorming, perguntas sobre stack ou relatório sem alterações concretas.**
- Inspecione o estado real do projeto antes de editar; em caso de recomeço limpo, não importe automaticamente o legado.
- Trabalhe exclusivamente no escopo deste prompt. Não execute o próximo prompt sozinho. Não peça permissão para as mudanças explicitamente autorizadas nesta tarefa; escreva código e valide a entrega atual.
- Não invente conteúdo histórico, citações, links, licenças, resultados de testes ou funcionalidades.
- Preserve dados e alterações existentes; não faça push, deploy público ou comandos destrutivos sem autorização.
- Execute testes proporcionais às alterações; reporte os comandos executados e eventuais falhas.
- Registre decisões duradouras na documentação, evitando duplicação e arquivos excessivos.
- Na entrega, informe: arquivos alterados, funcionalidades realmente implementadas, verificações executadas, limitações e próximo passo.
