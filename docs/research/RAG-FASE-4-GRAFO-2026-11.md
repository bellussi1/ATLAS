# RAG ATLAS — Fase 4: Recuperação Consciente do Grafo (2026-11)

**Status:** concluída e medida sobre o bundle pinado (`release 5923d2eb...`, `bundle 0076d24e...`).  
**Módulo:** `experiments/rag/src/atlas_rag/retrieve/graph_expand.py` e `experiments/rag/src/atlas_rag/eval/phase4_runner.py`  
**Artefato de métricas:** `experiments/rag/eval/runs/phase4_graph/metrics.json`  
**Testes automatizados:** `experiments/rag/tests/test_phase4_graph.py` (`2 passed in 0.22s`)

---

## 1. Desenho experimental

A Fase 4 avaliou o impacto de expandir os `top-20` resultados da recuperação base em `1-hop` ao longo das arestas do grafo (`GraphExpander`), comparando três regimes de estrato relacional em dois baselines da Fase 2 (`hybrid_rerank` a partir de `phase2_best_hits.json` e `hybrid_rrf` a partir de `phase2_rrf_hits.json`):

1. **`no_graph`:** sem expansão por arestas (baseline da Fase 2).
2. **`editorial_only`:** expande apenas por relações editoriais tipadas/historiográficas (`tier == "editorial"`, `editorial_weight = 1.0`, `seed_entities_limit = 4`), excluindo `encyclopedic-link`, `documented-association` e arestas de catálogo.
3. **`full_with_low_discovery`:** mantém expansão editorial com peso `1.0` e permite arestas de descoberta/catálogo com peso reduzido (`discovery_weight = 0.15`), sinalizando o hit com `via_discovery_only = true` quando não há aresta editorial paralela.

---

## 2. Resultados da ablação (`metrics.json`, `n=86` respondíveis; IC 95% bootstrap `n=1000`)

### Visão global (`overall`) e subconjuntos `multi_hop` / `comparativa`

| Variante | Overall R@5 (IC 95%) | Overall R@10 (IC 95%) | Overall MRR@10 | Multi-hop R@5 (IC 95%) | Multi-hop R@10 (IC 95%) | Multi-hop MRR@10 | Comparativa R@10 |
| --- | --- | --- | ---: | --- | --- | ---: | ---: |
| `hybrid_rerank__no_graph` | 0,7791 `[0,7093–0,8488]` | 0,8372 `[0,7791–0,8895]` | **0,7686** | 0,5556 `[0,4167–0,6944]` | 0,6667 `[0,5278–0,7785]` | **0,6963** | 0,8929 |
| `hybrid_rerank__editorial_only` | **0,7849** `[0,7150–0,8547]` | **0,8663** `[0,8140–0,9129]` | 0,7456 | **0,6667** `[0,5278–0,8056]` | **0,8056** `[0,6944–0,9167]` | 0,6806 | 0,8929 |
| `hybrid_rerank__full_with_low_discovery` | **0,7849** `[0,7150–0,8547]` | **0,8663** `[0,8140–0,9129]` | 0,7456 | **0,6667** `[0,5278–0,8056]` | **0,8056** `[0,6944–0,9167]` | 0,6806 | 0,8929 |
| `hybrid_rrf__no_graph` | 0,7035 `[0,6278–0,7849]` | 0,8372 `[0,7791–0,8953]` | 0,7133 | 0,4444 `[0,3333–0,5556]` | 0,7222 `[0,6111–0,8333]` | 0,6649 | 0,7857 |
| `hybrid_rrf__editorial_only` | 0,7442 `[0,6686–0,8198]` | 0,8547 `[0,7965–0,9070]` | 0,7261 | 0,6111 `[0,4444–0,7778]` | 0,7778 `[0,6667–0,8889]` | **0,7033** | **0,8214** |
| `hybrid_rrf__full_with_low_discovery` | 0,7442 `[0,6686–0,8198]` | 0,8547 `[0,7965–0,9070]` | 0,7261 | 0,6111 `[0,4444–0,7778]` | 0,7778 `[0,6667–0,8889]` | **0,7033** | **0,8214** |

### Subconjunto `so_link_de_descoberta` (`n=14`) e auditoria de risco causal

| Variante | Discovery R@5 | Discovery R@10 | Discovery MRR@10 | Hops `discovery` no top-10 | Exposição ingênua a falsa influência | Afirmação de falsa influência c/ guarda |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `hybrid_rerank__no_graph` | **0,3571** | 0,5357 | **0,2664** | 0 / 14 | 0,0000 | 0,0000 |
| `hybrid_rerank__editorial_only` | 0,2500 | 0,5357 | 0,2527 | 0 / 14 | 0,0000 | 0,0000 |
| `hybrid_rerank__full_with_low_discovery` | 0,2500 | 0,5357 | 0,2527 | **1 / 14** | **0,0714** (7,14%) | 0,0000 |
| `hybrid_rrf__no_graph` | 0,1786 | **0,5714** | 0,2115 | 0 / 14 | 0,0000 | 0,0000 |
| `hybrid_rrf__editorial_only` | 0,2143 | **0,5714** | 0,2264 | 0 / 14 | 0,0000 | 0,0000 |
| `hybrid_rrf__full_with_low_discovery` | 0,2143 | **0,5714** | 0,2264 | 0 / 14 | 0,0000 | 0,0000 |

---

## 3. Análise e decisão operacional

1. **Ganho consistente em `multi_hop`:** a expansão editorial (`editorial_only`) elevou o `multi_hop Recall@5` de **0,5556 → 0,6667** (**+11,11 p.p.**) e `multi_hop Recall@10` de **0,6667 → 0,8056** (**+13,89 p.p.**) sobre `hybrid_rerank`, e de **0,4444 → 0,6111** (**+16,67 p.p.** em R@5) / **0,7222 → 0,7778** (**+5,56 p.p.** em R@10) sobre `hybrid_rrf`. No conjunto global (`n=86`), o `Recall@10` subiu para **0,8663** (`[0,8140–0,9129]`), mantendo consistência entre splits (`dev`: **0,8525** vs **0,8115**; `test`: **0,9000** mantido).
2. **Trade-off de ordenação (MRR):** no `hybrid_rerank__editorial_only`, injetar afirmações de 1-hop no pool reduziu levemente o `MRR@10` global (**0,7686 → 0,7456**) e o `Recall@5` em `so_link_de_descoberta` (**0,3571 → 0,2500**), enquanto no `hybrid_rrf` melhorou o `MRR@10` global (**0,7133 → 0,7261**) e em `comparativa` (`R@10`: **0,7857 → 0,8214**). Em produção de pesquisa, recomenda-se expandir antes do corte final ou reservar `k=10` com cota dedicada a pontes editoriais.
3. **Efeito da ablação com links de descoberta:** `full_with_low_discovery` teve **zero ganho** de `Recall@10` ou `MRR@10` em relação a `editorial_only`, mas promoveu 1 hop exclusivamente de descoberta para o top-10 em `so_link_de_descoberta` (**7,14%** de exposição ingênua caso não houvesse guarda pós-recuperação).
4. **Decisão:** adotar **`editorial_only`** como política padrão para expansão no grafo de recuperação e manter a trava estrutural que detecta ausência de aresta editorial em perguntas relacionais (`discovery_only_pair`).
