# RAG ATLAS — Fase 1: Conjunto de Avaliação e Fila Humana (2026-11)

**Status:** revisão humana inicial aplicada pelo mantenedor em 15/11/2026 (`74 true`, `9 false`, `17 null` em `questions.jsonl`; `nota_revisao` preservada em todos os 100 itens).  
**Gerador:** `experiments/rag/src/atlas_rag/eval/dataset.py` (`MAINTAINER_REVIEW_2026_11`)  
**Artefatos gerados:**

- `experiments/rag/eval/questions.jsonl` (100 perguntas estratificadas com `human_ok` e `nota_revisao`)
- `experiments/rag/eval/labels/questions-context.json` (metadados de ponte editorial, links de descoberta e keywords OOV)
- `experiments/rag/eval/labels/review-queue.md` (tabela de conferência com `human_ok` e notas de revisão)
- `experiments/rag/eval/runs/phase1_evalset.json` (métricas e contagens versionadas desta fase)  
  **Testes automatizados:** `experiments/rag/tests/test_phase1_evalset.py` (`3 passed in 1.22s`)

---

## 1. Regra de integridade e licença

- Conforme `AGENTS.md`, **revisão por IA não substitui revisão humana**. Apenas os julgamentos fornecidos explicitamente pelo mantenedor foram aplicados em `"human_ok"` (`74 true`, `9 false`, `17 null`). Os 17 itens com `"human_ok": null` permanecem em aberto aguardando decisão humana após conferência no bundle abaixo.
- Os itens reaproveitados de `docs/research/gold-set-2026-11/` (`afirmacoes.json`: 40 itens, `pares-fonte-afirmacao.json`: 20 itens, `relacoes.json`: 87 itens) permaneciam com `"ok": null` na origem; sua marcação aqui reflete apenas as 100 perguntas revisadas pelo mantenedor.
- Como o conjunto deriva de afirmações do acervo ATLAS (CC BY-SA 4.0), o arquivo `questions.jsonl` herda licença CC BY-SA 4.0.

---

## 1.1 Síntese da revisão do mantenedor e conferência no bundle pinado (`5923d2e…`)

Contagens medidas em `phase1_evalset.json`: `human_ok_true_count = 74`, `human_ok_false_count = 9`, `human_ok_null_count = 17` (`total = 100`).

Conferência automática do texto exato no bundle pinado (`0076d24e013b…`, `11.145` afirmações) para os itens sinalizados na revisão (sem alterar `human_ok: null` sem decisão humana):

| ID                                                                                        | `human_ok` | Nota / dúvida do mantenedor                                                                   | Verificação observada no bundle (`claims` / `search`)                                                                                                                                                               |
| ----------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `q-fac-001`                                                                               | `true`     | Conferir qual data de batismo o claim usa                                                     | `"Smith nasceu em Kirkcaldy, em Fife, e foi batizado em 5 de junho de 1723"` (usa 5/06, juliano)                                                                                                                    |
| `q-fac-005`                                                                               | `null`     | Depende do texto exato do claim (`liberalismo verde`)                                         | `"O termo liberalismo verde foi introduzido em estudos acadêmicos pelo filósofo político Marcel Wissenburg."`                                                                                                       |
| `q-fac-006`                                                                               | `false`    | `expected_epistemic` deveria ser `documented-fact`                                            | Claim no bundle está com `classification: "attributed-thesis"` ("Otto von Bismarck")                                                                                                                                |
| `q-fac-007`                                                                               | `null`     | Ambiguidade entre períodos de proscrição do PC do Chile                                       | Claim fixa exatamente: `"Entre 1932 e 1957 o partido esteve proibido de participar das eleições com o seu nome."`                                                                                                   |
| `q-fac-009`                                                                               | `null`     | `em que ano` só funciona se o claim fixar um ano                                              | Claim fixa exatamente: `"Trótski formulou a teoria da revolução permanente. (1905)."`                                                                                                                               |
| `q-fac-013`                                                                               | `null`     | Lisboa (jun/1979) vs. ABI/PTB (1980)                                                          | Claim fixa exatamente: `"Fundação do PDT na sede da ABI, no Rio de Janeiro. (1980-05-26)."`                                                                                                                         |
| `q-fac-021`                                                                               | `null`     | Primeiro uso do termo `liberalismo social`                                                    | Claim diz exatamente: `"O termo liberalismo social foi usado pela primeira vez em 1891 pelo economista e jornalista austro-húngaro Theodor Hertzka."`                                                               |
| `q-mh-003`                                                                                | `true`     | Conferir se socialismo liberal cita Bernstein explicitamente                                  | `claim-wiki-ideology-liberal-socialism-001` **não** cita Bernstein nominalmente (trata de livre mercado e monopólios); a ponte vem de `eduard-bernstein-001`                                                        |
| `q-mh-004`                                                                                | `true`     | Conferir se `rousseau-001` sustenta a ligação                                                 | `rousseau-001` atribui soberania ao povo e participação direta, sem citar Locke pelo nome no texto do claim                                                                                                         |
| `q-mh-006`                                                                                | `false`    | Erro factual Romênia / Guerra Sérvio-Otomana                                                  | Confirmado: `guerra-servio-otomana-1876-1878-001` cita apenas Sérvia e Montenegro (sem Romênia)                                                                                                                     |
| `q-mh-010`, `q-mh-018`, `q-cmp-010`, `q-cmp-014`, `q-cnt-013`, `q-disc-006`, `q-disc-013` | `false`    | Erros factuais, premissa enviesada, epistêmica ou relação real ignorada                       | Mantidos com os mesmos IDs em `questions.jsonl` para preservar chaves de junção do benchmark Fase 2/3, filtráveis via `human_ok: false`                                                                             |
| `q-cmp-002`                                                                               | `null`     | Confirmar se `social-democracia-001` e `kautsky-001` tratam de determinismo/marxismo ortodoxo | Ambos tratam diretamente do contraste (`social-democracia-001` contrasta explicitamente com o marxismo ortodoxo e determinismo; `kautsky-001` trata de evolução histórica e ação política consciente)               |
| `q-cnt-014`                                                                               | `null`     | Confirmar se `revolucao-russa-001` registra divergência Lenin/Trótski                         | Sim: `"Historiadores divergem sobre o papel de Lenin e de Trótski na execução da Revolução de Outubro; há quem atribua a direção da insurreição a Trótski."` (`contested-claim`)                                    |
| `q-disc-001`                                                                              | `null`     | Verificar se o acervo documenta Kant/Smith além de link                                       | **0 afirmações** (`claims`) ligam Kant a Smith; `kant` só aparece em texto de contexto/descoberta em `person-adam-smith`                                                                                            |
| `q-disc-005`                                                                              | `null`     | Verificar se algum claim liga Kautsky e Gramsci                                               | **0 afirmações** ligam Kautsky a Gramsci no bundle (apenas texto de navegação/descoberta e leitura `marxismo`)                                                                                                      |
| `q-oov-004/005/006/008/011/012/014`                                                       | `null`     | Risco de ocorrência no bundle                                                                 | Confirmado: **`0` ocorrências** no bundle inteiro para todos os 7 pares de palavras-chave                                                                                                                           |
| `q-oov-009`                                                                               | `null`     | Risco de o liberalismo citar a Magna Carta                                                    | **`2` ocorrências** no texto bruto do bundle (apenas em `wiki-topic-estado-de-direito`, prosa: `"No Reino Unido, o princípio remonta à Magna Carta de 1215..."`; **`0` afirmações** e `0` menções a João Sem Terra) |

---

## 2. Distribuição estratificada medida (`phase1_evalset.json`)

Bundle de origem: release `5923d2eb4fda57c52c6e35224a1eac60e162748274b214e651ed14aab9bd0344` (`0076d24e013b...`).

| Tipo (`type`)           | `dev` (70%) | `test` (30%) |   Total | Recusa esperada (`must_refuse`) | Função no benchmark                                                                                               |
| ----------------------- | ----------: | -----------: | ------: | ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `factual`               |          17 |            7 |      24 | Não                             | Fatos documentados e teses atribuídas pontuais (inclui 9 itens reaproveitados do `gold-set-2026-11`)              |
| `multi_hop`             |          13 |            5 |      18 | Não                             | Síntese em dois saltos exigindo recuperar afirmações de `from` e `to` ligadas por relação editorial tipada        |
| `comparativa`           |          10 |            4 |      14 | Não                             | Contraste entre dois pensadores, correntes, obras ou períodos do acervo (Brasil e mundo)                          |
| `contestada`            |          11 |            5 |      16 | Não                             | Afirmações explicitamente marcadas como `contested-claim` no bundle; resposta deve preservar dissenso             |
| `so_link_de_descoberta` |          10 |            4 |      14 | Sim                             | Pares ligados **exclusivamente** por `encyclopedic-link` (navegação); sistema não pode inventar influência causal |
| `sem_resposta`          |           9 |            5 |      14 | Sim                             | Temas históricos/econômicos verificados com **0 ocorrências** nos textos do bundle (`gold_unit_ids: []`)          |
| **Total**               |      **70** |       **30** | **100** | **28 recusas / 72 respostas**   | —                                                                                                                 |

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
