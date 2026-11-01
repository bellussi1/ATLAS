# Validação da ingestão reproduzível

Execução local em 01/11/2026, Windows, Node `24.13.0`, npm `11.6.2`. Base do trabalho: commit `8303a92`. A implementação é da fase 1 solicitada; não executa shards, índices de build ou novas rotas.

## Aquisição real e reprodução

Foram executados:

```powershell
npm run ingest:liberalism -- --capture scripts/ingestion/wikimedia/raw/liberalism/2026-11-01 --output output/ingestion/liberalism-v1.json
npm run ingest:marxism -- --capture scripts/ingestion/wikimedia/raw/marxism/2026-11-01 --output output/ingestion/marxism-v1.json
npm run ingest:verify
npm run ingest:liberalism -- --offline scripts/ingestion/wikimedia/raw/liberalism/2026-11-01 --output output/ingestion/liberalism-offline.json
npm run ingest:marxism -- --offline scripts/ingestion/wikimedia/raw/marxism/2026-11-01 --output output/ingestion/marxism-offline.json
```

| Captura versionada | Registros processados | Respostas arquivadas | Bytes dos corpos brutos | SHA-256 do resultado |
| --- | --- | --- | --- | --- |
| Liberalismo, 2026-11-01 | 14 | 15 | 1.661.986 | `dbadcc57891886d102fd9283e43d7ec785b83bcada2a770446fd504273d69031` |
| Marxismo, 2026-11-01 | 23 | 24 | 3.210.355 | `7c62a367add2ba09f508caebcd2baab685c8622ae2e83c8647551dc7350085bb` |

Ambas partiram do grafo de entrada com SHA-256 `03eefef44c4eaef8216a92eb58e02ac119f6126c0e528aac02e483524e9db1bb`. Cada captura inclui também baseline/configuração/manifest; bytes acima não incluem esses arquivos. Mídia foi preservada, sem baixar imagens novas. As respostas são reais de Wikidata e Wikipedia; fixtures sintéticas de testes estão identificadas separadamente no código e não foram apresentadas como aquisição real.

`ingest:verify` carregou cada captura duas vezes em destinos temporários independentes, com transporte de rede e `globalThis.fetch` substituídos por funções que falham caso chamadas. Os resultados foram iguais por SHA-256 e comparação de buffers. Os comandos CLI offline também concluíram com os mesmos hashes, validando o wrapper do Liberalismo e os argumentos do Marxismo.

As saídas isoladas contêm 48 entidades globais cada, sem duplicar identidades já existentes: 78 relações no resultado Liberalismo e 67 no resultado Marxismo, incluindo vínculos anteriores preservados. Foram gerados/processados respectivamente 30 e 39 vínculos de ingestão. Esses dois resultados são derivados independentes da mesma base, não uma fusão sequencial das duas atualizações. Para atualização sequencial, capturar a segunda coleção usando o resultado validado da primeira como `--input`.

`src/content/atlas.json`, os demais snapshots publicados, `public` e os componentes Angular não foram alterados nesta fase. O diretório `output/` preexistente e suas capturas foram preservados; novos resultados de diagnóstico ficam ali. A coleta inicial provisória usada durante o desenvolvimento foi movida para `output/ingestion/provisional-liberalism-raw`, fora das capturas versionadas finais, antes da coleta definitiva.

## Testes e verificações

| Comando | Resultado observado |
| --- | --- |
| `npm run test:ingestion` | **14 testes Node passaram**, 2 arquivos |
| `npm run ingest:verify` | **2 capturas reproduzidas duas vezes**, sem rede, buffers e hashes iguais |
| `npm test` | **119 testes passaram em 24 arquivos**, execução única |
| `npm run typecheck` | **Passou**, aplicação e testes |
| `npm run lint` | **Passou**, Angular/templates, 5 testes de boundaries, Biome e Prettier |
| `npm run build` | **Passou**, 3 rotas prerenderizadas, CSP/headers gerados |
| `npm run check:links` | **Passou**, links internos de 4 HTMLs estáticos verificados |
| `npm run test:e2e` | **21 testes passaram**, 31,0s; suíte existente cobre Home/Marxismo/Liberalismo e axe nos estados previstos |
| `git diff --check` | **Passou**, sem erro de whitespace |
| `git check-attr text -- <raw/baseline.json> <raw/manifest.json>` | `text: unset`, confirmando que as capturas não sofrerão conversão de finais de linha pelo Git |
| Comparação dos blobs preparados no índice Git com os arquivos locais | **43 arquivos de captura idênticos byte a byte**, incluindo baselines e manifestos |

O build permaneceu em 337,45 kB iniciais brutos / 92,79 kB de transferência estimada pelo bundler. A pasta raw fica fora de `src/content`/`public`, sem aumentar os assets publicados.

## Casos cobertos

- Captura → replay → segundo replay com rede proibida, preservação de IDs e de claims de outra coleção.
- Corpo bruto adulterado/ausente, API com erro, configuração incompatível e tentativa de sobrescrever captura existente.
- Entrada Zod inválida e resultado gerado inválido: nem archive definitivo nem snapshot publicados.
- Destino com curadoria posterior: publicação recusada, conteúdo intacto. Destino equivalente com CRLF: aceito.
- Mesmo QID solicitado repetidamente ou com alias de ID já conhecido: um registro canônico. IDs/QIDs/tipos conflitantes: rejeição.
- ID existente ainda sem externalIds solicitado para dois QIDs: rejeição explícita, sem associação silenciosa pelo último registro.
- Aliases homônimos não geram links automaticamente. Declarações repetidas preservam todas as referências distintas em uma evidência.
- Relações fora de pending e evidências/fontes já usadas por claims editoriais preservadas durante refresh.
- Bytes de imagem licenciada capturados e reproduzidos offline com fixture sintética; colisão com arquivo local não sobrescreve mídia nem publica snapshot parcial.
- Download de imagem interrompido aborta a publicação; licença bloqueada não aciona download. Arquivos `.pending-*` são removidos nos erros exercitados.

Os testes novos foram executados inicialmente com os módulos ainda ausentes e falharam. Regressões adicionais de CRLF, atribuição de dois QIDs a um ID sem metadados e sobrescrita de evidência editorial também foram observadas falhar antes das respectivas correções e depois passaram. A revisão de implementação também corrigiu o índice de aliases para usar IDs já reconciliados e manteve a ordem original das coleções.

## Limitações reais

- Capturas iniciais reais são de metadados, com `--media preserve`. Refresh de imagens foi validado por testes de transporte/arquivos, sem alegar nova coleta real de Commons nesta entrega.
- A aquisição online ainda depende da rede e pode demorar por timeout/retry; a reprodução offline não depende dela. O recorte de categorias/links é limitado conforme documentado na arquitetura.
- Hashes verificam integridade e repetibilidade, não revisão historiográfica humana. Registros importados permanecem pendentes quando assim classificados.
- A proteção do destino detecta alterações entre a captura e a publicação e revalida o conteúdo imediatamente antes do rename; não substitui controle de versão ou coordenação com um editor externo concorrente.
- Uma interrupção abrupta de sistema pode deixar novas mídias órfãs ou staging. O grafo é substituído atomicamente; a implementação não apaga ativos antigos para limpar esses resíduos.
- Node emite aviso informativo `MODULE_TYPELESS_PACKAGE_JSON` ao importar o contrato TS existente; não houve falha por esse aviso. O tipo global de módulo da aplicação não foi alterado.
- Integração no YAML do CI foi implementada; os comandos foram executados localmente. Não foi disparado workflow remoto, push, merge ou deploy.

Procedimentos e contratos: [Ingestão reproduzível](../architecture/INGESTAO-REPRODUZIVEL.md).
