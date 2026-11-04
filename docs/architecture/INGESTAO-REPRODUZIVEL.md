# Ingestão Wikimedia reproduzível

Fase 1 implementada em 01/11/2026. Mantém Node 24, o schema Zod do produto e snapshots estáticos. Sem backend, dependências nem requisições de ingestão no navegador.

## Uso

Os dois comandos exigem escolha explícita. Sem flags, encerram com instruções, sem acessar a rede.

```powershell
# Reproduzir uma captura versionada em saída isolada, sem rede.
npm run ingest:liberalism -- --offline scripts/ingestion/wikimedia/raw/liberalism/2026-11-01 --output output/ingestion/liberalism-offline.json
npm run ingest:marxism -- --offline scripts/ingestion/wikimedia/raw/marxism/2026-11-01 --output output/ingestion/marxism-offline.json

# Verificar todas as capturas: duas execuções independentes e comparação byte a byte.
npm run ingest:verify
npm run test:ingestion

# Nova coleta: diretório novo; capturas existentes nunca são sobrescritas.
npm run ingest:liberalism -- --capture scripts/ingestion/wikimedia/raw/liberalism/nova-versao --output output/ingestion/liberalism-novo.json
```

- **Destino padrão (desde a fase 2):** sem `--output`, grava em `src/content/knowledge/manifest.json`. O escritor valida e grava coleções imutáveis antes de trocar o manifesto. O JSON global antigo foi removido.
- **Replay:** só substitui um destino que ainda corresponda ao grafo de entrada da captura ou ao resultado dela. JSON equivalente com CRLF ou outra indentação é aceito; mudança de conteúdo exige nova captura sobre a base atual. Saídas isoladas escolhidas explicitamente continuam sendo um JSON completo. Ver [Dados e carregamento](DADOS-E-CARREGAMENTO.md).
- **`--input <arquivo>`:** escolhe a base de uma **nova captura**. O modo offline ignora o relógio e usa só a configuração, a data e a política de mídia guardadas no manifest; rejeita `--input` e `--media`. A configuração atual pode evoluir sem alterar a receita arquivada. A API interna aceita uma configuração esperada e rejeita divergências.
- **`--media preserve` (padrão):** mantém imagens e licenças existentes; não solicita novas mídias.
- **`--media refresh`:** captura também respostas Commons e os bytes das imagens cuja licença o pipeline aceita. Falha de download aborta a captura inteira, sem snapshot aparentemente completo. Licença não autorizada não aciona download. Arquivos novos recebem nome com hash; existentes não são sobrescritos. As capturas iniciais usam **preserve**; mídias anteriores continuam em `public`.
- **`--media remote` (desde 02/11/2026):** captura as respostas Commons com o mesmo filtro de licença, mas grava só a URL da miniatura (`upload.wikimedia.org` ou `thumb.wikimedia.org`) em `assetPath`, com autor, licença, página do arquivo e atribuição. Nenhum byte de imagem entra no repositório nem na captura. Quando vários registros citam o mesmo arquivo, `remoteMediaOwners` atribui a imagem ao registro mais específico (pessoa, obra, evento… antes de conceito e ideologia), porque caminhos de mídia são únicos no grafo. Arquivos em domínio público, sem URL de licença, usam a página do arquivo como referência. A CSP em `public/_headers` libera esses dois hosts em `img-src`; a UI não consulta APIs Wikimedia.
- **`--output`:** destino do JSON. Em refresh, mídias novas autorizadas vão para `public/assets`. Para isolar também a mídia numa execução programática, `runIngestion` aceita `mediaRoot`, como nos testes.

## Responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `scripts/ingest-wikimedia-atlas.mjs` | CLI, validação de flags e escolha da coleção; não monta entidades |
| `scripts/ingest-liberalism.mjs` | Wrapper que preserva argumentos, sem editar `process.argv` |
| `scripts/ingestion/wikimedia/configurations.mjs` | IDs internos solicitados e QIDs explícitos por coleção |
| `client.mjs` | Acesso remoto limitado a origens Wikimedia HTTPS; User-Agent, ritmo, retry e timeout que inclui o corpo da resposta |
| `archive.mjs` | Corpos brutos, hashes, manifest validado e leitor offline sem fallback de rede |
| `reconcile.mjs` | Identidade global por QID, aliases sem colisão silenciosa, deduplicação por ID |
| `normalize.mjs` | Normalização de títulos, datas e referências das declarações |
| `transform.mjs` | Montagem determinística pelo adaptador de entrada; sem escrita em disco nem `fetch` direto |
| `pipeline.mjs` | Validação Zod do grafo de entrada e saída; publicação por arquivo temporário e rename |
| `scripts/verify-ingestion.mjs` | Replay de todas as capturas versionadas em diretório temporário, com comparação byte a byte |

O schema é importado de `src/app/core/content/models/content-schema.ts` pela execução TypeScript nativa do Node 24; não há segunda cópia do contrato. Node 24.13 pode emitir `MODULE_TYPELESS_PACKAGE_JSON` ao detectar ESM nesse arquivo; os comandos seguem normalmente, sem mudar o tipo de módulo da aplicação para silenciar o aviso.

## Arquivo de captura

Cada diretório `scripts/ingestion/wikimedia/raw/<coleção>/<versão>` contém:

- `baseline.json`: bytes do grafo editorial usado como entrada (não é resposta Wikimedia reconstruída).
- `blobs/<sha256>.bin`: bytes exatos das respostas, incluindo JSON UTF-8; o tipo está no manifest. Nenhum formatador altera esses arquivos.
- `manifest.json`: versão do contrato e do pipeline, coleção, data UTC de coleta, configuração, hashes de configuração, base e resultado, e a lista URL, tipo, content-type, hash e procedência de licença de cada resposta.

O manifest é a lista completa das respostas consumidas pela transformação. O leitor offline verifica todos os blobs antes de transformar; arquivo ausente, hash divergente, URL repetida, resposta ausente ou versão incompatível interrompem a execução. Não há busca automática por substituto remoto. O hash do resultado também precisa coincidir: mudar regras de transformação exige nova versão de captura ou pipeline, sem editar o arquivo antigo para mascarar a diferença.

**Publicação:** o diretório completo só aparece no caminho definitivo após validar o grafo e gravar em staging próprio. O snapshot só substitui o destino após validação e preparação das mídias. Falha na publicação pode deixar uma captura completa reutilizável, sem que o snapshot tenha sido publicado. Falhas capturadas removem temporários e as mídias novas instaladas naquela tentativa. Interrupção abrupta pode deixar órfãos sem referência; não há limpeza destrutiva de ativos antigos.

`.gitattributes` usa `-text` só na árvore raw, para preservar hashes em checkouts Windows e Linux. `.prettierignore` exclui essa árvore. Esses arquivos não entram em `src/content`, não são copiados pelo build e não são assets públicos.

## Identidade, deduplicação e preservação editorial

1. Validar o grafo inteiro primeiro, inclusive referências entre coleções.
2. Indexar globalmente IDs internos e QIDs existentes. Um QID associado a dois registros existentes é conflito: abortar, sem escolher e apagar uma versão.
3. Resolver cada solicitação pelo ID interno e pelo QID. Conflito entre os dois, ou mudança de tipo, aborta. QID conhecido em outra coleção reutiliza o ID e o slug canônicos; a entidade não é copiada. O mapeamento solicitado → canônico aparece no resultado.
4. Deduplicar solicitações repetidas e aliases por normalização Unicode, espaços, underscores e caixa. Alias compartilhado por entidades distintas fica ambíguo e não cria relação automaticamente. Nomes não substituem QIDs como prova de identidade.
5. Montar links da Wikipedia só após reconciliar todos os IDs. Consultar QIDs do grafo inteiro ao resolver declarações da Wikidata, inclusive relações entre coleções.
6. Agrupar declarações ativas da mesma propriedade para o mesmo destino num vínculo, preservando todas as referências distintas na evidência. Declarações `deprecated` não geram relações novas. Registros gerados com o mesmo ID e conteúdo conflitante são erro, não last-write-wins.
7. Preservar prosa, títulos e slugs canônicos, claims, citações, revisões, trilhas e estados editoriais. Atualizar só campos de descoberta, identificadores e aliases. Relações que já saíram de `pending` mantêm versão, fontes e evidências. Evidências e fontes já usadas por claims são protegidas globalmente: vínculos novos que reutilizariam esse suporte não entram automaticamente, e vínculos existentes mantêm a versão anterior. A nova resposta fica no arquivo bruto para revisão. IDs de relações importadas permanecem estáveis.

Deduplicação não apaga perspectivas documentais: fontes com edições diferentes, relações de naturezas diferentes e evidências autorais não são fundidas por semelhança textual. Relações antigas ausentes numa coleta limitada não são apagadas automaticamente. Retirar vínculos obsoletos é decisão de revisão, não inferência pela ausência na API.

## Limites

- A reprodução vale para os **dados capturados e a receita versionada**, não garante que uma nova consulta online retorne o mesmo conteúdo.
- Os corpos brutos registram o que a API respondeu; hashes verificam integridade, não veracidade histórica nem revisão humana.
- A coleta mantém o recorte de até 20 categorias e 60 links por página da Wikipedia; não percorre toda a paginação. O manifest não é catálogo completo da Wikipedia.
- Imagens preservadas dependem dos ativos já versionados em `public`; preserve não arquiva esses bytes de novo. Refresh arquiva os downloads autorizados novos. Não houve auditoria editorial humana automática.
- Snapshots canônicos publicados não são atualizados por testes ou pela verificação de replay. Novos resultados são validados em `output/ingestion`, para não misturar infraestrutura com publicação editorial.
- Shards, índices no build, novas rotas e comparadores ficam fora desta implementação.

Resultados executados, hashes e limites de validação: [Validação da ingestão](../quality/INGESTAO-REPRODUZIVEL.md).

## Descoberta e seleção da tradição marxista

1. `npm run discover:marxism` consulta a Wikidata (buscas por `P1142`, `P737`, `P921` e `P279` com `Q7264` e `Q9061`), as entidades encontradas, a árvore de categorias do Commons (profundidade 2) e o resumo de pt.wikipedia. Resultado em `scripts/ingestion/wikimedia/discovery/marxismo.json`, com data e fontes.
2. `npm run select:marxism` aplica regras explícitas e as decisões de `marxismo.decisions.json`, e grava `marxismo.selection.json`, lido por `configurations.mjs`.
3. `npm run ingest:marxism -- --capture <diretório novo> --media remote` cria a captura reproduzível.

Rótulos da Wikidata (`P1142`, `P737`) são classificações importadas, não influência documentada. A skill `atlas-wiki-discovery` descreve o fluxo e os limites.

## Coleta Wikipedia (rascunhos, fora do build)

`scripts/wiki-extract.mjs` lê a Wikipedia (pt e en) por uma camada HTTP injetável (`scripts/ingestion/wiki-extract/http.mjs`). Cada execução com rede grava as respostas em `scripts/ingestion/wiki-extract/raw/<tradição>/<instante>/`: `manifest.json` (URL, tipo, SHA-256, `etag` com a revisão, licença), versionado; corpos em `blobs/`, ignorados pelo Git. `--replay <captura>` reproduz `discover` ou `fetch` a partir dessa captura, sem rede.

- Respostas JSON (metadados das APIs da Wikipedia e da Wikidata) vão para `raw/<sha256>.bin` com `npm run ingest:publish-raw`, como as capturas Wikimedia. `npm run ingest:verify` confere o SHA-256 de cada captura.
- O HTML dos artigos é texto CC BY-SA 4.0 e não é publicado: fica local e só se reproduz com a captura desta máquina. Publicá-lo no bucket público é decisão editorial pendente.
- `discover` propõe, além dos links dos artigos-semente, entidades tipadas que os artigos lidos ligam no corpo do texto (`origin: "mention"`), com a lista dos artigos que as citam. Menção não é relação: relações só entram com fonte e natureza declaradas, pela extração revisada.
- Rascunhos de extração (`generated/wiki-extract/<tradição>/extracts`) têm revisão `assistant`, nunca `revisado`, e vão só ao bucket privado `atlas-drafts` até aprovação.
