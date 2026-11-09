Status: resultado
Última verificação: 09/11/2026

# Navegação do conteúdo — 09/11/2026

Medição e otimização do grafo direto → acervo, onde o `ContentRepository` trocava o
`networkBundle` pelo bundle completo.

## Achados

- Bundle completo: **28.620.901 bytes** (3,9 MB codificados); `networkBundle`: 836 KB codificados.
- Grafo direto → acervo custava **1.467 ms** e baixava o bundle de novo.
- `TextEncoder` (166 ms) + SHA-256 (30 ms) + `JSON.parse` (129 ms) = ~325 ms de main thread.
- O chunk lazy do acervo é 10 KB/46 ms; não é o gargalo.
- Na leitura, as imagens de capa (3,1 MB + várias de 100–436 KB) dominam a primeira visita;
  a repetição cai de 2,1 s para 0,84–1,25 s.

## Mudança

- Prefetch do bundle em `requestIdleCallback` depois do grafo, com gate para `saveData`, 2G/3G e
  `deviceMemory` < 8 GB.
- Reuso da mesma promessa quando o acervo pede o bundle.
- Liberação do texto do bundle/network após o parse.
- Token `CONTENT_PREFETCH` para desligar em testes e fixtures.

## Resultado

- Grafo direto → acervo: **1.467 ms → 491–657 ms**; nenhuma requisição de conteúdo na transição.
- Custo restante: ~170–220 ms de encode/hash/parse, além do render.
- Testes: 364/364; lint/typecheck exit 0; build 1.221 páginas; e2e do grafo 23/23, acervo 22/22,
  páginas 1/1; `test:content` 188/188.

Relatório completo em [`docs/quality/NAVEGACAO-2026-11.md`](../../quality/NAVEGACAO-2026-11.md).

## Próximo

- Buscar `arraybuffer` e hashear os bytes antes de decodificar, eliminando o `TextEncoder`.
- Dividir o pacote por rota se a primeira carga continuar crítica.
- Atacar as imagens de capa da leitura.
