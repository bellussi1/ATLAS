Status: atual
Última verificação: 19/11/2026

# Contexto vivo do ATLAS

Atualizado em 18/11/2026. Handoff curto entre sessões (regra em [`README.md`](README.md): manter enxuto). Histórico anterior completo em [`archive/2026-11/active-context-history.md`](archive/2026-11/active-context-history.md).

## Estado atual

- **Branch / deploy:** `develop`, origem única `https://atlas-bellussi.pages.dev` (Cloudflare Pages, Direct Upload em push para `master`).
- **Conteúdo publicado no R2:** **24 coleções**, release **`564a8fcd713c7d6510a5b1f1e71a1c51635624add25e33edb5928d4b32c9865d`** (`1.320` entidades, `2.842` relações, `7` leituras, `9` itinerários públicos, `32.101` respostas brutas em `raw/`). Ponteiro em [`content/content-pointer.json`](../content/content-pointer.json).
- **Verificação final (18/11):** `npm run lint`, `npm run typecheck`, `npm test` (`65/65` arquivos, `408/408` testes), `test:content` (`219/219`), `test:ingestion` (`71/71`), `itinerary:check` (`10` arquivos), `npm run build` (`1.385` rotas prerenderizadas, `1.357` URLs no sitemap, zero avisos de orçamento), `check:links` (`1.387` páginas estáticas) e Playwright E2E completos (`209/209`).

## Mudanças recentes (19/11, `develop`, não publicado)

- **Mapa (`/mapa`):** mesa de estudo extraída para `components/map-study-desk` (imagem licenciada, registros agrupados por tipo, recorte temporal em destaque, referência geográfica recolhida), destaques do recorte, vizinhos realçados no globo, régua de séculos e barra de marco com anterior/próximo; legenda de conexões sem nota no hover (igual ao grafo); estouro horizontal no celular corrigido.
- **Grafo e mapa — relações:** "Relação documentada" e "Conexão" removidas. `core/content/queries/relation-category.ts` classifica por tipo, verbo do rótulo, P737 e decisões por relação em `core/content/editorial/relation-categories.ts` (modelo local `gemma2:9b` via `scripts/content/classify-relations.mjs`, travado por `scripts/content/relation-guard.mjs`). Novas famílias **Filiação** e **Lugar**; links de navegação e coocorrências sem peso são omitidos da rede e do mapa (registro preservado). Detalhes em [`design/GRAFO-TIPOS.md`](design/GRAFO-TIPOS.md).
- **Home — pôster interativo:** `pages/home/poster-loom` desenha a figura de cada destino (fichas, rede, globo, rota) quando a porta recebe hover ou foco, e o ponteiro puxa fios até as peças do mosaico; sem loop automático. Entrada única do título e das portas; faixas com movimento ligado ao scroll (`animation-timeline: view()`, com fallback estático e respeito a movimento reduzido).
- **Mapa:** "Ver como lista" com abas (territórios/conexões), filtro por nome, colunas ordenáveis e cor da relação. Mapa e grafo ganharam o menu **Seções** (`shared/ui/section-switcher`, popover nativo) para ir às outras áreas.
- **Interface (unslop-ui):** eyebrows redundantes e slogans removidos, travessões tirados de rótulos visíveis, pesos 800 → 700. Mantidos por precedência: letras A–E, assinatura 900 do display, `·` e títulos de documento "X — ATLAS".
- **Cards:** em `/leituras` e `/itinerarios` o card inteiro é clicável, com hover/foco que desloca o card e realça a ação. Pôster da home sorteia composição a cada visita.
- **Grafo — pares essenciais:** `expand-relations.mjs --pairs` ligou 10 pares curados com fonte (rótulos conferidos à mão); 19 pares e 28 temas sem verbete listados em `design/GRAFO-TIPOS.md`.
- **Responsividade:** 15 rotas em 375/768/1366 px sem estouro horizontal (corrigido o filtro de temas em `/leitura/trabalhismo` a 768 px).
- **Home:** leituras compactadas (formato em quatro marcas + lista), seção **B — O mundo no tempo** com entradas por recorte (`/mapa?anoDe=&anoAte=`), porta do mapa no pôster, painel de números e pílulas duplicadas removidos, gestos de uso antes do método. Recortes do mapa em `core/content/queries/world-map-eras.ts`.
- **Expansão de relações:** `scripts/content/expand-relations.mjs` gera candidatas de menções literais nas afirmações com fonte, prioriza Brasil > Europa > EUA > Ásia > mundo > África, classifica com modelo local e grava relações `pending` com `[conferência de IA]`. Cache de respostas em `generated/relation-expansion-cache.json`. Primeira rodada: **+199 relações** (3.041 no total; 2.529 visíveis em 7 famílias, 512 omitidas). Conteúdo novo **ainda não publicado no R2**: rodar `npm run content:publish` com autorização.

## Mudanças anteriores (18/11, `develop`)

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

1. Publicar o conteúdo ampliado (`npm run content:publish`, ação externa — pedir autorização), abrir PR `develop` → `master` e validar o deploy.
2. Revisar por amostra as decisões do modelo local em `relation-categories.ts` e as relações `rel-exp-*` (direção e categoria têm erros pontuais).
3. Rodar nova expansão com `--limit` maior; candidatas brasileiras se esgotam rápido (107 de 3.799), então ampliar verbetes brasileiros antes.

## Mapa rápido

- Regras obrigatórias: [`../AGENTS.md`](../AGENTS.md)
- Índice completo da documentação: [`README.md`](README.md)
- Arquitetura: [`architecture/ARCHITECTURE.md`](architecture/ARCHITECTURE.md) · Dados: [`architecture/DADOS-E-CARREGAMENTO.md`](architecture/DADOS-E-CARREGAMENTO.md)
- Design e voz: [`design/PAGE_STANDARD.md`](design/PAGE_STANDARD.md) · [`design/GUIA-DE-VOZ.md`](design/GUIA-DE-VOZ.md) · [`design/MAPA-MUNDI.md`](design/MAPA-MUNDI.md)
- Produção: [`operations/PRODUCAO.md`](operations/PRODUCAO.md)
