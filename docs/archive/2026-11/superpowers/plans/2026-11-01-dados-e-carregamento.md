# Dados particionados e carregamento estático

**Objetivo:** fase 2 autorizada: substituir o JSON canônico global por coleções versionadas com manifesto, e compilar busca, relações reversas e geometria durante o build.

**Arquitetura:** fontes em `src/content/knowledge`, um snapshot por coleção e manifesto atômico. Build offline em `scripts/content` reutiliza contratos, consultas e algoritmos puros atuais; saída derivada em `generated/content`, fora do Git. Angular carrega assets com HttpClient, cache, validação e TransferState; o leitor de arquivos SSR existe só no provider de servidor. Nenhum import do grafo canônico no bundle cliente.

**Decisão de compatibilidade:** as páginas atuais usam contratos síncronos de grafo e conexões globais. O resolver de rota prepara coleções e índices antes de criar a página; a Home não carrega o acervo. Os shards são cacheados individualmente, mas nesta etapa a leitura editorial prepara o conjunto global, para preservar todas as conexões. Carregamento por entidade é evolução separada, sem afirmar que já ocorre. O manifesto e seus hashes permitem mudar essa política sem mudar os dados.

**Preservação:** IDs, prosa, datas, fontes, revisões, licenças, URLs e coordenadas atuais. Só filtros e seleção continuam no runtime; cálculo de busca, adjacência e geometria passa ao build. A ingestão reproduzível continua funcionando, inclusive com capturas antigas, e passa a publicar o manifesto de coleções quando não há saída isolada.

- [x] Testes do compilador: equivalência do grafo, busca e relações nos dois sentidos, geometria, duas execuções idênticas, referência inválida rejeitada.
- [x] Snapshot migrado para coleções com manifesto; leitura e escrita canônicas compartilhadas pela ingestão e pelo compilador.
- [x] Manifesto público, arquivos com hash, índice de busca, adjacência e layouts editoriais e de atlas gerados sem acesso à rede.
- [x] Grafo e compiladores removidos do bundle; carregamento por resolver com transferência de estado SSR, cache e retry de assets com erro.
- [x] Componentes consomem índices e geometria prontos, preservando foco, scroll, filtros e semântica.
- [x] Testes de HTTP, falhas, SSR e hidratação, navegação entre as três páginas e ausência de grafo na Home e no bundle. Ingestão offline, lint, typecheck, build, unitários, E2E e links verificados.
- [x] Payloads e limites documentados; diff revisado; um único commit local, sem push nem deploy.
