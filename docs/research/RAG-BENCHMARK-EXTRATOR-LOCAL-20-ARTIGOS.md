# Benchmark do Extrator Local nos 20 Artigos da Amostra Oficial (`model-choice.json`)

**Status:** executado em 15/11/2026 a custo de API paga **US$ 0,00** (`20/20` artigos processados sem falhas por ambos os modelos locais).  
**Executor:** [`scripts/tradicao/local-eval.mjs`](../../scripts/tradicao/local-eval.mjs)  
**Travas aplicadas:** [`scripts/tradicao/guards.mjs`](../../scripts/tradicao/guards.mjs) (`guardExtraction` + `applyVerdicts`)  
**Amostra oficial (`20` artigos):** [`scripts/tradicao/model-choice.json`](../../scripts/tradicao/model-choice.json)  
**Artefatos medidos:** [`experiments/rag/eval/runs/local_extractor_20.json`](../../experiments/rag/eval/runs/local_extractor_20.json) (cópia versionada) e `generated/eval/local-20-2026-11/metricas.json`  
**Testes unitários:** [`scripts/tradicao/local-eval.spec.mjs`](../../scripts/tradicao/local-eval.spec.mjs)

---

## 1. Resumo comparativo: Modelos Locais (US$ 0,00) vs. Baseline Pago (`onda1-2026-11`)

Todos os modelos foram avaliados sobre os mesmos **20 artigos** da amostra (`topic-brasil`, `topic-bruno-kreisky`, `topic-ciencia-politica`, `topic-clarin`, `topic-crise-dos-misseis-de-cuba`, `topic-direita-politica`, `topic-ferdinand-lassalle`, `topic-fidel-castro`, `topic-governo`, `topic-guerra`, `topic-hugo-chavez`, `topic-iluminismo`, `topic-leis-antissocialistas`, `topic-manifesto-comunista`, `topic-marxismo`, `topic-mexico`, `topic-partido-dos-trabalhadores`, `topic-partido-social-democrata-da-alemanha`, `topic-renascimento`, `topic-tribo`), passando exatamente pelas mesmas travas determinísticas (`guardExtraction`) e pela segunda passada de verificação (`applyVerdicts`).

| Braço / Modelo                                  | Origem / Hardware  | Artigos (`drafts`) | Falhas | Citações aceitas (`quotes`) | Citações rejeitadas | Taxa rej. citação | Relações propostas | Rejeitadas (código) | Rejeitadas (2ª passada) | Relações aceitas | Com QID (`relationsWithQid`) | Lacunas (`gaps`) | Tokens de saída |  Custo USD |
| ----------------------------------------------- | ------------------ | -----------------: | -----: | --------------------------: | ------------------: | ----------------: | -----------------: | ------------------: | ----------------------: | ---------------: | ---------------------------: | ---------------: | --------------: | ---------: |
| `qwen3-8b-local` (`qwen3:8b-q4_K_M`)            | Ollama / RTX 4060  |                 20 |      0 |                     **164** |                  43 |            26,22% |                 56 |                  44 |                       3 |            **9** |                        **9** |            **0** |          20.368 | **0,0000** |
| `gemma2-9b-local` (`gemma2:9b-instruct-q4_K_M`) | Ollama / RTX 4060  |                 20 |      0 |                     **150** |                  20 |        **13,33%** |                 41 |                  36 |                       0 |            **5** |                        **5** |            **0** |          18.026 | **0,0000** |
| `haiku-low` (`claude-haiku-5-5`)                | API paga (`onda1`) |                 20 |      0 |                         216 |                   0 |             0,00% |                 27 |                  11 |                       9 |                7 |                            6 |                0 |          45.190 |     0,0296 |
| `haiku-medium` (`claude-haiku-5-5`)             | API paga (`onda1`) |                 20 |      0 |                         262 |                   2 |             0,76% |                 37 |                  18 |                       2 |               17 |                           17 |                1 |          90.563 |     0,0410 |

---

## 2. Motivos de rejeição pelas travas (`guards.mjs`) nos modelos locais

O código garante que **0% de citações inventadas ou alvos sem sustento textual** sobrevivam no rascunho final, descartando desvios na origem:

| Motivo (`reasons`)             | `qwen3-8b-local` | `gemma2-9b-local` | O que indica                                                                                                      |
| ------------------------------ | ---------------: | ----------------: | ----------------------------------------------------------------------------------------------------------------- |
| `citacao-nao-literal`          |               42 |            **18** | Paráfrase ou omissão de caractere na cópia do trecho (`gemma2` erra menos da metade que `qwen3` na cópia literal) |
| `sem-verbo-do-tipo`            |               24 |                19 | A relação proposta não traz verbo compatível com a `nature` exigida na mesma frase da citação                     |
| `alvo-fora-da-citacao`         |                4 |                 8 | O nome do `target` não aparece literalmente dentro da citação escolhida                                           |
| `direcao-contraditoria`        |                1 |                 3 | A frase contradiz `entidade-para-alvo` / `alvo-para-entidade` declarada                                           |
| `ano-fora-da-citacao`          |                1 |                 3 | Ano declarado em `dates[].date` não consta em `dates[].quote`                                                     |
| `data-invalida`                |                2 |                 4 | Formato fora de `AAAA`, `AAAA-MM` ou `AAAA-MM-DD`                                                                 |
| `citacao-longa`                |                1 |                 2 | Trecho acima de 300 caracteres                                                                                    |
| `campo-cortado-na-frase`       |                1 |                 0 | Corte sintático fora da frase                                                                                     |
| `segunda-passada:inverte`      |                2 |                 0 | Revisor local detectou inversão sujeito/objeto                                                                    |
| `segunda-passada:nao-sustenta` |                1 |                 0 | Revisor local rejeitou sustento textual da relação                                                                |

---

## 3. Arquitetura de validação local (`JSON Schema` + `GLiNER` + `guards.mjs`)

1. **Saída estruturada via Ollama JSON Schema (`LOCAL_EXTRACT_JSON_SCHEMA` e `LOCAL_VERIFY_JSON_SCHEMA`):** restringe enumerações (`sectionKinds`, `relationNatures`, `relationDirections`, `verdicts`) e garante arrays `string[]` em `glossary`, eliminando erros de esquema com orçamento compacto (`numCtx: 4096`, `numPredict: 2048` na extração, `keep_alive: '10m'` em GPU de 8 GB VRAM).
2. **Detecção local de entidades com `GLiNER` (`urchade/gliner_multi-v2.1`):** complementar à conferência determinística na ingestão de fontes públicas (`public_sources.py`), permitindo extrair entidades históricas e políticas antes da etapa de consolidação em fila humana.
3. **Barreira determinística (`guards.mjs`):** toda saída local passa por `guardExtraction` (`includesNormalized`, checagem de verbo do tipo, presença literal do alvo na frase e limites de comprimento) e por `applyVerdicts`, garantindo integridade editorial idêntica ao fluxo pago antes de qualquer fila humana (`ok: null`).

---

## 4. Conclusão prática para operação com saldo reduzido

- **Superou o `haiku-low` pago em relações aceitas com QID a custo zero:** `qwen3:8b-q4_K_M` produziu **9 relações aceitas** (`9` com QID, `0` gaps) contra **7** (`6` com QID) do `haiku-low` (US$ 0,0296/20 artigos), com `164` citações validadas (`100%` conferidas contra o artigo).
- **Complementaridade entre os dois modelos locais:** `gemma2:9b-instruct-q4_K_M` teve a **menor taxa de erro de cópia literal entre os modelos locais** (**13,33%** contra **26,22%** do `qwen3:8b`), sendo candidato natural para extração conservadora de texto/citação e revisão cruzada, enquanto `qwen3:8b` obteve maior cobertura de relações aceitas (**9** vs. **5**).
- **Uso em produção de pesquisa (offline):** a dupla local permite filtrar, prototipar e enriquecer rascunhos em lote **a US$ 0,00**, reservando chamadas pagas de `claude-haiku-5-5 medium` + `claude-sonnet-5-5 low` apenas para os verbetes onde a cobertura local ainda deixar lacunas.
