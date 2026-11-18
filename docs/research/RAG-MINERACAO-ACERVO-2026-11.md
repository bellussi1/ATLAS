# Mineração Semântica e Expansão do Acervo — Filas de Revisão Humana (Seção 6, 2026-11)

**Status:** concluída a custo **US$ 0,00** com embeddings `BAAI/bge-m3` + reranking `BAAI/bge-reranker-v2-m3` (FP16 local).  
**Módulo:** `experiments/rag/src/atlas_rag/mining/acervo_miner.py` (`python -m atlas_rag.cli mine`)  
**Artefato de resumo:** `experiments/rag/eval/runs/phase6_mining.json`  
**Testes automatizados:** `experiments/rag/tests/test_phase6_mining.py`

> **Política editorial obrigatória:** todos os itens gerados nas filas abaixo possuem `"ok": null`, `review.by = "ai"` e `review.verdict = "pending-human"`. Nenhuma aresta, fusão ou correção entra automaticamente em `content/` sem validação humana explícita.

---

## 1. Resumo das 4 filas geradas (`phase6_mining.json`)

| Fila (`experiments/rag/eval/queues/`) | Quantidade | Critério principal | Estado de revisão |
| --- | ---: | --- | --- |
| `relacoes-candidatas.json` | **80** (`80` com entidade de origem sem aresta editorial) | Similaridade `bge-m3 ≥ 0,56`, citação literal no próprio verbete (`≥ 20` chars e `≥ 3` palavras) e reordenação com `bge-reranker-v2-m3` | `100%` com `"ok": null` |
| `debates-e-contradicoes.json` | **37** | Pares de afirmações de entidades distintas com `cosseno bge-m3 ≥ 0,72` envolvendo `contested-claim` ou contraste epistêmico | `100%` com `"ok": null` |
| `deduplicacao-entidades.json` | **6** | Entidades distintas com `cosseno bge-m3 ≥ 0,84` e sobreposição nominal não trivial (Jaccard `≥ 0,45`) | `100%` com `"ok": null` |
| `lacunas-cobertura.json` | inventário completo | Contagem de entidades órfãs/sem afirmações e saldo editorial por coleção das 4 leituras principais | diagnóstico (`ok` não aplicável) |

---

## 2. Exemplos concretos extraídos das filas

### Relações candidatas (`relacoes-candidatas.json`, top-3 por `rerank_score`)
1. `cand-rel-083`: **Antissemitismo** → **Racismo** (`documented-association`, rerank `0,9871`) — citação literal do verbete: *"O antissemitismo é uma forma de racismo."*
2. `cand-rel-077`: **Antiautoritarismo** → **Autoritarismo** (`reacted_against`, rerank `0,9841`) — citação literal: *"O antiautoritarismo é a oposição ao autoritarismo."*
3. `cand-rel-092`: **Assassínio** → **Pena de morte** (`documented-association`, rerank `0,9796`) — citação literal: *"Em alguns casos, a condenação por assassinato pode resultar em pena de morte."*

### Debates e tensões interpretativas (`debates-e-contradicoes.json`)
- Top-2 em proximidade semântica: **Movimento Democrático Brasileiro (1966)** (`contested-claim`) vs **Movimento Democrático Brasileiro (1980)** (`contested-claim`), `cosseno = 0,9159` (`debate-001`) e `0,9121` (`debate-002`).

### Deduplicação e desambiguação (`deduplicacao-entidades.json`, todos os 6 pares)
1. `dedup-001` (`0,9106`): *Aprovação da Constituição portuguesa de 1976* vs *Constituição da República Portuguesa de 1976*
2. `dedup-002` (`0,8756`): *Partido Trabalhista Brasileiro (1979)* vs *Partido Trabalhista Brasileiro (1945)* — exemplifica caso **não duplicado** (mesmo nome histórico em regimes distintos) em que o controle humano (`ok: null`) impede fusão errônea.
3. `dedup-003` (`0,8623`): *O capital: volume I* vs *O Capital*
4. `dedup-004` (`0,8572`): *Movimento Democrático Brasileiro (1966)* vs *Movimento Democrático Brasileiro (1980)*
5. `dedup-005` (`0,8456`): *Ion C. Brătianu* vs *Ion I. C. Brătianu* (pai e filho; exige preservação como pessoas distintas)
6. `dedup-006` (`0,8401`): *Reformismo (marxismo)* vs *Reformismo*

---

## 3. Lacunas de cobertura medidas no bundle (`lacunas-cobertura.json`)

- **Total de entidades deduplicadas:** `1.224`
- **Entidades sem nenhuma aresta editorial tipada (`editorial_deg == 0`):** **488**
- **Entidades com grau zero total no grafo:** **418**
- **Entidades sem nenhuma afirmação (`claims_count == 0`):** **43**

### Contagem de arestas editoriais por coleção principal no bundle (`_atlas_id`)

*(Nota metodológica: a lente de pertencimento por QID em `docs/ACTIVE_CONTEXT.md` contabiliza `42/24/34/10` nos recortes das leituras; já o inventário abaixo soma todas as relações editoriais associadas diretamente ao `_atlas_id` da coleção no bundle publicado.)*

| Coleção (`_atlas_id`) | Tradição | Editoriais no bundle | Meta registrada (`docs`) | Saldo restante | Candidatas na fila |
| --- | --- | ---: | ---: | ---: | ---: |
| `atlas-marx-valor` | `marxismo` | 67 | 70 | 3 | 7 |
| `atlas-liberalism` | `liberalismo` | 37 | 35 | 0 | 7 |
| `atlas-social-democracia` | `social-democracia` | 51 | 70 | 19 | 15 |
| `atlas-anarquismo` | `anarquismo` | 56 | 50 | 0 | 17 |
