Status: atual
Última verificação: 18/11/2026

# Contexto vivo do ATLAS

Atualizado em 18/11/2026. Handoff curto entre sessões (regra em [`README.md`](README.md): manter enxuto). Histórico anterior completo em [`archive/2026-11/active-context-history.md`](archive/2026-11/active-context-history.md).

## Estado atual

- **Branch / deploy:** `develop`, origem única `https://atlas-bellussi.pages.dev` (Cloudflare Pages, Direct Upload em push para `master`).
- **Conteúdo publicado no R2:** **24 coleções**, release **`564a8fcd713c7d6510a5b1f1e71a1c51635624add25e33edb5928d4b32c9865d`** (`1.320` entidades, `2.842` relações, `7` leituras, `9` itinerários públicos, `32.101` respostas brutas em `raw/`). Ponteiro em [`content/content-pointer.json`](../content/content-pointer.json).
- **Verificação final (18/11):** `npm run lint`, `npm run typecheck`, `npm test` (`65/65` arquivos, `408/408` testes), `test:content` (`219/219`), `test:ingestion` (`71/71`), `itinerary:check` (`10` arquivos), `npm run build` (`1.385` rotas prerenderizadas, `1.357` URLs no sitemap, zero avisos de orçamento), `check:links` (`1.387` páginas estáticas) e Playwright E2E completos (`209/209`).

## Mudanças recentes (18/11, `develop`)

- **Mapa-múndi histórico (`/mapa`, Issue #101):** projeção estática Natural Earth `1:110m` (`176` países), enriquecimento Wikidata em `content/knowledge/` (`147/152` lugares com coordenadas, `76` países com ISO e `6` entidades históricas dissolvidas datadas sem ISO moderno), linha do tempo por década e intervalo com divulgação explícita de itens sem datação estrita, legenda esquerda interativa com `stroke-dasharray` exclusivo por família, botão **Surpreenda-me**, Mesa de Estudo (regimes, registros e conexões), tabela acessível e travessias no ecossistema (`header`, `footer`, `/acervo`, `/grafos`, `/verbete/:slug`). Documentado em [`design/MAPA-MUNDI.md`](design/MAPA-MUNDI.md).
- **Pendências editoriais, SEO, fixture e UX (`#35`, `#36`, `#75`–`#82`, `#84`–`#87`):**
  - `nazismo`, `stalinismo` e `trabalhismo` atingiram o piso de cobertura (`7` tipos de bloco com `atlas` + `debate`, `2.906`–`3.092` palavras de prosa em `tradicao:coverage`); métrica `prose.palavras` incorporada a `coverage.mjs` e `coverage-floor.json`.
  - `_redirects` pareado com e sem barra final para `/marxismo/`, `/nazismo/`, `/stalinismo/`, `/trabalhismo/`, `/mapa-mundi/` e catálogos; prévia não listada com `noindex, follow`; `/index.csr` fora do `sitemap.xml`; Open Graph e Twitter Cards (`summary_large_image`); testes E2E offline de verbete inexistente e catálogo vazio.
  - Busca centralizada em `/` e `/acervo`, **Surpreenda-me** em leituras/itinerários/acervo/grafos/mapa e `+65` relações brasileiras no grafo.

## Pendências abertas

1. **RAG & revisão humana (15/11):** marcar `human_ok` em `experiments/rag/eval/questions.jsonl` (`0/100`), calibrar juiz LLM com 30 rótulos e triar `experiments/rag/eval/queues/`.
2. **Revisão humana de fontes e conteúdo:** auditoria humana das fontes dos dossiês (#9), itinerário `trabalhismo-e-estado-social` (#92), 20 imagens do acervo (#94) e 30 perguntas do benchmark (#95).
3. **Performance / Infra / Produto:** carregamento sob demanda sem bundle completo de `35 MB` nas leituras (#88), auditoria de cache/pacotes (#96), proveniência raw do piloto no repo/worker (#83), teste real em Android (#93) e configuração de `AMAZON_ASSOCIATE_TAG` quando aprovado o programa.

## Próxima ação

1. Consolidar commits na `develop`, abrir PR `develop` → `master`, validar deploy em produção e prosseguir conforme priorização dos itens acima.

## Mapa rápido

- Regras obrigatórias: [`../AGENTS.md`](../AGENTS.md)
- Índice completo da documentação: [`README.md`](README.md)
- Arquitetura: [`architecture/ARCHITECTURE.md`](architecture/ARCHITECTURE.md) · Dados: [`architecture/DADOS-E-CARREGAMENTO.md`](architecture/DADOS-E-CARREGAMENTO.md)
- Design e voz: [`design/PAGE_STANDARD.md`](design/PAGE_STANDARD.md) · [`design/GUIA-DE-VOZ.md`](design/GUIA-DE-VOZ.md) · [`design/MAPA-MUNDI.md`](design/MAPA-MUNDI.md)
- Produção: [`operations/PRODUCAO.md`](operations/PRODUCAO.md)
