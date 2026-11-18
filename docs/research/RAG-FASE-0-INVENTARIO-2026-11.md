Status: resultado
Última verificação: 15/11/2026

# Fase 0 — Inventário, Premissas e Tokenização (`BAAI/bge-m3`)

Execução integral sobre o artefato pinado em [`content/content-pointer.json`](../../content/content-pointer.json), registrada em [`experiments/rag/eval/runs/phase0_inventory.json`](../../experiments/rag/eval/runs/phase0_inventory.json) e validada pelos 3 testes de [`experiments/rag/tests/test_phase0_ingest.py`](../../experiments/rag/tests/test_phase0_ingest.py).

## 1. Verificação das premissas (Seção 2)

| Premissa | Resultado verificado | Evidência |
|---|---|---|
| **1. Manifesto vs. disco** | **Confirmada.** `manifest.json` declara **16** coleções; `content/knowledge/collections/` contém **131** arquivos (115 snapshots antigos). | [`content/knowledge/manifest.json`](../../content/knowledge/manifest.json) |
| **2. Bundle pinado** | **Confirmada.** Release `5923d2eb…`, bundle `0076d24e…` (**29.780.495 bytes**) verificado por SHA-256 em `generated/content-cache/`. Os hashes do manifesto local usam Prettier; os artefatos publicados no R2 usam JSON minificado (`JSON.stringify + "\n"`). | [`content/content-pointer.json`](../../content/content-pointer.json) |
| **3. Busca atual** | **Confirmada e detalhada.** Não há BM25 nem ranqueamento por passagem: [`discovery-index.ts`](../../src/app/core/content/queries/discovery-index.ts) aplica curto-circuito por nome (`nameMatchScore`) e fallback booleano `AND` estrito sobre `searchText`, ordenado alfabeticamente. | [`src/app/core/content/queries/discovery-index.ts`](../../src/app/core/content/queries/discovery-index.ts) |
| **4. Revisões pendentes** | **Confirmada.** Todas as **11.145** revisões do bundle estão `pending`; no [`gold-set-2026-11`](../../docs/research/gold-set-2026-11/README.md) (`40 + 20 + 87`), `0` itens possuem marcação humana (`ok: null`). O eval mede fidelidade ao acervo. | [`docs/research/gold-set-2026-11/README.md`](../../docs/research/gold-set-2026-11/README.md) |
| **5. Links de descoberta** | **Confirmada com refinamento de contrato.** Links puros de navegação/editorial são `encyclopedic-link` (**141**), `related_to` (**27**) e `editorial-link` (**2**) — total **170**. Vínculos de catálogo Wikidata (`associated_with`) somam **270** (sem valor de influência). Já `documented-association` (**636**) agrupa associações com evidência, e **553** arestas possuem tipos históricos/de ação explícitos (`influenced`, `reacted_against`, `participated_in`, `wrote`, etc.). | [`src/app/core/content/queries/knowledge-network.ts`](../../src/app/core/content/queries/knowledge-network.ts) |

## 2. Contagens reais após deduplicação por ID

| Registro | Bruto no bundle | Único por ID | Duplicatas removidas |
|---|---:|---:|---:|
| Entidades (`entities`) | 1.224 | **1.224** | 0 |
| Afirmações (`claims`) | 11.145 | **11.145** | 0 |
| Relações (`relations`) | 1.629 | **1.629** | 0 |
| Evidências (`evidences`) | 12.634 | **12.634** | 0 |
| Citações (`citations`) | 11.145 | **11.145** | 0 |
| Fontes (`sources`) | 1.376 | **1.376** | 0 |
| Parágrafos de seções (`paragraph`) | 4.621 | **4.621** | 0 |

- **Integridade da cadeia epistêmica:** **11.145 / 11.145 (100%)** das `claims` possuem cadeia completa `claim → citation → evidence → source` e `locator` não vazio. Há **99** textos normalizados repetidos entre `claim_id` distintos (preservados com sua entidade/fonte própria).
- **Classificação epistêmica das afirmações:**
  - `documented-fact`: **7.588** (68,08%)
  - `contested-claim`: **1.418** (12,72%)
  - `attributed-thesis`: **1.099** (9,86%)
  - `interpretation`: **1.040** (9,33%)
- **Escopo das entidades:** `nucleo` **1.168**, `contexto` **36**, `fora` **20**.
- **Tipos de entidades:** `person` **276**, `concept` **247**, `institution` **198**, `ideology` **168**, `place` **154**, `event` **75**, `party` **59**, `work` **46**, `article` **1**.

## 3. Medição real de tokens (`BAAI/bge-m3`)

| Granularidade | Unidades | Total tokens | Mín | p50 | p95 | p99 | Máx | Média | > 256 | > 512 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `claim_raw` | 11.145 | 271.703 | 8 | 23,0 | 38,0 | 46,0 | 74 | 24,38 | 0 | 0 |
| `claim_enriched` | 11.145 | 1.082.517 | 55 | 95,0 | 129,0 | 144,0 | 168 | 97,13 | 0 | 0 |
| `paragraph_enriched` | 4.621 | 354.210 | 24 | 60,0 | 160,0 | 176,0 | 205 | 76,65 | 0 | 0 |
| `entity_enriched` | 1.224 | 777.749 | 98 | 641,0 | 911,0 | 1.060,54 | 1.200 | 635,42 | 1.169 | 979 |

## 4. Decisão da unidade padrão de recuperação

A unidade padrão adotada é **`claim_enriched`** (afirmação com cabeçalho contextual `[Entidade (aliases) | tipo | escopo | classificação]`, texto da afirmação e evidência/fonte):
1. **Zero truncamento:** 100% das 11.145 unidades cabem abaixo de 256 tokens (máximo 168), enquanto **80,0% (979/1.224)** dos verbetes completos ultrapassam 512 tokens e sofreriam corte no reranker.
2. **Rastreabilidade atômica:** cada `claim_id` devolve diretamente o rótulo epistêmico e a cadeia `citation → evidence → source`, viabilizando a regra dura de citação na Fase 3.
3. `paragraph_enriched` e `entity_enriched` permanecem construídos como variações experimentais para comparação na Fase 2.
