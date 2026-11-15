# RAG ATLAS — Fase 3: Geração com Citações, Travas Duras e Projeção de Custo (2026-11)

**Status:** concluída a custo de API paga **US$ 0,00** (`dry_run: true`, projeções `--dry-run` e cache por SHA-256).  
**Módulos:** `experiments/rag/src/atlas_rag/generate/guards.py`, `generator.py`, `cost.py`, `judge/fidelity.py`, `eval/phase3_runner.py`  
**Artefatos:** `experiments/rag/eval/runs/phase3_generation/metrics.json` e `sample_outputs.json`  
**Testes automatizados:** `experiments/rag/tests/test_phase3_generation.py`

---

## 1. Arquitetura de geração, travas duras e orçamento

- **Contexto de entrada:** top-5 afirmações recuperadas pelo pipeline vencedor da Fase 2 (`hybrid_rerank`), formatadas dentro de `<corpus_evidence>` com escape XML de dados não confiáveis (`_escape_untrusted_xml`).
- **Limiar de recusa calibrado apenas no split `dev` (`n=70`):** `min_rerank_score = 0,05`.
- **Travas pós-geração (`evaluate_guards` + `apply_guard_fallback`):** invalidam automaticamente e convertem em recusa explícita qualquer resposta que: (a) cite `claim_id` inexistente ou ausente no contexto; (b) altere o rótulo `classification` (`documented-fact`, `attributed-thesis`, `contested-claim`, `interpretation`); (c) omita marcador explícito de divergência quando cita `contested-claim`; (d) afirme causalidade/influência para pares com apenas link de descoberta; (e) viole suporte lexical mínimo (`overlap < 0,25`) ou exponha padrões de segredo/exfiltração.

---

## 2. Resultados comparativos (`100` perguntas, `70 dev / 30 test`)

| Modelo | Fidelidade determinística | Citação correta | Acurácia epistêmica (resp.) | Recusa correta (`true_refusal`) | Recusa indevida (`false_refusal`) | Disputa preservada (`contested`) | Passagem bruta nas travas |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `extractive_cited` (determinístico) | **1,0000** | **1,0000** | **1,0000** | **1,0000** | **0,0000** | **1,0000** | 1,0000 (0 overrides) |
| `ollama/qwen3:8b-q4_K_M` (GPU local) | 0,8400 | **1,0000** | 0,7917 | 0,9643 | 0,1806 | 0,8182 | 0,8400 (16 overrides) |

### Detalhamento de `ollama/qwen3:8b-q4_K_M` por tipo de pergunta e split

- **Por split:** `dev` (`n=70`): fidelidade **0,8429**, recusa correta **0,9474**, recusa indevida **0,1569**; `test` (`n=30`): fidelidade **0,8333**, recusa correta **1,0000**, recusa indevida **0,2381**.
- **Por tipo:** `factual` (**0,9583**), `sem_resposta` (**1,0000**), `so_link_de_descoberta` (**0,9286**), `comparativa` (**0,7857**), `multi_hop` (**0,7778**) e `contestada` (**0,5625**, `refused_rate = 0,3125`).
- **Papel das travas:** em **16 de 100** respostas brutas do modelo local 8B (`raw_guard_pass_rate = 0,84`), a camada determinística detectou inconsistência (sobretudo em rótulos ou marcadores de contestação) e converteu em recusa segura, garantindo `citation_correctness_rate = 1,0000` na saída final.
- **Tokens e latência medidos:** `extractive_cited` consumiu `51.098` tokens de entrada / `11.206` de saída (`0,42 ms/pergunta`); `qwen3:8b-q4_K_M` registrou `96.207` tokens de entrada / `17.597` de saída (`7,04 ms` em leitura de cache em disco após a passada ao vivo em GPU a ~5–6 s/pergunta).

---

## 3. Projeções de custo `--dry-run` para APIs pagas (`100` perguntas, `spent_usd = 0,0`)

As chamadas via `BudgetTracker(max_usd=1.50, dry_run=True)` calcularam a estimativa de tokens reais do prompt sem enviar requisições externas:

| Modelo (projeção `--dry-run`) | Chamadas estimadas | Gasto real (`spent_usd`) | Custo projetado / 100 perguntas (USD) |
| --- | ---: | ---: | ---: |
| `gemini-3.8-flash` | 100 | 0,0000 | **0,0205** |
| `deepseek-flash` | 100 | 0,0000 | **0,0559** |
| `claude-haiku-5-5` | 100 | 0,0000 | **0,2273** |
| `claude-sonnet-5-5` | 100 | 0,0000 | **0,6820** |

---

## 4. Calibração do juiz LLM (`judge_calibration`)

- **Juiz avaliado:** `ollama/qwen3:8b-q4_K_M` em **30 casos balanceados** (15 fiéis, 15 falhas controladas de alucinação, citação inexistente e troca epistêmica) com regra estrutural de verificação de ID + classificação pelo LLM.
- **Resultado:** concordância **26/30 (86,67%)**, **kappa de Cohen = 0,7333**.
- **Limitação explícita (`human_calibrated: false`):** a referência usada nesta etapa é sintética e determinística (`30_deterministic_synthetic_reference_labels_pending_human_calibration`). Pela regra da Fase 3, métricas baseadas apenas em juiz LLM só têm validade plena após calibração contra **30 rótulos humanos** marcados pelo mantenedor.
