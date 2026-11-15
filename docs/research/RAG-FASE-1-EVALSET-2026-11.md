# RAG ATLAS — Fase 1: Conjunto de Avaliação e Fila Humana (2026-11)

**Status:** concluída em modo rascunho programático (`human_ok: null` em 100/100 itens; aguardando revisão humana).  
**Gerador:** `experiments/rag/src/atlas_rag/eval/dataset.py`  
**Artefatos gerados:**
- `experiments/rag/eval/questions.jsonl` (100 perguntas estratificadas)
- `experiments/rag/eval/labels/questions-context.json` (metadados de ponte editorial, links de descoberta e keywords OOV)
- `experiments/rag/eval/labels/review-queue.md` (tabela de conferência para revisão humana)
- `experiments/rag/eval/runs/phase1_evalset.json` (métricas e contagens versionadas desta fase)  
**Testes automatizados:** `experiments/rag/tests/test_phase1_evalset.py` (`3 passed in 1.28s`)

---

## 1. Regra de integridade e licença

- Conforme `AGENTS.md`, **revisão por IA não substitui revisão humana**. Todos os 100 registros em `questions.jsonl` mantêm explicitamente `"human_ok": null`, e `phase1_evalset.json` registra `"human_ok_true_count": 0`.
- Os itens reaproveitados de `docs/research/gold-set-2026-11/` (`afirmacoes.json`: 40 itens, `pares-fonte-afirmacao.json`: 20 itens, `relacoes.json`: 87 itens) permaneciam integralmente com `"ok": null` no momento da execução.
- Como o conjunto deriva de afirmações do acervo ATLAS (CC BY-SA 4.0), o arquivo `questions.jsonl` herda licença CC BY-SA 4.0.

---

## 2. Distribuição estratificada medida (`phase1_evalset.json`)

Bundle de origem: release `5923d2eb4fda57c52c6e35224a1eac60e162748274b214e651ed14aab9bd0344` (`0076d24e013b...`).

| Tipo (`type`) | `dev` (70%) | `test` (30%) | Total | Recusa esperada (`must_refuse`) | Função no benchmark |
| --- | ---: | ---: | ---: | --- | --- |
| `factual` | 17 | 7 | 24 | Não | Fatos documentados e teses atribuídas pontuais (inclui 9 itens reaproveitados do `gold-set-2026-11`) |
| `multi_hop` | 13 | 5 | 18 | Não | Síntese em dois saltos exigindo recuperar afirmações de `from` e `to` ligadas por relação editorial tipada |
| `comparativa` | 10 | 4 | 14 | Não | Contraste entre dois pensadores, correntes, obras ou períodos do acervo (Brasil e mundo) |
| `contestada` | 11 | 5 | 16 | Não | Afirmações explicitamente marcadas como `contested-claim` no bundle; resposta deve preservar dissenso |
| `so_link_de_descoberta` | 10 | 4 | 14 | Sim | Pares ligados **exclusivamente** por `encyclopedic-link` (navegação); sistema não pode inventar influência causal |
| `sem_resposta` | 9 | 5 | 14 | Sim | Temas históricos/econômicos verificados com **0 ocorrências** nos textos do bundle (`gold_unit_ids: []`) |
| **Total** | **70** | **30** | **100** | **28 recusas / 72 respostas** | — |

Itens com `reused_from_gold_set: true`: **13** perguntas derivam diretamente de entradas em `docs/research/gold-set-2026-11/`.

---

## 3. Verificações automáticas de validade (o que já está garantido em código)

Antes de gravar `questions.jsonl`, `validate_specs()` verifica contra o bundle pinado:

1. **Existência e texto não vazio:** todos os `gold_unit_ids` das 86 perguntas não-OOV existem em `corpus.claims` e possuem `text` preenchido.
2. **Coerência epistêmica (`contestada`):** todos os 16 `gold_unit_ids` desse tipo possuem exatamente `classification == "contested-claim"`.
3. **Pontes editoriais (`multi_hop`):** todas as `bridge_relation_ids` registradas existem no bundle e pertencem ao estrato `editorial` (`classify_relation_tier == "editorial"`).
4. **Isolamento estrito de descoberta (`so_link_de_descoberta`):** para os 14 pares `(A, B)`:
   - a relação declarada tem `type == "encyclopedic-link"`;
   - não existe qualquer relação `editorial` ou `catalog` entre `A` e `B`;
   - nenhum token significativo do título de `A` aparece em resumo, parágrafos ou afirmações de `B` (e vice-versa).
5. **Ausência real no corpus (`sem_resposta`):** todas as palavras-chave alvo das 14 perguntas têm 0 ocorrências no texto completo normalizado (NFD) de entidades, resumos, parágrafos e afirmações. Durante a validação inicial, o gerador detectou e rejeitou automaticamente colisões reais em temas como `Revolução dos Cravos`, `Restauração Meiji` e `Revolta da Vacina` (que possuíam menções no acervo), substituindo-os por temas com 0 ocorrências verificadas (`Doutrina Drago`, `Zollverein`, `Lei das Doze Tábuas`).

---

## 4. Próximo passo para validação humana e transição

- **Para o mantenedor (quando disponível):** revisar `experiments/rag/eval/labels/review-queue.md`, ajustar enunciados/gold e preencher `"human_ok": true|false` em `questions.jsonl`. O split `test` (30 itens) permanece isolado da calibração nas fases seguintes.
- **Execução autônoma seguinte (Fase 2):** indexar `claim_enriched`, `claim_raw`, `paragraph_enriched` e `entity_enriched` com `BAAI/bge-m3` em GPU (`RTX 4060`, `fp16`), construir índices `lexical_current_strict`, `lexical_claims` e `BM25`, e rodar o benchmark completo com `BAAI/bge-reranker-v2-m3` e intervalos bootstrap.
