Status: resultado
Última verificação: 09/11/2026

# Tipos, escopo e peso das relações — 09/11/2026

Rodada de qualidade do acervo depois da simplificação do `/acervo` (PR #65).

## Entregue

- **35 tipos corrigidos** a partir de `docs/research/auditoria-verbetes-2026-11/tipos-candidatos.tsv`; com as 18 correções de lugares já aplicadas, os **54 candidatos de alta confiança** ficaram resolvidos.
- Campo **`scope`** (`nucleo`, `contexto`, `fora`) no contrato da entidade, no índice de busca e no grafo; filtro no acervo (`escopo=`) e no grafo, sem apagar nenhum registro.
- **20 registros fora** e **36 de contexto** aplicados; 1.134 no núcleo. Nos 928 verbetes citados: 872/36/20.
- **Peso das relações** (`historical`, `action`, `administrative`, `catalog`) derivado de tipo e rótulo em `relationWeightOf`. Histórico e ação contam como relevância política; administrativo e catálogo ficam como contexto.
- O painel do grafo mostra “X conexões no acervo · Y de peso histórico ou de ação”; cada ligação exibe o peso e as políticas aparecem primeiro.
- Reauditoria em `docs/research/auditoria-verbetes-2026-11/reauditoria-2026-11.md`: **0 de 54** tipos divergentes e **150/342/417/213** relações por peso em `atlas-verbetes-citados`, reproduzindo a auditoria anterior; no grafo completo, **267/432/455/426** de 1.580.

## Revisão de escopo

- Os **20 fora** foram confirmados: 16 sem relação e 4 só com vínculo de criação (`escreveu`). Nenhum promovido, nenhum apagado.
- Os **36 contextos** foram confirmados: 11 sem relação e 25 com ao menos uma. Nenhum promovido a núcleo.
- Restam **28** itens da estimativa de ~64 contextos; `UNESCO`, `FAO`, `OIT` e `OMS` estão no TSV mas não existem no grafo.
- **Empirismo** continua `institution`; fica para a próxima passada de tipos.

## Publicação e deploy

- Release **`7a4b972`** publicado no R2 com as coleções de tipos e escopo; ponteiro e manifesto atualizados.
- PR **#70** (tipos e escopo) em **`378d93d`** e PR **#71** (peso das relações) em **`5494439`**, ambos com `deploy-pages` concluído.
- O deployment **`3adcc00f`** responde com o peso das relações; o alias `atlas-bellussi.pages.dev` ficou temporariamente no deployment anterior (`d165eeb9`) e precisa ser confirmado depois da republicação.

## Verificações

- `npm test`: 363/363
- `npm run test:content`: 188/188
- `npm run lint`, `npm run typecheck`: exit 0
- `npm run build`: 1.221 páginas
- e2e do grafo: 23/23
- e2e do acervo: 21/21
- e2e de páginas (paginação): 1/1
- No CI, um teste de diálogo flutuou (altura 976 contra 1000) e passou no rerun; a suíte completa ficou 172/172.

## Pendente

- Extração paga do piloto nazismo/stalinismo/trabalhismo: **~US$ 2,00** (pior caso **US$ 3,81**), aguardando aprovação. Nenhum gasto novo nesta rodada.
- Revisar os 28 contextos restantes e corrigir o tipo de `Empirismo`.
