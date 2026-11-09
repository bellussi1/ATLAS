# Navegação e carregamento do conteúdo

Status: medição antes e depois
Data: 09/11/2026

## Método

Chromium via Playwright, preview local do build de produção (brotli/gzip), viewport 1440×1000.
Cada transição foi medida do clique até o conteúdo estar visível, com:

- `PerformanceObserver` para `longtask`;
- CDP `Network.loadingFinished` para os bytes codificados dos objetos do R2;
- wrappers em `SubtleCrypto.digest`, `TextEncoder.encode` e `JSON.parse` para separar
  verificação, codificação e parse do restante da navegação.

O cache HTTP foi desativado nas medições frias. A comparação principal (grafo direto → acervo)
usa a mesma preview local antes e depois da mudança.

## Antes

Na URL publicada, antes da mudança:

| Transição | Tempo | Long tasks | Conteúdo na rede |
| --- | ---: | --- | --- |
| home → acervo | 1.893 ms | 249 + 54 ms | ponteiro + bundle |
| acervo → leitura | 2.119 ms | 410 ms | nenhum (bundle em memória) |
| leitura → grafo | 748 ms | 63 ms | nenhum |
| grafo → acervo (estado completo) | 431 ms | nenhuma | nenhum |
| acervo → leitura (repetição) | 841 ms | 58 + 161 ms | nenhum |
| leitura → grafo (repetição) | 603 ms | 51 ms | nenhum |

No cenário controlado da mudança, na preview local com cache desativado, o **grafo direto → acervo**
custava **1.467 ms**, com long tasks de 80 + 366 + 68 ms. O bundle de **28.620.901 bytes**
(3.934 KB codificados) era baixado e verificado de novo. A quebra medida nessa transição:

| Etapa | Tempo |
| --- | ---: |
| Download do bundle | 441 ms de recurso + latência |
| `TextEncoder.encode` do texto inteiro | 166 ms |
| SHA-256 | 30 ms |
| `JSON.parse` | 129 ms |
| Componente lazy do acervo | 10 KB, 46 ms |
| Render e rota | restante |

## Diagnóstico

- **O download domina a primeira carga.** O bundle completo tem 3,9 MB codificados; o
  `networkBundle` do grafo tem 836 KB. O grafo direto já baixava o segundo e, ao sair para o
  acervo, baixava o primeiro.
- **Verificação e parse custam ~325 ms** no desktop: 166 ms de codificação UTF-8, 30 ms de
  SHA-256 e 129 ms de `JSON.parse`. Não é o maior componente, mas é main thread e vira long task.
- **O chunk lazy não é o gargalo do acervo.** São 10 KB e 46 ms. Na leitura, o chunk tem 61 KB e
  372 ms, mas as imagens de capa (uma de 3,1 MB e várias de 100–436 KB) e o render respondem pela
  maior parte dos 2,1 s.
- **A resolução de rota espera o conteúdo.** Não há custo separado relevante; o resolver bloqueia
  até o grafo/bundle estar pronto.
- **A navegação subsequente é barata.** Dentro da SPA o conteúdo fica em memória; a repetição da
  leitura cai de 2,1 s para 0,84–1,25 s e as idas ao grafo ficam em 0,45–0,75 s.

## Mudança

`ContentRepository` passou a aquecer o bundle completo depois que o `networkBundle` do grafo
resolve. O prefetch:

- roda em `requestIdleCallback` (timeout de 3 s), sem competir com o desenho do grafo;
- é ignorado com `saveData`, conexão 2G/3G ou `deviceMemory` menor que 8 GB;
- reaproveita a mesma promessa quando o acervo pede o bundle, então a transição não baixa de novo;
- libera o texto do bundle e do `networkBundle` depois do parse, para não manter 34 MB de texto
  em memória.

O token `CONTENT_PREFETCH` permite desligar o aquecimento em testes e fixtures.

## Depois

Na preview local, com o prefetch:

| Transição | Tempo | Long tasks | Conteúdo na rede |
| --- | ---: | --- | --- |
| home → acervo | 1.387 ms | 218 + 60 ms | ponteiro + bundle |
| acervo → leitura | 2.037 ms | 389 ms | nenhum |
| leitura → grafo | 456 ms | nenhuma | nenhum |
| grafo → acervo (estado completo) | 685 ms | 64 ms | nenhum |
| acervo → leitura (repetição) | 1.250 ms | 146 ms | nenhum |
| leitura → grafo (repetição) | 485 ms | nenhuma | nenhum |
| **grafo direto → acervo** | **491–657 ms** | 206–224 ms | nenhum na transição |

O prefetch baixa 836 KB do `networkBundle` e 3.933–3.935 KB do bundle antes do clique. A
transição em si não faz requisição de conteúdo. A queda no grafo direto → acervo foi de
**1.467 ms para 596–657 ms com o cache desativado** e **491 ms com o cache ativo**, no mesmo
build local. As demais linhas são referência da preview, não uma comparação direta com a URL
publicada.

## Limites e próximos passos

- O prefetch gasta 3,9 MB em quem visita o grafo e nunca sai dele. O gate por conexão e memória
  reduz o risco, mas não elimina o custo em desktop.
- A carga inicial home → acervo continua pagando o bundle; o prefetch só ajuda depois do grafo.
- O custo de verificação/parse (~170–220 ms) permanece. O próximo ganho é buscar `arraybuffer`,
  hashear os bytes antes de decodificar e evitar o `TextEncoder` (medição isolada: 68–166 ms).
- Dividir o pacote por rota (busca, grafo, adjacência) reduziria a primeira carga, mas exige
  separar o contrato do `ContentPackage`.
- Na leitura, o próximo alvo são as imagens de capa e o tamanho responsivo, não o chunk.
