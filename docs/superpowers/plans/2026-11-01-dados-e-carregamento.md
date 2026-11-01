# Dados particionados e carregamento estático

**Objetivo:** fase 2 autorizada: substituir o JSON canônico global por coleções versionadas com manifesto e compilar busca, relações reversas e geometria durante o build.

**Arquitetura:** fontes em `src/content/knowledge`, um snapshot por coleção e manifesto atômico. Build offline em `scripts/content` reutiliza contratos/consultas/algoritmos puros atuais; saída derivada em `generated/content`, fora do Git. Angular carrega assets com HttpClient, cache, validação e TransferState; leitor de arquivos SSR existe somente no provider de servidor. Nenhum import do grafo canônico no bundle cliente.

**Decisão de compatibilidade:** as páginas atuais usam contratos síncronos de grafo e conexões globais. Resolver de rota prepara as coleções e índices antes de criar a página; Home não carrega o acervo. Os shards são cacheados individualmente, mas nesta etapa a leitura editorial prepara o conjunto global para preservar todas as conexões existentes. Carregamento por entidade é evolução separada, sem afirmar que já ocorre. O manifesto e seus hashes permitem mudar essa política sem mudar os dados.

**Preservação:** IDs, prosa, datas, fontes, revisões, licenças, URLs e coordenadas atuais. Somente filtros e seleção continuam no runtime; cálculo de busca, adjacência e geometria passa ao build. A ingestão reproduzível continua funcionando, inclusive capturas antigas, e passa a publicar o manifesto de coleções quando não há saída isolada.

- [x] Testes do compilador: equivalência do grafo, busca e relações nos dois sentidos; geometria; duas execuções idênticas; referência inválida rejeitada.
- [x] Migrar o snapshot para coleções com manifesto e criar leitura/escrita canônica compartilhada pela ingestão e compilador.
- [x] Gerar manifesto público, arquivos com hash, índice de busca, adjacência e layouts editoriais/atlas sem acesso à rede.
- [x] Remover grafo/compiladores do bundle; carregar por resolver e transferir estado SSR, com cache e retry de assets com erro.
- [x] Consumir índices e geometria prontos nos componentes, preservando foco, scroll, filtros e semântica.
- [x] Testar HTTP, falhas, SSR/hidratação, navegação entre as três páginas e ausência de grafo na Home/bundle. Verificar ingestão offline, lint, typecheck, build, unitários, E2E e links.
- [x] Documentar payloads/limites, revisar diff e concluir em um único commit local, sem push/deploy.
