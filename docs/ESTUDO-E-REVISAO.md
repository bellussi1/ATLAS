# Estudo e revisão

Os contratos de lições, exercícios, feedback e progresso versionado estão em `src/app/core/study-schema.ts`. A trilha demonstrativa em `src/app/content/demonstration-path.ts` é validada pelo contrato e consumida pela página de estudo. O acervo atual não registra revisão humana concluída para as afirmações históricas; a publicação histórica exige conteúdo revisado com identificação e data, conforme o esquema editorial existente.

## Proposta de revisão espaçada

Quando houver uma trilha elegível, cada exercício poderá ter uma data de revisão e um intervalo em dias. Uma resposta incorreta agenda nova revisão para o dia seguinte; uma resposta correta dobra o intervalo anterior, com mínimo de um dia e máximo de 30 dias. A data é calculada em calendário civil a partir da data da tentativa. A pessoa pode repetir o exercício antes da data; isso não declara domínio nem mede conhecimento. A versão do progresso deve ser validada antes da importação e versões desconhecidas devem ser rejeitadas sem substituir os dados existentes.

O algoritmo está implementado para a prática de metodologia em `/estudar`, sem validação com estudantes. O progresso é salvo no navegador e pode ser exportado como texto JSON e importado após validação; versões desconhecidas e dados de outras trilhas são recusados sem substituir o progresso. A prática não declara que o conteúdo histórico passou por revisão humana.
