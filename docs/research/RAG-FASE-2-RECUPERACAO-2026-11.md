# RAG ATLAS — Fase 2: Baselines de Recuperação, Granularidade e Reranking (2026-11)

**Status:** concluída e medida em GPU local (`NVIDIA GeForce RTX 4060`, 8 GB VRAM, FP16).  
**Executor:** `experiments/rag/src/atlas_rag/eval/phase2_runner.py`  
**Artefato de métricas:** `experiments/rag/eval/runs/phase2_retrieval/metrics.json` (+ `per_query_details.json`)  
**Testes automatizados:** `experiments/rag/tests/test_phase2_retrieval.py` (`3 passed in 8.53s`)

---

## 1. Desenho experimental e telemetria de GPU (`metrics.json`)

- Conjunto avaliado: **100 perguntas** da Fase 1 (**86 com `gold_unit_ids`** para métricas de ranking; **14 `sem_resposta`** para separação de score OOV).
- **Unidade padrão comparada contra alternativas:** `claim_enriched` (`11.145` afirmações com contexto da entidade e fonte), `claim_raw` (`11.145` textos nus), `paragraph_enriched` (`4.621` parágrafos) e `entity_enriched` (`1.224` verbetes inteiros).

### Indexação densa (`BAAI/bge-m3`, CUDA FP16) e Reranking (`BAAI/bge-reranker-v2-m3`, CUDA FP16, `max_length=512`)

| Estágio / Configuração | Quantidade | Tempo (s) | Taxa (itens/s) | Pico VRAM (MB) |
| --- | ---: | ---: | ---: | ---: |
| Embed `claim_enriched` (batch 64) | 11.145 | 36,611 | 304,42 | 1.345,21 |
| Embed `claim_raw` (batch 64) | 11.145 | 10,6445 | 1.047,02 | 1.193,31 |
| Embed `paragraph_enriched` (batch 64) | 4.621 | 12,5848 | 367,19 | 1.377,95 |
| Embed `entity_enriched` (batch 16) | 1.224 | 17,2369 | 71,01 | 1.287,44 |
| Embed 100 consultas eval (batch 32) | 100 | 0,1164 | 859,19 | 1.116,48 |
| Rerank top-20, lote `batch_size=16` | 2.000 pares | 9,3739 | 213,36 | 1.159,87 |
| Rerank top-50, lote `batch_size=16` | 5.000 pares | 21,3613 | 234,07 | 1.159,87 |
| Rerank top-50, lote `batch_size=8` | 5.000 pares | 21,8578 | 228,75 | 1.125,51 |

> Após descarga do reranker (`BgeReranker.unload()`), `torch.cuda.memory_allocated()` caiu para **8,12 MB**. Reduzir `batch_size` de `16` para `8` economizou **34,36 MB** de pico de VRAM mantendo qualidade idêntica.

---

## 2. Resultados globais (`overall`, `n=86`, IC 95% bootstrap `n=1000`)

| Sistema | Recall@5 (IC 95%) | Recall@10 (IC 95%) | Recall@20 | MRR@10 (IC 95%) | nDCG@10 | Entity R@5 | Latência/q (ms) |
| --- | --- | --- | --- | --- | --- | --- | ---: |
| `(a1) lexical_current_strict` | **0,0000** | **0,0000** | 0,0000 | **0,0000** | 0,0000 | 0,0000 | 12,871 |
| `(a2) lexical_claims` | 0,6395 | 0,6744 | 0,8430 | 0,6291 | 0,5807 | 0,8372 | 7,087 |
| `(b) bm25_claims` | 0,6395 `[0,5580–0,7209]` | 0,7442 `[0,6743–0,8140]` | 0,8837 | 0,6836 `[0,5985–0,7647]` | 0,6460 | 0,9128 | 28,752 |
| `(c2) dense_claim_raw` | 0,5872 | 0,6570 | 0,6919 | 0,5845 | 0,5557 | 0,8198 | 1,245 |
| `(c3) dense_paragraph_enriched` | 0,4012 | 0,4360 | 0,5756 | 0,4548 | 0,3700 | 0,6395 | 0,428 |
| `(c4) dense_entity_enriched` | 0,5698 | 0,6744 | 0,8256 | 0,6432 | 0,5410 | 0,9302 | 0,214 |
| `(c1) dense_claim_enriched` | 0,7442 `[0,6744–0,8081]` | 0,8140 `[0,7616–0,8663]` | 0,8721 | 0,7131 `[0,6421–0,7831]` | 0,6941 | 0,9302 | 1,282 |
| `(d) hybrid_rrf_claims` (`k=60`) | 0,7035 `[0,6278–0,7849]` | 0,8372 `[0,7791–0,8953]` | **0,9302** | 0,7133 `[0,6348–0,7878]` | 0,7043 | 0,9477 | 31,621 |
| `(e1) hybrid_rerank_top20_b16` | 0,7733 `[0,7035–0,8430]` | **0,8488** `[0,7907–0,9012]` | **0,9302** | **0,7693** `[0,6934–0,8417]` | **0,7457** | 0,9651 | 125,360 |
| `(e2) hybrid_rerank_top50_b16` | **0,7791** `[0,7093–0,8488]` | 0,8372 `[0,7791–0,8895]` | 0,9186 | 0,7686 `[0,6921–0,8407]` | 0,7407 | **0,9767** | 245,234 |
| `(e3) hybrid_rerank_top50_b8` | **0,7791** | 0,8372 | 0,9186 | 0,7686 | 0,7407 | **0,9767** | 250,199 |

### Achados centrais da comparação

1. **Busca atual (`discovery-index.ts`) em perguntas naturais:** `lexical_current_strict` registrou **0,0000** porque exige correspondência estrita `AND` de todos os termos da pergunta (inclusive palavras interrogativas como *qual*, *como*, *segundo*) dentro do `searchText` de um único verbete.
2. **Impacto da unidade (`claim_enriched` vs `claim_raw` / parágrafo / verbete):** enriquecer cada afirmação com título, tipo e fonte elevou o `Recall@10` denso de **0,6570** (`claim_raw`) para **0,8140** (**+15,70 p.p.**) e superou parágrafos (**0,4360**) e verbetes inteiros (**0,6744**).
3. **Separação de score OOV (`sem_resposta` vs respondíveis):** no `hybrid_rerank_top20_b16`, a média do top-1 para perguntas respondíveis foi **0,8087**, contra **0,0092** nas 14 perguntas `sem_resposta` (razão de **~88×**), muito mais nítida do que no cosseno denso (**0,6535** vs **0,4640**) ou no BM25 (**37,4236** vs **17,1154**).
4. **Generalização `dev` vs `test`:** no `hybrid_rerank_top20_b16`, o `Recall@10` foi **0,8197** (`[0,7459–0,8934]`, `n=61`) em `dev` e **0,9200** (`[0,8400–0,9800]`, `n=25`) em `test`; sem sobreajuste ao split `dev`.

---

## 3. Métricas por tipo de pergunta (principais pipelines)

| Tipo | `bm25_claims` R@10 / MRR@10 | `dense_claim_enriched` R@10 / MRR@10 | `hybrid_rrf_claims` R@10 / MRR@10 | `hybrid_rerank_top20_b16` R@10 / MRR@10 |
| --- | ---: | ---: | ---: | ---: |
| `factual` (`n=24`) | 0,9792 / 0,8764 | **1,0000** / 0,9514 | **1,0000** / 0,9514 | **1,0000** / **0,9722** |
| `contestada` (`n=16`) | **1,0000** / 0,9152 | **1,0000** / 0,8958 | **1,0000** / 0,9167 | **1,0000** / **0,9583** |
| `comparativa` (`n=14`) | 0,7500 / 0,6091 | 0,7857 / 0,6869 | 0,7857 / 0,6369 | **0,8929** / **0,7976** |
| `multi_hop` (`n=18`) | 0,5000 / 0,6674 | 0,6389 / 0,5593 | **0,7222** / 0,6649 | **0,7222** / **0,6963** |
| `so_link_de_descoberta` (`n=14`) | 0,3571 / 0,1837 | 0,5357 / **0,3195** | **0,5714** / 0,2115 | 0,5357 / 0,2712 |

---

## 4. Análise das 3 principais categorias de falha (`hybrid_rerank_top50_b16`)

Total de consultas com `Recall@10 < 1,0`: **25 de 86** (em perguntas `factual` e `contestada`, `Recall@10` já é **1,0000**; os erros concentram-se em perguntas de dois nós).

1. **`multi_hop_e_comparativa_incompleta` (13 casos):** a recuperação traz o primeiro salto da cadeia e até a entidade certa no segundo salto, mas não inclui exatamente a afirmação-alvo da segunda entidade entre as 10 primeiras (ex.: `q-mh-004` sobre Locke, Jefferson e Rousseau recupera `claim-wiki-topic-john-locke-001`, `claim-wiki-topic-thomas-jefferson-002` e `claim-wiki-topic-jean-jacques-rousseau-012` em vez de `rousseau-001`; `q-mh-006` recupera `ion-c-bratianu-007` e `guerra-servio-otomana-001`). Motivação direta para a expansão em grafo da **Fase 4**.
2. **`desalinhamento_lexical_ou_granuralidade` (10 casos):** todas as entidades esperadas estão presentes (`entity_recall_10 = 1,0`), porém o cross-encoder prefere outra afirmação descritiva da mesma entidade ou de conceito vizinho (ex.: `q-mh-003` ranqueia `liberal-socialism-006` e `revisionismo-marxismo-004` acima de `liberal-socialism-001` e `eduard-bernstein-001`; `q-disc-003` e `q-disc-004` cobrem apenas uma das entidades no top-5).
3. **`descoberta_ou_ranking_contestada` (2 casos):** em pares propositalmente desconexos (`q-disc-002`: John Rawls vs Brasil; `q-disc-014`: Liberalismo social vs Brasil), a afirmação de `country-brazil` possui baixa similaridade com termos da teoria política e não entra no top-10 (`entity_recall_10 = 0,5`), reforçando que o tratamento de `so_link_de_descoberta` deve apoiar-se na estrutura do grafo.
