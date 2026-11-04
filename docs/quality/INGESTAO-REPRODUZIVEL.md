# Validação da ingestão reproduzível

Execução local em 01/11/2026, Windows, Node `24.13.0`, npm `11.6.2`. Base: commit `8303a92`. Implementa a fase 1; não executa shards, índices de build nem novas rotas.

## Aquisição real e reprodução

```powershell
npm run ingest:liberalism -- --capture scripts/ingestion/wikimedia/raw/liberalism/2026-11-01 --output output/ingestion/liberalism-v1.json
npm run ingest:marxism -- --capture scripts/ingestion/wikimedia/raw/marxism/2026-11-01 --output output/ingestion/marxism-v1.json
npm run ingest:verify
npm run ingest:liberalism -- --offline scripts/ingestion/wikimedia/raw/liberalism/2026-11-01 --output output/ingestion/liberalism-offline.json
npm run ingest:marxism -- --offline scripts/ingestion/wikimedia/raw/marxism/2026-11-01 --output output/ingestion/marxism-offline.json
```

| Captura versionada | Registros | Respostas arquivadas | Bytes brutos | SHA-256 do resultado |
|---|--:|--:|--:|---|
| Liberalismo, 2026-11-01 | 14 | 15 | 1.661.986 | `dbadcc57891886d102fd9283e43d7ec785b83bcada2a770446fd504273d69031` |
| Marxismo, 2026-11-01 | 23 | 24 | 3.210.355 | `7c62a367add2ba09f508caebcd2baab685c8622ae2e83c8647551dc7350085bb` |

- Ambas partiram do grafo de entrada com SHA-256 `03eefef44c4eaef8216a92eb58e02ac119f6126c0e528aac02e483524e9db1bb`. Cada captura também tem baseline, configuração e manifest; os bytes acima não os incluem.
- Mídia preservada, sem baixar imagens novas. As respostas são reais de Wikidata e Wikipedia; fixtures sintéticas dos testes estão identificadas no código e não são apresentadas como aquisição real.
- `ingest:verify` carregou cada captura duas vezes em destinos temporários independentes, com transporte de rede e `globalThis.fetch` substituídos por funções que falham se chamadas. Resultados iguais por SHA-256 e comparação de buffers. As CLIs offline concluíram com os mesmos hashes, validando o wrapper do Liberalismo e os argumentos do Marxismo.
- Saídas isoladas: 48 entidades globais cada, sem duplicar identidades existentes; 78 relações no resultado do Liberalismo e 67 no do Marxismo, incluindo vínculos anteriores preservados; 30 e 39 vínculos de ingestão, respectivamente. São derivados independentes da mesma base, não fusão sequencial. Para atualização sequencial, capturar a segunda coleção usando o resultado validado da primeira como `--input`.
- `src/content/atlas.json`, demais snapshots, `public` e componentes Angular sem alteração. `output/` preexistente preservado. A coleta provisória usada no desenvolvimento foi movida para `output/ingestion/provisional-liberalism-raw`, fora das capturas finais.

## Testes e verificações

| Comando | Resultado |
|---|---|
| `npm run test:ingestion` | **14 testes Node passaram**, 2 arquivos |
| `npm run ingest:verify` | **2 capturas reproduzidas duas vezes**, sem rede, buffers e hashes iguais |
| `npm test` | **119 testes em 24 arquivos** |
| `npm run typecheck` | **Passou**, aplicação e testes |
| `npm run lint` | **Passou**: Angular/templates, 5 testes de boundaries, Biome e Prettier |
| `npm run build` | **Passou**: 3 rotas prerenderizadas, CSP e headers gerados |
| `npm run check:links` | **Passou**: links internos de 4 HTMLs estáticos |
| `npm run test:e2e` | **21 testes em 31,0 s**; suíte existente cobre Home, Marxismo, Liberalismo e axe nos estados previstos |
| `git diff --check` | **Passou** |
| `git check-attr text` em `raw/baseline.json` e `raw/manifest.json` | `text: unset`: sem conversão de finais de linha pelo Git |
| Blobs preparados no índice Git × arquivos locais | **43 arquivos de captura idênticos byte a byte**, incluindo baselines e manifestos |

Build: 337,45 kB iniciais brutos e 92,79 kB estimados para transferência. A pasta raw fica fora de `src/content` e `public`, sem aumentar os assets publicados.

## Casos cobertos

- Captura → replay → segundo replay com rede proibida; preservação de IDs e de claims de outra coleção.
- Corpo bruto adulterado ou ausente; API com erro; configuração incompatível; tentativa de sobrescrever captura existente.
- Entrada Zod inválida e resultado gerado inválido: nem arquivo definitivo nem snapshot publicados.
- Destino com curadoria posterior: publicação recusada, conteúdo intacto. Destino equivalente com CRLF: aceito.
- Mesmo QID solicitado várias vezes ou com alias de ID já conhecido: um registro canônico. IDs, QIDs ou tipos conflitantes: rejeição.
- ID existente sem `externalIds` solicitado para dois QIDs: rejeição explícita, sem associação silenciosa pelo último registro.
- Aliases homônimos não geram links automáticos. Declarações repetidas preservam todas as referências distintas numa evidência.
- Relações fora de `pending` e evidências já usadas por claims editoriais preservadas no refresh.
- Bytes de imagem licenciada capturados e reproduzidos offline com fixture sintética; colisão com arquivo local não sobrescreve mídia nem publica snapshot parcial.
- Download de imagem interrompido aborta a publicação; licença bloqueada não aciona download. Arquivos `.pending-*` removidos nos erros exercitados.

Testes novos falharam antes dos módulos existirem. Regressões de CRLF, atribuição de dois QIDs a um ID sem metadados e sobrescrita de evidência editorial também falharam antes das correções e passaram depois. A revisão corrigiu o índice de aliases para usar IDs já reconciliados e manteve a ordem original das coleções.

## Limitações reais

- Capturas iniciais são de metadados, com `--media preserve`. Refresh de imagens validado por testes de transporte e arquivos, sem nova coleta real de Commons.
- A aquisição online depende da rede e pode demorar por timeout e retry; a reprodução offline não depende dela. O recorte de categorias e links é limitado, como documentado na arquitetura.
- Hashes verificam integridade e repetibilidade, não revisão historiográfica humana. Registros importados seguem pendentes quando classificados assim.
- A proteção do destino detecta alterações entre captura e publicação e revalida o conteúdo logo antes do rename; não substitui controle de versão nem coordenação com editor externo concorrente.
- Interrupção abrupta do sistema pode deixar mídias órfãs ou staging. O grafo é substituído atomicamente; ativos antigos não são apagados para limpar esses resíduos.
- Node emite o aviso informativo `MODULE_TYPELESS_PACKAGE_JSON` ao importar o contrato TS; não houve falha. O tipo global de módulo da aplicação não foi alterado.
- Integração no YAML do CI implementada; comandos executados localmente. Sem workflow remoto, push, merge ou deploy.

Procedimentos e contratos: [Ingestão reproduzível](../architecture/INGESTAO-REPRODUZIVEL.md).
