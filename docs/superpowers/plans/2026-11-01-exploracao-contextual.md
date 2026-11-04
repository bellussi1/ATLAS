# Plano da primeira fatia de exploração

Escopo autorizado: auditoria → arquitetura e matriz → migração proposta → primeira fatia pequena; migração completa aguarda validação. Design em `docs/architecture/EXPLORACAO-CONTEXTUAL.md`. Execução inline pelo agente principal; auditoria do 12axes em arquivo separado, sem edições concorrentes de produto.

1. Auditar schemas, repositório, índices, hipertexto, diálogo, páginas, ingestão e CI. Comparar a referência em relatório independente, com commit e caminhos verificáveis.
2. Escrever regressão de `entityContext`: direção reversa, evidência e localizador, múltiplas relações para o mesmo destino, mais de oito conexões e ausência. Executar e confirmar a falha antes da mudança.
3. Ampliar `KnowledgeContext` com metadados opcionais de conexão, para compatibilidade com registros editoriais existentes. Refatorar a projeção sem criar schema concorrente nem promover estado editorial.
4. Atualizar o diálogo para expor relações e evidências. O histórico identifica a relação, restaura foco e scroll e aceita dados editoriais antigos. Testar integração CDK com fixture real.
5. Reutilizar `KnowledgeText` no Liberalismo e acrescentar vocabulário cujos IDs já existam; teste garante texto preservado e referências válidas.
6. Executar unitários, lint, typecheck, build, links e Playwright. Auditar três rotas em desktop e mobile; capturar contexto e telas; verificar teclado, toque, Escape, volta e ausência; axe e erros de console. Corrigir falhas e repetir o comando afetado.
7. Revisar diff e requisitos; registrar resultados exatos, limitações e fases não implementadas. Sem push, merge ou deploy.
