# Plano da primeira fatia de exploração

Briefing e escopo autorizados: auditoria → arquitetura/matriz → migração proposta → primeira fatia pequena; migração completa aguarda validação. Design em `docs/architecture/EXPLORACAO-CONTEXTUAL.md`. Execução inline pelo agente principal; auditoria 12axes delegada em arquivo separado, sem edições concorrentes de produto.

1. Auditar schemas, repositório, índices, hipertexto, diálogo, páginas, ingestão e CI. Comparar referência em relatório independente com commit e caminhos verificáveis.
2. Escrever regressão de `entityContext`: direção reversa, evidência/localizador, múltiplas relações mesmo destino, mais de oito conexões e ausência. Executar e confirmar falha antes da mudança.
3. Ampliar `KnowledgeContext` com metadados opcionais de conexão para compatibilidade com registros editoriais existentes. Refatorar projeção sem criar schema concorrente ou promover estado editorial.
4. Atualizar diálogo para expor relações e evidências. Histórico deve identificar relação, restaurar foco/scroll e aceitar dados editoriais antigos. Testar integração CDK com fixture real.
5. Reutilizar KnowledgeText no Liberalismo e acrescentar vocabulário cujos IDs já existam; teste garante texto preservado e referências válidas.
6. Executar unitários, lint, typecheck, build, links e Playwright. Auditar três rotas em desktop e mobile; capturar contexto e telas, verificar teclado/toque/Escape/volta/ausência, axe e erros de console. Corrigir falhas e repetir comando afetado.
7. Revisar diff/requisitos e registrar resultados exatos, limitações e fases que não foram implementadas. Sem push/merge/deploy.
