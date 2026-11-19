# ATLAS RAG — Busca Semântica, Avaliação, Segurança e Mineração do Acervo

Experimento modular em Python (`experiments/rag/`, fora do build Angular static-first do ATLAS) sobre o bundle publicado pinado em [`content/content-pointer.json`](../../content/content-pointer.json).

> **Aviso editorial e limites atuais:**  
> Todos os números abaixo provêm exclusivamente das execuções versionadas em [`eval/runs/`](eval/runs/).  
> Até este momento, **`human_ok = null` em 100/100 perguntas** de [`eval/questions.jsonl`](eval/questions.jsonl) (`human_ok_true_count: 0` em `eval/runs/phase1_evalset.json`) e **`ok = null` em 100% dos itens minerados** em [`eval/queues/`](eval/queues/). Além disso, a calibração do juiz LLM (`judge_calibration`) baseia-se em **30 casos sintéticos determinísticos (`human_calibrated: false`)**. Portanto, os resultados medem consistência estrutural/recuperação automática sobre o bundle e ainda **aguardam revisão humana** do mantenedor.

---

## Licenciamento

- **Código Python (`experiments/rag/src/`, `tests/`, CLI):** licença **MIT** (como o código-fonte do ATLAS).
- **Conjunto de avaliação e filas derivadas do acervo (`eval/questions.jsonl`, `eval/queues/*.json`, relatórios derivados do bundle):** **CC BY-SA 4.0**, herdando a licença do conteúdo publicado do ATLAS.

---

## Tabela de resultados versionados (`eval/runs/`)

### 1. Inventário do bundle pinado (`eval/runs/phase0_inventory.json`)
- Release: `5923d2eb4fda57c52c6e35224a1eac60e162748274b214e651ed14aab9bd0344`
- Bundle SHA-256: `0076d24e013b644a755aee66e0246757a640772299f750a0398a5a11e8ccb5e5` (`29.780.495` bytes; `16` coleções no manifesto; `7` leituras compiladas)
- Unidades deduplicadas: `1.224` entidades, `11.145` afirmações (`100%` com cadeia completa citação → evidência → fonte e status `pending`), `4.621` parágrafos, `1.629` relações (`1.189` editoriais, `170` de descoberta, `270` de catálogo)
- Unidade padrão adotada: **`claim_enriched`** (máximo de `168` tokens no tokenizer `BAAI/bge-m3`, `0` afirmações > 256 tokens)

### 2. Conjunto de avaliação (`eval/runs/phase1_evalset.json`)
- Total: **`100` perguntas** (`70 dev` / `30 test`), distribuídas nos 6 tipos (`factual`: 24, `multi_hop`: 18, `comparativa`: 14, `contestada`: 16, `so_link_de_descoberta`: 14, `sem_resposta`: 14)
- Reaproveitamento de `docs/research/gold-set-2026-11/`: `13` itens base; `human_ok_true_count: 0`, `human_ok_null_count: 100`

### 3. Recuperação e Reranking (`eval/runs/phase2_retrieval/metrics.json`, `n=86` respondíveis, GPU RTX 4060 FP16)

| Sistema | Recall@5 | Recall@10 | Recall@20 | MRR@10 | nDCG@10 | Latência/q (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `lexical_current_strict` (equivalente `discovery-index.ts`) | 0,0000 | 0,0000 | 0,0000 | 0,0000 | 0,0000 | 12,871 |
| `bm25_claims` | 0,6395 | 0,7442 | 0,8837 | 0,6836 | 0,6460 | 28,752 |
| `dense_claim_raw` (`BAAI/bge-m3`) | 0,5872 | 0,6570 | 0,6919 | 0,5845 | 0,5557 | 1,245 |
| `dense_paragraph_enriched` (`BAAI/bge-m3`) | 0,4012 | 0,4360 | 0,5756 | 0,4548 | 0,3700 | 0,428 |
| `dense_entity_enriched` (`BAAI/bge-m3`) | 0,5698 | 0,6744 | 0,8256 | 0,6432 | 0,5410 | 0,214 |
| `dense_claim_enriched` (`BAAI/bge-m3`) | 0,7442 | 0,8140 | 0,8721 | 0,7131 | 0,6941 | 1,282 |
| `hybrid_rrf_claims` (`k=60`) | 0,7035 | 0,8372 | **0,9302** | 0,7133 | 0,7043 | 31,621 |
| `hybrid_rerank_top20_b16` (`bge-reranker-v2-m3`) | 0,7733 | **0,8488** | **0,9302** | **0,7693** | **0,7457** | 125,360 |
| `hybrid_rerank_top50_b16` (`bge-reranker-v2-m3`) | **0,7791** | 0,8372 | 0,9186 | 0,7686 | 0,7407 | 245,234 |

### 4. Expansão em grafo (`eval/runs/phase4_graph/metrics.json`)

| Variante | Overall R@10 | Multi-hop R@5 | Multi-hop R@10 | Hops `discovery` no top-10 | Exposição causal c/ guarda |
| --- | ---: | ---: | ---: | ---: | ---: |
| `hybrid_rerank__no_graph` | 0,8372 | 0,5556 | 0,6667 | 0 / 14 | 0,0000 |
| `hybrid_rerank__editorial_only` | **0,8663** | **0,6667** | **0,8056** | 0 / 14 | 0,0000 |
| `hybrid_rerank__full_with_low_discovery` | **0,8663** | **0,6667** | **0,8056** | 1 / 14 (`7,14%` ingênua) | 0,0000 |
| `hybrid_rrf__no_graph` | 0,8372 | 0,4444 | 0,7222 | 0 / 14 | 0,0000 |
| `hybrid_rrf__editorial_only` | 0,8547 | 0,6111 | 0,7778 | 0 / 14 | 0,0000 |

### 5. Geração com citações e segurança (`eval/runs/phase3_generation/metrics.json` & `phase5_reliability/security_report.json`)

| Pipeline / Modelo | Fidelidade det. | Citação correta | Recusa correta | Recusa indevida | Segurança (`8` ataques) | Custo real (USD) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `extractive_cited` | **1,0000** | **1,0000** | **1,0000** | **0,0000** | **8/8 (100%)** | **0,0000** |
| `ollama/qwen3:8b-q4_K_M` (c/ travas) | 0,8400 | **1,0000** | 0,9643 | 0,1806 | **8/8 (100%)** (`6/8` bruto) | **0,0000** |

- **Projeções `--dry-run` por 100 perguntas (`spent_usd = 0,0`):** `gemini-3.8-flash` (`US$ 0,0205`), `deepseek-flash` (`US$ 0,0559`), `claude-haiku-5-5` (`US$ 0,2273`), `claude-sonnet-5-5` (`US$ 0,6820`).
- **Juiz local (`ollama/qwen3:8b-q4_K_M`, 30 casos sintéticos):** concordância **26/30 (86,67%)**, **kappa de Cohen = 0,7333** (`human_calibrated: false`).

### 6. Mineração do acervo (`eval/runs/phase6_mining.json`)
- Filas em `eval/queues/` com **`100%` de `"ok": null`**: `80` relações candidatas (todas partindo de entidades sem aresta editorial), `37` pares potenciais de debate/tensão epistêmica, `6` pares de deduplicação/desambiguação e inventário completo de lacunas (`488` entidades sem aresta editorial, `418` com grau total zero, `43` sem afirmações).

---

## Corpus Firecrawl Local

Além do bundle publicado, a suíte indexa um corpus local de fontes públicas capturadas por `firecrawl-local` (`FIRECRAWL_CLOUD=off`). A descoberta usa Wikidata, Wikipédia pt/en e índices do Marxists Internet Archive; a indexação é incremental por `sha256` do documento e os rascunhos gerados por Ollama ficam em `eval/queues/enrichment-drafts/` com `ok: null`.

```powershell
npm run firecrawl:discover -- --topic marxismo --limit 80
npm run firecrawl:extract
npm run rag:ingest-firecrawl
npm run rag:search -- "conceito de hegemonia em Gramsci"
npm run rag:mine-firecrawl-gaps
npm run enrich:watch
```

Contrato, licenças, score de descoberta e limites estão em [`docs/architecture/FLUXO-FIRECRAWL.md`](../../docs/architecture/FLUXO-FIRECRAWL.md). Nada desse corpus é publicado automaticamente.

---

## Como reproduzir

Pré-requisitos no workspace ATLAS:
1. Baixar o bundle pinado (caso `generated/content-cache/` não exista):
   ```powershell
   npm run content:fetch
   ```
2. Criar `.venv` Python 3.12 em `experiments/rag/.venv` e instalar o pacote em modo editável:
   ```powershell
   uv venv experiments/rag/.venv --python 3.12
   uv pip install --python experiments/rag/.venv -e experiments/rag
   ```
3. Executar estágios individualmente ou rodar apenas testes/CI sem GPU:
   ```powershell
   experiments/rag/.venv/Scripts/pytest.exe experiments/rag/tests
   experiments/rag/.venv/Scripts/python.exe -m atlas_rag.cli ci-check
   ```
4. Reexecutar pipeline completo com GPU local (+ Ollama `qwen3:8b-q4_K_M` para geração/segurança):
   ```powershell
   experiments/rag/.venv/Scripts/python.exe -m atlas_rag.cli phase0
   experiments/rag/.venv/Scripts/python.exe -m atlas_rag.cli phase1
   experiments/rag/.venv/Scripts/python.exe -m atlas_rag.cli phase2 --rebuild-index
   experiments/rag/.venv/Scripts/python.exe -m atlas_rag.cli phase3
   experiments/rag/.venv/Scripts/python.exe -m atlas_rag.cli phase4
   experiments/rag/.venv/Scripts/python.exe -m atlas_rag.cli phase5-security
   experiments/rag/.venv/Scripts/python.exe -m atlas_rag.cli phase5-thresholds
   experiments/rag/.venv/Scripts/python.exe -m atlas_rag.cli mine
   ```

---

## Decisão arquitetural (ADR-001)

Ver [`docs/architecture/ADR-001-BUSCA-SEMANTICA-E-RAG.md`](../../docs/architecture/ADR-001-BUSCA-SEMANTICA-E-RAG.md): o site público do ATLAS permanece **static-first e sem texto gerado por LLM**, mantendo a suíte `atlas-rag` como infraestrutura local/CI de avaliação e mineração curada, e priorizando como próxima melhoria zero-custo no app a evolução lexical BM25 sem *stop words*.
