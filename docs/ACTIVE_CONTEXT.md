Status: atual
Última verificação: 19/11/2026

# Contexto vivo do ATLAS

Atualizado em 19/11/2026. Handoff curto entre sessões (regra em [`README.md`](README.md): manter enxuto). Histórico anterior completo em [`archive/2026-11/active-context-history.md`](archive/2026-11/active-context-history.md).

## Estado atual

- **Branch / deploy:** `develop`, origem única `https://atlas-bellussi.pages.dev` (Cloudflare Pages, Direct Upload em push para `master`).
- **Conteúdo publicado no R2:** **24 coleções**, release **`b10ec6ffeb5c701065cf9dc331567ad4ea4b293924485d10f0d5847867b8fa0c`** (`1.320` entidades, `3.052` relações, `2.540` ligações visíveis no grafo). Ponteiro em [`content/content-pointer.json`](../content/content-pointer.json).
- **Verificação final (19/11):** `lint`, `typecheck`, `npm test` (`417/417`), `test:content` (`220/220`), `test:ingestion` (`71/71`), `build` (`1.357` URLs no sitemap), `check:links` (`1.387` páginas) e Playwright E2E (`209/209`). Responsividade: 15 rotas sem estouro em 375/768/1366 px.
- **Verificação desta rodada (19/11, local):** `typecheck`, `npm test` (`418/418`), `test:content` (`220/220`), `content:build`, `build:local` (`1.395` rotas), `check:links` (`1.397` páginas) e `publish:check` em dry-run. `lint` sem erros, com 9 avisos preexistentes. `content:prune` liberou 4.677 MB e `clean --deep` liberou 30.882 MB.
- **Preview local ativo:** `preview:local` rodando em `http://127.0.0.1:4305/` com o release local `cb9a660e` (54 artefatos, `/content/pointer.json` apontando para a própria origem). Home, `/leitura/era-vargas`, `/leitura/golpe-de-1964` e o itinerário `autoritarismo-totalitarismo-e-resistencia` responderam 200.

## Mudanças recentes (19/11, publicado)

- **Grafo — link compartilhado:** `?no=` com `?de=`/`?para=` restaura o caminho inteiro e o enquadra, em vez de abrir só no verbete selecionado; a restauração não reescreve mais a URL sem os extremos. Coberto por teste de unidade (`RouterTestingHarness`) e pelo E2E que recarrega o link.

- **Mapa (`/mapa`):** mesa de estudo extraída para `components/map-study-desk` (imagem licenciada, registros agrupados por tipo, recorte temporal em destaque, referência geográfica recolhida), destaques do recorte, vizinhos realçados no globo, régua de séculos e barra de marco com anterior/próximo; legenda de conexões sem nota no hover (igual ao grafo); estouro horizontal no celular corrigido.
- **Grafo e mapa — relações:** "Relação documentada" e "Conexão" removidas. `core/content/queries/relation-category.ts` classifica por tipo, verbo do rótulo, P737 e decisões por relação em `core/content/editorial/relation-categories.ts` (modelo local `gemma2:9b` via `scripts/content/classify-relations.mjs`, travado por `scripts/content/relation-guard.mjs`). Novas famílias **Filiação** e **Lugar**; links de navegação e coocorrências sem peso são omitidos da rede e do mapa (registro preservado). Detalhes em [`design/GRAFO-TIPOS.md`](design/GRAFO-TIPOS.md).
- **Home — pôster interativo:** `pages/home/poster-loom` desenha a figura de cada destino (fichas, rede, globo, rota) quando a porta recebe hover ou foco, e o ponteiro puxa fios até as peças do mosaico; sem loop automático. Entrada única do título e das portas; faixas com movimento ligado ao scroll (`animation-timeline: view()`, com fallback estático e respeito a movimento reduzido).
- **Mapa:** "Ver como lista" com abas (territórios/conexões), filtro por nome, colunas ordenáveis e cor da relação. Mapa e grafo ganharam o menu **Seções** (`shared/ui/section-switcher`, popover nativo) para ir às outras áreas.
- **Interface (unslop-ui):** eyebrows redundantes e slogans removidos, travessões tirados de rótulos visíveis, pesos 800 → 700. Mantidos por precedência: letras A–E, assinatura 900 do display, `·` e títulos de documento "X — ATLAS".
- **Cards:** em `/leituras` e `/itinerarios` o card inteiro é clicável, com hover/foco que desloca o card e realça a ação. Pôster da home sorteia composição a cada visita.
- **Grafo — pares essenciais:** `expand-relations.mjs --pairs` ligou 10 pares curados com fonte (rótulos conferidos à mão); 19 pares e 28 temas sem verbete listados em `design/GRAFO-TIPOS.md`.
- **Mobile:** mapa e grafo com cabeçalho de uma linha e ferramentas em faixa deslizável; home com portas em pares, itinerários deslizantes e tipos de ficha em grade.
- **Responsividade:** 15 rotas em 375/768/1366 px sem estouro horizontal (corrigido o filtro de temas em `/leitura/trabalhismo` a 768 px).
- **Home:** leituras compactadas (formato em quatro marcas + lista), seção **B — O mundo no tempo** com entradas por recorte (`/mapa?anoDe=&anoAte=`), porta do mapa no pôster, painel de números e pílulas duplicadas removidos, gestos de uso antes do método. Recortes do mapa em `core/content/queries/world-map-eras.ts`.
- **Expansão de relações:** `scripts/content/expand-relations.mjs` gera candidatas de menções literais nas afirmações com fonte, prioriza Brasil > Europa > EUA > Ásia > mundo > África, classifica com modelo local e grava relações `pending` com `[conferência de IA]`. Cache de respostas em `generated/relation-expansion-cache.json`. Primeira rodada: **+199 relações** (3.041 no total; 2.529 visíveis em 7 famílias, 512 omitidas). Publicado no R2 em 19/11.
- **Firecrawl Local + RAG / Embeddings + Enriquecimento contínuo (`19/11`, local):** binário Rust `firecrawl-local v0.1.0` instalado localmente (`FIRECRAWL_CLOUD=off`) e registrado em `.vscode/mcp.json` (`--public-only`). Pipeline `scripts/ingestion/firecrawl/` (`npm run firecrawl:extract`) extraiu **90/90 fontes** curadas (`1.192.295` palavras em `generated/firecrawl-corpus/`): Constituições brasileiras 1824–1988, AI-1/2/5, Lei Áurea, Lei do Ventre Livre, Lei Eusébio de Queirós, Lei da Anistia, documentos primários (`Avalon`, `Marxists.org`), Wikipédia PT (`CC BY-SA 4.0`) e artigos SEP/IEP, com `license` e `usagePolicy`. Integrado ao `experiments/rag` (`firecrawl_corpus.py`, `continuous_enrichment.py`, `npm run rag:ingest-firecrawl`, `rag:search`, `rag:mine-firecrawl-gaps`, `enrich:once`, `enrich:loop`): **5.030 chunks** embeddados com `BAAI/bge-m3` FP16 na GPU (`59,61 s`), fila de **18 lacunas** (`firecrawl-lacunas-evidencias.json`, score médio `0.6847` vs. acervo `0.6367`) e primeiros **3 rascunhos** estruturados gerados localmente via Ollama (`qwen3:8b-q4_K_M`) em `experiments/rag/eval/queues/enrichment-drafts/` (`ok: null`, `[conferência de IA]`, sem publicação automática).

## Publicado em produção (19/11)

- **Release `58e0b932`** no R2 (`content:publish`) e deploy no Cloudflare Pages (`pages-deploy.mjs`, 1.405 arquivos, 14,49 s). Alias `https://atlas-bellussi.pages.dev` servindo o novo build; URL do deploy: `https://a3993ee1.atlas-bellussi.pages.dev`.
- **Em produção agora:** leituras `Era Vargas` e `Golpe de 1964` com selo `Com fontes · revisão pendente` (8 leituras listadas) e **20 itinerários** (15 anteriores + 5 novos da fila de dezembro).
- **Verificado em produção (200 OK):** `/leitura/era-vargas/`, `/leitura/golpe-de-1964/`, `/itinerario/esquerda-direita-e-populismos/`, `/itinerario/direitos-humanos-e-efetividade/` e `/leituras/` com os dois títulos novos.
- **Build da produção:** 1.400 rotas prerenderizadas, sitemap com 1.372 páginas, release `58e0b932` no health.

## Mudanças locais (19/11, sem publicação)

- **Lacunas lidas do grafo (`npm run rag:graph-gaps`):** `mining/graph_gaps.py` agrega as 24 coleções do release, conta relações editoriais, afirmações e fontes por entidade e separa a fila em `fonte`, `conteudo` e `relacao`. Primeira leitura: **358 lacunas** em 1.320 entidades (44 sem fonte, 13 com conteúdo fino e 301 com zero/uma aresta). Saída em `experiments/rag/eval/queues/lacunas-do-grafo.json`.
- **Descoberta a partir da lacuna:** `discover.mjs --graph --no-topics --graph-mode fonte,conteudo` busca o título na Wikipédia, prefere o artigo exato e marca `discoveredFrom: "graph-gap:<id>"`. O corpus passou de **106 para 115 fontes** (marxismo, socialismo, fascismo, Kemalismo, Brasil, Napoleão, Boston e outras), com **5.808 chunks**.
- **Cruzamento de relações:** `rag:relations --mode coocorrencia` encontra títulos no mesmo trecho do corpus, filtra entidades onipresentes e cruza com embeddings; `--mode padrao` exige dois títulos na mesma frase e verbo relacional entre eles; `--mode embeddings` ranqueia vizinhos semânticos. Primeira rodada: **300 pares por coocorrência** (topo: China/Taiwan, Estado de direito/Separação de poderes, Marxismo/Proletariado, Lenin/União Soviética) e 82 pares por padrão lexical. Tudo `ok: null`.
- **Rascunhos de relação (`rag:relation-drafts`):** o Ollama recebe os trechos que citam os dois lados e só aceita família, rótulo, direção, `source_url` e um `quote` literal contido na passagem que nomeie os dois lados; a família também precisa ser compatível com os tipos. Na amostra, propostas iniciais sem vínculo direto voltaram `relation: null`, e um par Lenin/União Soviética foi rejeitado pelo guard depois de tentar "Criação" entre pessoa e país. Ficaram rascunhos aceitos para PCUS → PCB e Bolchevique → Revolução de Outubro.
- **Expansão de afirmações (`rag:expand-claims`):** entidades com 1–2 afirmações recebem propostas do Ollama sobre o corpus, com URL, classificação, duplicidade e `quote` literal na passagem. `Kemalismo` gerou **2 afirmações novas** com citação literal da Wikipédia; Cambridge e entidades sem passagem relevante são puladas sem chamada de LLM.
- **Ciclo completo:** `enrich` agora executa lacunas do grafo → descoberta → extração → indexação incremental → lacunas fixas → coocorrência → padrões → rascunhos de entidade → relação → expansão, com `--max-relations`, `--max-expansions`, `--graph-limit`, `--no-relations` e `--no-expand`. `enrich:watch` mantém o processo local e grava `generated/firecrawl-loop/{state.json,history.jsonl}`.
- **Build local sem R2 (`content:local`, `build:local`, `preview:local`):** `content:local` monta `generated/content-cache/pointer.json` a partir de `generated/content` com `baseUrl` local; `build:local` prerenderiza sem `content:fetch`; `preview:local` serve `dist` e `/content` na porta 4305, com `window.__ATLAS_CONTENT_BASE__` restrito a essa porta. O `build:local` gerou **1.395 rotas** e incluiu as duas leituras novas e os 15 itinerários. Produção continua no R2.
- **Compactação:** `content:prune` removeu **1.033 arquivos** e liberou **4.677 MB** de releases antigos; `clean --deep --yes` removeu o cache bruto da Wikipédia e outros diretórios regeneráveis, liberando **30.882 MB**. `generated/content-cache` ficou em **124 MB** e `generated/content` em **80,5 MB**.
- **Revisão de filas:** `content:review-firecrawl` auditou **25 seeds descobertos** (todos pendentes, sem problema de host/licença/política/duplicidade) e **4 rascunhos** de enriquecimento. O relatório aponta relações da Constituição de 1988 para leis posteriores sem fonte que as nomeie, relações anacrônicas no Estado Novo e família "Influência" usada para verbos de instituição no AI-1. Tudo segue `ok: null`.
- **LinkedIn:** o post `09-slider` ganhou `post.txt` a partir do carrossel e agora está pronto (18/12). Os dry-runs de `09-slider`, `10-mapa` e `11-lacunas` passaram, com links/UTM e PDF válidos. A publicação real continua dependendo de token e revisão humana.
- **Scripts sociais versionados:** `.gitignore` libera apenas `docs/social/linkedin/*.mjs`; posts, imagens, calendário e métricas continuam locais.
- **Seeds aprovados:** as 25 fontes descobertas passaram de `review: "pending"` para `approved` com a aprovação registrada nesta sessão. Nenhuma entrou no release; são corpus local para extração.
- **Rascunhos corrigidos:** AI-1 com famílias reclassificadas (Atuação, Continuidade e Criação com rótulo passivo para o Comando Supremo); AI-5 "endureceu" em Continuidade; Constituição de 1988 e Estado Novo com as relações sem sustentação removidas. Todos seguem `ok: null`.
- **Onda 2 parcial:** `Estado` (6 tipos de bloco, 2.008 palavras; falta 1 tipo para o piso) e `Revolução` (6 tipos, 2.008 palavras; falta 1 tipo) ganharam blocos `timeline` e `atlas` com entidades já datadas e referenciadas. Karl Marx, Adam Smith, Segunda Guerra e Ditadura militar seguem com lacunas de prosa.
- **Itinerários:** fila de dezembro executada; `esquerda-direita-e-populismos`, `primeira-republica-e-cidadania` (corrigido para diversificar paradas), `ciencia-estado-e-tecnocracia`, `direitos-humanos-e-efetividade` e `america-latina-revolucoes-e-ditaduras` validados. `escravidao-abolicionismo-e-cidadania` não fechou: o grafo não tem verbetes de escravidão/abolição (só as fontes das leis); fica para a leitura da Wave 3.
- **Auditoria de imagens (#94):** `audit-reading-images.mjs` conferiu as 16 figuras de abertura das leituras publicadas: criador, licença, URL de licença, URL de origem e reprodução. 0 problemas estruturais; a conferência de autoria segue humana.
- **Descoberta contínua de fontes (`firecrawl:discover`):** `scripts/ingestion/firecrawl/topics.json` declara 10 temas (marxismo, liberalismo, social-democracia, anarquismo, nazismo, stalinismo, trabalhismo, Era Vargas, Golpe de 1964 e ditadura militar) com QIDs, artigos e categorias. `discover.mjs` consulta Wikipédia pt/en, Wikidata (`P1142`/`P921`/`P279`) e índices do Marxists Internet Archive pelo cliente Wikimedia compartilhado, pontua candidatos e grava `generated/firecrawl-discovery/candidates.json`. `--apply` acrescenta seeds com `origin: "discovery"`, `review: "pending"` e `discoveredFrom`, sem tocar nos curados.
- **Extração em lote parcial:** `firecrawl:extract --slug ...` permite atualizar só seeds novos, e o manifesto é mesclado com o corpus existente em vez de ser sobrescrito.
- **Indexação incremental:** `index_firecrawl_corpus(incremental=True)` reaproveita vetores por `unit_id` + `sha256` do documento. Última medição: `115` documentos, `5.808` chunks, `5.330` reaproveitados e `478` embeddados em `6,93 s` na GPU; sem mudança, o `BAAI/bge-m3` não é carregado.
- **LinkedIn:** `capture-assets.mjs` refaz capturas da produção; `schedule.mjs` lê o calendário e checa links/UTM, texto, PDF e imagens, gravando `pauta.md`/`pauta.json`; `prepare.mjs` regenera o próximo carrossel; `publish.mjs` publica pela API oficial (Posts + Documents) com `--dry-run` por padrão e credenciais fora do repositório. Posts `10-mapa` e `11-lacunas` ganharam carrossel com capturas reais e a pauta os marca como prontos (21/11 e 24/11).

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

0. **Publicado em produção (19/11):** release `58e0b932` no R2 e deploy no Pages com Era Vargas, Golpe de 1964 e 20 itinerários. Revisar em produção e, quando a leitura humana acontecer, promover os selos de `com-fontes` para `revisado` com revisor identificado.
1. Fechar a Onda 2: `Estado` e `Revolução` precisam de 1 tipo de bloco cada; Karl Marx, Adam Smith, Segunda Guerra e Ditadura militar precisam de prosa com fonte.
2. Criar a leitura `Escravidão e abolição` (Wave 3) para sustentar o itinerário `escravidao-abolicionismo-e-cidadania`, que não fecha sem verbetes.
3. Publicar os posts `09-slider` (18/12), `10-mapa` (21/11) e `11-lacunas` (24/11): dry-runs já passaram; falta token e revisão do PDF.
4. Fatiar o bundle de 35 MB por rota (#96) e a proveniência raw do piloto (#83).
5. Conferência humana: fontes dos dossiês (#9), 30 perguntas do benchmark (#95), teste em Android/iOS (#93) e `AMAZON_ASSOCIATE_TAG` quando aprovado.

## Mapa rápido

- Regras obrigatórias: [`../AGENTS.md`](../AGENTS.md)
- Índice completo da documentação: [`README.md`](README.md)
- Arquitetura: [`architecture/ARCHITECTURE.md`](architecture/ARCHITECTURE.md) · Dados: [`architecture/DADOS-E-CARREGAMENTO.md`](architecture/DADOS-E-CARREGAMENTO.md)
- Design e voz: [`design/PAGE_STANDARD.md`](design/PAGE_STANDARD.md) · [`design/GUIA-DE-VOZ.md`](design/GUIA-DE-VOZ.md) · [`design/MAPA-MUNDI.md`](design/MAPA-MUNDI.md)
- Produção: [`operations/PRODUCAO.md`](operations/PRODUCAO.md)
