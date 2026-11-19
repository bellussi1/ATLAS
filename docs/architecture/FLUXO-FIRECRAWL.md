Status: atual
Última verificação: 19/11/2026

# Fluxo Firecrawl Local + RAG

Pipeline local de captura de fontes públicas, indexação semântica e preparação de rascunhos para o acervo do ATLAS. Ele **não publica**: tudo que sai daqui é corpus local, fila de evidências ou rascunho marcado para revisão humana.

## Portas de saída

| Etapa | Produz | Nunca faz |
|---|---|---|
| Descoberta | candidatos em `generated/firecrawl-discovery/candidates.json` e seeds `review: "pending"` | não altera conteúdo publicado |
| Extração | Markdown + metadados em `generated/firecrawl-corpus/` | não envia tráfego ao Firecrawl Cloud |
| Indexação | `experiments/rag/data/index/firecrawl_corpus/` | não chama LLM remoto |
| Lacunas | `experiments/rag/eval/queues/firecrawl-lacunas-evidencias.json` (`ok: null`) | não cria relação no grafo |
| Rascunhos | `experiments/rag/eval/queues/enrichment-drafts/*.json` (`ok: null`, `[conferência de IA]`) | não grava em `content/graph/` nem em `published-ideologies.ts` |

A publicação do release (`npm run content:publish`) e a entrada em `content/graph/` continuam decisão humana.

## 1. Descoberta

```bash
npm run firecrawl:discover -- --topic marxismo --limit 120
npm run firecrawl:discover -- --topic golpe-de-1964 --apply --min-score 70 --apply-limit 12
```

`scripts/ingestion/firecrawl/topics.json` declara tema, domínio editorial, artigo-âncora, categorias e QIDs. A descoberta usa três camadas:

- **Wikipédia (pt/en):** membros de categoria e links diretos do artigo-âncora, com metadados de tamanho, URL canônica e `wikibase_item`.
- **Wikidata:** rótulos `P1142`, `P921` e `P279` convertidos em artigos com sitelink; `P31` filtra pessoa, obra, organização, evento e ideologia.
- **Marxists Internet Archive:** links de índice (`/index.htm`) do domínio público do arquivo, sempre como `reference-only`.

O acesso à Wikimedia passa por `scripts/ingestion/wikimedia/client.mjs`, que limita a taxa, repete 429/502/503/504 e só aceita hosts permitidos. Candidatos recebem score de triagem: categoria (35), link direto (25), rótulo isolado do Wikidata (20), artigo longo (até 15) e artigo curto (até −15).

`--apply` só acrescenta seeds com score acima de `--min-score`, sem duplicar URL, com `origin: "discovery"`, `review: "pending"` e `discoveredFrom`. O `seeds.json` curado nunca é reescrito além do append.

## 2. Extração

```bash
npm run firecrawl:extract                    # corpus inteiro, ignorando o que já está em disco
npm run firecrawl:extract -- --slug wiki-pt-marxismo --slug mia-gramsci-pt
```

Cada item grava Markdown, `status`, `scrapedAt`, `bytes`, `wordCount`, `sha256`, título e cabeçalhos. Lotes parciais mesclam o manifesto com o que já existia, em vez de apagar o corpus. O binário `firecrawl-local` roda com `FIRECRAWL_CLOUD=off`; a API local é usada quando disponível, com fallback para o CLI `--public-only`.

## 3. Indexação incremental

```bash
npm run rag:ingest-firecrawl
```

O chunking respeita cabeçalhos, descarta bibliografia/índice e remove trechos com injeção de prompt. Os vetores `BAAI/bge-m3` são comparados por `unit_id` + `sha256` do documento: documento inalterado reaproveita o vetor salvo, documento novo ou editado embeda apenas os chunks afetados. Sem mudança, o modelo não é carregado na GPU.

Medição de 19/11/2026, após a primeira rodada de descoberta: `106` documentos, `5.330` chunks, `5.187` vetores reaproveitados e `143` embeddados em `2,37 s` na RTX 4060.

## 4. Lacunas e rascunhos

```bash
npm run rag:mine-firecrawl-gaps
npm run enrich:once
npm run enrich:watch     # ciclo contínuo a cada 180 min
```

O ciclo completo é: descoberta → extração → indexação incremental → fila de lacunas → rascunhos Ollama (`qwen3:8b-q4_K_M` por padrão). Cada rascunho traz entidade, afirmações e relações, mas toda `source_url` precisa existir entre as fontes recuperadas; o que não estiver grounded é descartado antes de gravar.

`enrich:watch` mantém o processo local e registra `generated/firecrawl-loop/state.json` e `history.jsonl` a cada ciclo. `Ctrl+C` preserva o último estado. O intervalo e o volume por ciclo são parâmetros explícitos:

```bash
npm run enrich:watch -- --interval-minutes 180 --max-new-seeds 12 --min-score 70 --max-drafts 3
```

## Licenças e proveniência

| Fonte | Licença registrada | Política |
|---|---|---|
| Wikipédia pt/en | CC BY-SA 4.0 | `open-reuse` |
| Documentos oficiais brasileiros | domínio público | `open-reuse` |
| Marxists Internet Archive | copyright do arquivo | `reference-only` |
| SEP / IEP | copyright dos editores | `reference-only` |

`open-reuse` permite guardar trecho literal para citação; `reference-only` guarda referência, seção e um lead curto. A licença e a política ficam no metadado de cada chunk e são exibidas nas buscas (`rag:search`).

## Limites conhecidos

- A qualidade de um candidato é uma pista, não revisão editorial. Rótulos do Wikidata e categorias da Wikipédia não provam pertencimento nem influência.
- O corpus é local e não entra no build Angular enquanto não houver decisão editorial.
- Não há agendador embutido no repositório; o processo contínuo é um comando local. Desligar a máquina interrompe o ciclo.
- Imagens e mídia do Wikimedia Commons continuam no pipeline `scripts/ingestion/wikimedia`; o Firecrawl cobre texto.
- Rascunhos com `ok: null` exigem revisão humana antes de qualquer promoção para `content/graph/`.
