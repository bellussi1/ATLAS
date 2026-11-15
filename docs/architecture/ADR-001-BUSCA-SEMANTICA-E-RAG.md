# ADR-001: Estratégia de Busca Semântica e RAG no ATLAS

- **Status:** proposta (aguardando validação humana pós-avaliação do `questions.jsonl`)
- **Data:** 15/11/2026
- **Contexto relacionado:** `docs/ACTIVE_CONTEXT.md`, `experiments/rag/`, `docs/research/RAG-FASE-2-RECUPERACAO-2026-11.md`, `docs/research/RAG-FASE-4-GRAFO-2026-11.md`

---

## 1. Contexto e evidências medidas

O ATLAS é uma aplicação **static-first** (Angular 21 com prerender estático no Cloudflare Pages + objetos imutáveis em Cloudflare R2 apontados por `pointer.json`). Conforme registrado em `docs/ACTIVE_CONTEXT.md`:

- O bundle completo publicado (`release 5923d2e…`, `1.224` entidades, `11.145` afirmações, `1.629` relações) possui `29,78 MB` crus (~`2,79–3,15 MB` em brotli) e já possui pendência de redução de payload inicial (`#88`).
- O Worker de conteúdo gratuito já ultrapassou o limite diário de `100 mil` requisições/dia (`186.096` no alerta).
- Nos benchmarks da Fase 2 (`experiments/rag/eval/runs/phase2_retrieval/metrics.json`, `n=86` perguntas respondíveis em linguagem natural):
  - Equivalente à busca atual (`lexical_current_strict`, `AND` estrito sobre `searchText` de verbete): **`Recall@10 = 0,0000`**.
  - BM25 sobre afirmações enriquecidas (`bm25_claims`): **`Recall@10 = 0,7442`**, **`MRR@10 = 0,6836`** (`28,752 ms/consulta` em Python puro, sem GPU).
  - Híbrido + reranker (`hybrid_rerank_top20_b16` com `BAAI/bge-m3` + `bge-reranker-v2-m3` FP16): **`Recall@10 = 0,8488`**, **`MRR@10 = 0,7693`** (`125,36 ms/consulta` em GPU RTX 4060).
  - Expansão em grafo editorial (`hybrid_rerank__editorial_only`, Fase 4): elevou `overall Recall@10` para **`0,8663`** e `multi_hop Recall@10` de `0,6667` para **`0,8056`**.
- Armazenamento vetorial medido para `11.145` afirmações em `BAAI/bge-m3` (`1024` dimensões, FP16): `vectors.npy` = `22.825.088` bytes (~`21,8 MiB`) e `units.jsonl` = `14.987.557` bytes (~`14,3 MiB`).

---

## 2. Opções avaliadas (Fase 6)

### Opção A — Índice pré-computado no R2 (`c/<sha256>`) + embedding de consulta no navegador
- **Prós:** preserva entrega estática no R2 sem novo servidor nem custo por consulta.
- **Contras mensurados:** exigir que o navegador carregue um embedder multilíngue quantizado pequeno (ex.: `intfloat/multilingual-e5-small` via ONNX/Transformers.js) adiciona **`~118 MB` de pesos (`model_quantized.onnx` / `int8`) + `~22 MB` de tokenizers** (além da matriz de vetores em R2 — `~8,6 MB` em 384d FP16 ou `~21,8 MiB` em 1024d FP16). É incompatível com navegação mobile e com a meta de reduzir o peso de carga do `/acervo` e das leituras.

### Opção B — Cloudflare Worker + Workers AI / Vectorize (apenas busca de trechos citados)
- **Prós:** zero download de modelo ONNX no cliente; latência baixa em edge; permite servir trechos citados sem geração de texto por LLM.
- **Contras e limites verificados:**
  1. **Capacidade Vectorize Free Tier:** limita-se a `5M` dimensões armazenadas e `30M` consultadas/mês. Um índice de `11.145` afirmações em `1024` dimensões (`bge-m3`) soma **`11.412.480` dimensões** (acima do plano gratuito); apenas um modelo `384d` (`~4,28M` dimensões) caberia inicialmente no free tier, sem margem para crescimento do acervo.
  2. **Workers AI Free Tier:** limite de `10.000 Neurons/dia` para embeddar consultas.
  3. **Pressão existente no Worker:** como o Worker atual já superou o limite gratuito diário (`186.096` requisições), qualquer endpoint adicional exigiria **Workers Paid (`US$ 5/mês` base)**, rate limit por IP e controle de abuso antes de ir ao ar.

### Opção C — Manter RAG/Semântico fora do site público (CLI e pesquisa) + melhoria lexical zero-peso no cliente (Recomendada agora)
- **Decisão:**
  1. **NÃO integrar busca vetorial por ONNX em browser nem geração LLM ao vivo no site público.**
  2. **NÃO gerar respostas sintetizadas por IA no site público:** preserva diretamente a regra editorial de *não apresentar opinião como fato* e evita risco de prompt injection, cota de API ou citação parcial em runtime aberto.
  3. **Evolução estática recomendada para o App Angular (backlog futuro de produto, fora deste experimento):** substituir a exigência estrita de `AND` com palavras interrogativas na busca atual (`lexical_current_strict = 0,0000`) por pontuação lexical/BM25 sobre afirmações e entidades com remoção de *stop words* no próprio cliente. Pelos dados da Fase 2 (`bm25_claims`), essa mudança não requer novo servidor, não adiciona modelo ONNX ao navegador e eleva o `Recall@10` de `0,0000` para **`0,7442`**.
  4. **Manter `experiments/rag/` (`atlas-rag`) em modo local/pesquisa:**
     - Executa indexação `bge-m3`, reranking `bge-reranker-v2-m3`, expansão `editorial_only` e geração auditada com travas duras offline.
     - Alimenta **filas de revisão humana** para ampliar o acervo (`Seção 6`: relações candidatas, contradições, deduplicação e lacunas com `ok: null`).
     - Serve de base pronta para uma eventual migração futura para a **Opção B (busca semântica retornando apenas afirmações e fontes citadas, sem geração LLM)** caso o projeto adote Workers Paid + Vectorize.

---

## 3. Consequências

- **Positivas:** custo operacional adicional de infraestrutura = **US$ 0,00**; build Angular e contrato static-first intactos; ganho potencial imediato apenas corrigindo o algoritmo lexical de busca existente.
- **Limitações aceitas:** consultas estritamente conceituais sem sobreposição de termos continuam dependentes da CLI de pesquisa `atlas-rag` até uma eventual decisão futura pela Opção B (somente recuperação de trechos citados, sujeita à validação humana prévia do conjunto de avaliação e orçamento Workers Paid).
