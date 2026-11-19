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
| Lacunas do grafo | `eval/queues/lacunas-do-grafo.json` (`ok: null`) | não altera o release |
| Relações candidatas | `relacoes-por-coocorrencia.json`, `relacoes-por-padrao.json`, `relacoes-por-embedding.json` | não cria aresta nem define família final |
| Rascunhos | `enrichment-drafts/`, `enrichment-claims/`, `relacoes-por-embedding-drafts/` (`ok: null`, `[conferência de IA]`) | não grava em `content/graph/` nem em `published-ideologies.ts` |

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

## 4. Lacunas lidas do grafo publicado

```bash
npm run rag:graph-gaps -- --limit 400
```

`graph_gaps.py` agrega as 24 coleções do release, conta relações editoriais, afirmações e fontes por entidade e classifica cada lacuna em três modos:

- `fonte`: entidade sem afirmação ou sem fonte, que precisa de nova captura;
- `conteudo`: entidade com uma ou duas afirmações, que precisa de expansão;
- `relacao`: entidade com evidência, mas com zero ou uma aresta editorial.

A fila fica em `experiments/rag/eval/queues/lacunas-do-grafo.json`, com `ok: null`. Ela substitui a lista fixa de temas como fonte de prioridade e alimenta a descoberta e a expansão.

## 5. Descoberta a partir da lacuna

```bash
npm run firecrawl:discover -- --graph --no-topics --graph-mode fonte,conteudo --graph-limit 20 --apply
```

O `discover.mjs` lê a fila, busca o título na Wikipédia pt e en, prefere o artigo com título exato e só aceita corpo acima de 1.200 caracteres. O seed fica marcado com `discoveredFrom: "graph-gap:<entityId>"`. Depois vêm `firecrawl:extract` e `rag:ingest-firecrawl`; a indexação incremental embeda só os chunks novos.

## 6. Cruzamento de relações

```bash
npm run rag:relations -- --mode coocorrencia --max-pairs 300
npm run rag:relations -- --mode padrao --max-pairs 200
npm run rag:relations -- --mode embeddings --max-pairs 250
```

- **Coocorrência:** encontra títulos de entidades no mesmo trecho do corpus, exclui pares que já têm aresta e usa a similaridade de embeddings como desempate. Entidades onipresentes são filtradas por frequência de documento.
- **Padrão lexical:** exige os dois títulos na mesma frase e um verbo relacional entre eles (`fundou`, `influenciou`, `presidiu`, `membro de`, `escreveu`, `ocorreu em`). É alta precisão e baixo recall; a frase vira citação.
- **Embeddings:** agrupa as afirmações por entidade e ranqueia vizinhos semânticos ainda sem relação.

As três filas (`relacoes-por-coocorrencia.json`, `relacoes-por-padrao.json`, `relacoes-por-embedding.json`) trazem `ok: null` e não criam aresta. Coocorrência e similaridade são pistas de pesquisa, não prova de vínculo.

Os rascunhos de relação usam o modelo local para propor família, rótulo, direção e fonte:

```bash
npm run rag:relation-drafts -- --max-drafts 5
```

Se o modelo não encontrar um trecho que sustente o vínculo, grava `relation: null` com `sources_used`. A proposta só é aceita se o campo `quote` for um trecho literal contido na passagem, nomear os dois lados e a família for compatível com os tipos (por exemplo, pessoa não "cria" um país). O resultado vai para `eval/queues/relacoes-por-embedding-drafts/`.

## 7. Expansão de afirmações

```bash
npm run rag:expand-claims -- --max-entities 3
```

Para entidades com uma ou duas afirmações, o Ollama propõe de 2 a 4 afirmações novas sobre o corpus. A validação exige URL de uma fonte recuperada, comprimento plausível, classificação permitida, ausência de duplicidade e **um trecho literal (`quote`) contido na passagem que nomeie a entidade**. URL válida sem citação literal é descartada. Entidades sem passagem relevante são puladas sem chamada de LLM. A saída fica em `eval/queues/enrichment-claims/`.

## 8. Ciclo contínuo

```bash
npm run enrich:once
npm run enrich:watch     # ciclo contínuo a cada 180 min
```

Cada ciclo executa: lacunas do grafo → descoberta (`fonte,conteudo`) → extração → indexação incremental → evidências das lacunas fixas → coocorrência → padrões → rascunhos de entidade → propostas de relação → expansão de afirmações. Limites por ciclo são explícitos:

```bash
npm run enrich:watch -- --interval-minutes 180 --max-new-seeds 12 --max-drafts 3 --max-relations 3 --max-expansions 2
```

`enrich:watch` grava `generated/firecrawl-loop/state.json` e `history.jsonl` a cada rodada. `Ctrl+C` preserva o último estado. O ciclo continua local: desligar a máquina interrompe o processo.

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
