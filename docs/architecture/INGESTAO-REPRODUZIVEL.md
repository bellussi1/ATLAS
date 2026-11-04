# Ingestão Wikimedia reproduzível

Fase 1 implementada em 01/11/2026. Mantém Node 24, o schema Zod do produto e snapshots estáticos. Não adiciona backend, dependências ou requisições de ingestão ao navegador.

## Uso

Os dois comandos exigem uma escolha explícita. Executá-los sem flags encerra com instruções, sem acessar a rede.

```powershell
# Reproduzir uma captura versionada em saída isolada, sem rede.
npm run ingest:liberalism -- --offline scripts/ingestion/wikimedia/raw/liberalism/2026-11-01 --output output/ingestion/liberalism-offline.json
npm run ingest:marxism -- --offline scripts/ingestion/wikimedia/raw/marxism/2026-11-01 --output output/ingestion/marxism-offline.json

# Verificar todas as capturas: duas execuções independentes e comparação byte a byte.
npm run ingest:verify
npm run test:ingestion

# Nova coleta: escolher um diretório novo; capturas existentes nunca são sobrescritas.
npm run ingest:liberalism -- --capture scripts/ingestion/wikimedia/raw/liberalism/nova-versao --output output/ingestion/liberalism-novo.json
```

Após a fase 2, sem `--output`, o destino é `src/content/knowledge/manifest.json`: o escritor valida e grava coleções imutáveis antes de trocar o manifesto. A base padrão também vem dessa composição; o antigo JSON global foi removido. Um replay só pode substituir um destino que ainda corresponda ao grafo de entrada da captura ou ao resultado daquela captura. JSON equivalente com CRLF ou outra indentação é aceito; alterações de conteúdo exigem nova captura sobre a base atual. Saídas isoladas explicitamente escolhidas continuam sendo um JSON completo. Veja [Dados e carregamento](DADOS-E-CARREGAMENTO.md).

`--input <arquivo>` escolhe a base de uma **nova captura**. O modo offline ignora o relógio e usa exclusivamente a configuração, a data e a política de mídia guardadas no manifest; rejeita `--input` e `--media`. A configuração atual pode evoluir sem modificar a receita arquivada. A API interna permite fornecer uma configuração esperada e rejeita divergências.

`--media preserve` é o padrão: mantém imagens/licenças existentes e não solicita novas mídias. `--media refresh` captura também respostas Commons e bytes das imagens cuja licença é aceita pelo pipeline. Falha de download aborta a captura inteira; não produz um snapshot aparentemente completo. Licença não autorizada não aciona download. Os arquivos novos usam nome com hash; imagens existentes não são sobrescritas. As capturas iniciais versionadas usam **preserve**; mídias anteriores continuam versionadas em `public`.

`--media remote` é o modo usado desde 02/11/2026: captura as respostas Commons e aplica o mesmo filtro de licença, mas grava apenas a URL da miniatura (`upload.wikimedia.org` ou `thumb.wikimedia.org`) em `assetPath`, com autor, licença, página do arquivo e atribuição. Nenhum byte de imagem entra no repositório nem no arquivo de captura. Quando vários registros citam o mesmo arquivo Commons, `remoteMediaOwners` atribui a imagem ao registro mais específico (pessoa, obra, evento… antes de conceito e ideologia), porque caminhos de mídia são únicos no grafo. Arquivos em domínio público, que não expõem URL de licença, usam a página do arquivo como referência. A CSP em `public/_headers` libera esses dois hosts em `img-src`; a UI continua sem consultar APIs Wikimedia.

`--output` escolhe o destino do JSON; em refresh, novas mídias autorizadas são instaladas em `public/assets`. Para isolar também a mídia numa execução programática, a API `runIngestion` aceita `mediaRoot`, como nos testes.

## Responsabilidades

| Arquivo                                          | Responsabilidade                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `scripts/ingest-wikimedia-atlas.mjs`             | CLI, validação de flags e escolha da coleção; não monta entidades                                                  |
| `scripts/ingest-liberalism.mjs`                  | Wrapper que preserva argumentos, sem editar `process.argv`                                                         |
| `scripts/ingestion/wikimedia/configurations.mjs` | IDs internos solicitados e QIDs explícitos por coleção                                                             |
| `client.mjs`                                     | Acesso remoto limitado a origens Wikimedia HTTPS, User-Agent, ritmo/retry e timeout que inclui o corpo da resposta |
| `archive.mjs`                                    | Corpos brutos, hashes, manifest validado e leitor offline sem fallback de rede                                     |
| `reconcile.mjs`                                  | Identidade global por QID, aliases sem colisão silenciosa e deduplicação por ID                                    |
| `normalize.mjs`                                  | Normalização de títulos, datas e referências das declarações                                                       |
| `transform.mjs`                                  | Montagem determinística através do adaptador de entrada; sem escrita em disco nem acesso direto a fetch            |
| `pipeline.mjs`                                   | Validação Zod do grafo de entrada/saída e publicação por arquivo temporário + rename                               |
| `scripts/verify-ingestion.mjs`                   | Replay de todas as capturas versionadas em diretório temporário e comparação byte a byte                           |

O schema é importado diretamente de `src/app/core/content/models/content-schema.ts` com a execução TypeScript nativa do Node 24. Não há uma segunda cópia do contrato. Node 24.13 pode emitir `MODULE_TYPELESS_PACKAGE_JSON` ao detectar ESM nesse arquivo TypeScript; os comandos continuam normalmente, sem mudar o tipo de módulo de toda a aplicação para silenciar o aviso.

## Arquivo de captura

Cada diretório em `scripts/ingestion/wikimedia/raw/<coleção>/<versão>` contém:

- `baseline.json`: bytes do grafo editorial usado como entrada, não uma resposta Wikimedia reconstruída.
- `blobs/<sha256>.bin`: bytes exatos dos corpos obtidos, incluindo JSON UTF-8; o tipo está no manifest. Nenhum formatador altera esses arquivos.
- `manifest.json`: versão do contrato/pipeline, coleção, data UTC de coleta, configuração, hashes de configuração/base/resultado e lista URL/tipo/content-type/hash/procedência de licença das respostas.

O manifest é a lista completa de respostas consumidas pela transformação. O leitor offline verifica todos os blobs antes de transformar; arquivo ausente, hash divergente, URL repetida, resposta ausente ou versão incompatível interrompe a execução. Não há busca automática por um substituto remoto. O hash do resultado também precisa coincidir com o registrado: mudar regras de transformação requer uma nova versão de captura/pipeline deliberada, sem editar o arquivo antigo para mascarar diferença.

O diretório completo só aparece no caminho definitivo após a validação do grafo e a gravação de um staging próprio. O snapshot também só substitui o destino após validação e preparação das mídias. Uma falha de publicação pode deixar uma captura completa reutilizável; isso não significa que o snapshot foi publicado. Falhas capturadas removem arquivos temporários e as novas mídias já instaladas naquela tentativa. Interrupção abrupta do processo/sistema pode deixar órfãos sem referência; não há limpeza destrutiva de ativos antigos.

`.gitattributes` usa `-text` apenas na árvore raw para preservar os hashes em checkouts Windows/Linux. `.prettierignore` exclui essa árvore. Esses arquivos não entram em `src/content`, não são copiados pelo build e não são assets públicos do site.

## Identidade, deduplicação e preservação editorial

1. Validar primeiro o grafo inteiro, inclusive referências entre coleções.
2. Indexar globalmente IDs internos e QIDs existentes. Um QID já associado a dois registros existentes é conflito; abortar em vez de escolher e apagar uma versão.
3. Resolver cada solicitação contra o ID interno e o QID. Conflito entre os dois ou mudança de tipo aborta. Um QID conhecido em outra coleção reutiliza o ID e o slug canônicos; a entidade não é copiada para a nova coleção. O mapeamento solicitado → canônico aparece no resultado do comando.
4. Deduplicar solicitações repetidas e aliases com normalização Unicode, espaços, underscores e caixa. Um alias compartilhado por entidades distintas fica ambíguo: não cria relação automaticamente. Nomes não substituem QIDs como prova de identidade.
5. Montar links Wikipedia só após reconciliar todos os IDs. Consultar QIDs do grafo inteiro ao resolver declarações Wikidata, inclusive relações entre coleções.
6. Agrupar declarações ativas da mesma propriedade para o mesmo destino em um vínculo, preservando todas as referências distintas na evidência. Declarações deprecated não geram novas relações. Registros gerados com o mesmo ID mas conteúdo conflitante são erro, não last-write-wins.
7. Preservar prosa, títulos/slugs canônicos, claims, citações, revisões, trilhas e estados editoriais existentes. Atualizar apenas campos de descoberta/identificadores/aliases. Relações que já saíram do estado pending mantêm sua versão e suas fontes/evidências. Evidências/fontes já usadas por claims também são protegidas globalmente; vínculos novos que reutilizariam esse suporte não são acrescentados automaticamente, e vínculos existentes mantêm sua versão anterior. A nova resposta continua no arquivo bruto para revisão. IDs de relações importadas existentes permanecem estáveis.

Deduplicação não apaga perspectivas documentais: fontes com edições diferentes, relações de naturezas diferentes e evidências autorais não são fundidas por semelhança textual. Relações antigas ausentes numa coleta limitada não são apagadas automaticamente. Isso preserva referências editoriais; retirar vínculos obsoletos continua sendo uma decisão de revisão, não uma inferência a partir de ausência na API.

## Limites

- Reprodução é dos **dados capturados e da receita versionada**, não garantia de que uma nova consulta online retornará o mesmo conteúdo.
- Os corpos brutos registram o que a API respondeu; hashes verificam integridade, não veracidade histórica ou revisão humana.
- A coleta mantém o recorte existente de até 20 categorias e 60 links por página Wikipedia; não percorre toda a paginação. O manifest não representa um catálogo completo da Wikipedia.
- Imagens preservadas dependem dos ativos já versionados em `public`; preserve não arquiva novamente esses bytes. Refresh arquiva os novos downloads autorizados. Não foi feita auditoria editorial humana automática.
- Snapshots canônicos publicados não são atualizados pelos testes ou pela verificação de replay. A tarefa valida novos resultados em `output/ingestion`, para não misturar infraestrutura com publicação editorial de novos dados.
- As fases de shards, índices durante build, novas rotas e comparadores permanecem separadas desta implementação.

Resultados executados, hashes e limites de validação ficam em [Validação da ingestão](../quality/INGESTAO-REPRODUZIVEL.md).

## Descoberta e seleção da tradição marxista

Antes da captura, `npm run discover:marxism` consulta a Wikidata (buscas por `P1142`, `P737`, `P921` e `P279` com `Q7264` e `Q9061`), as entidades encontradas, a árvore de categorias do Commons (profundidade 2) e o resumo de pt.wikipedia. O resultado vai para `scripts/ingestion/wikimedia/discovery/marxismo.json`, com data e fontes. `npm run select:marxism` aplica regras explícitas e as decisões de `marxismo.decisions.json` e grava `marxismo.selection.json`, que `configurations.mjs` lê. Só então `npm run ingest:marxism -- --capture <diretório novo> --media remote` cria a captura reproduzível. Rótulos do Wikidata (`P1142`, `P737`) são classificações importadas, não influência documentada. A skill `atlas-wiki-discovery` descreve o fluxo e os limites.

## Coleta Wikipedia (rascunhos, fora do build)

`scripts/wiki-extract.mjs` lê Wikipedia (pt e en) por uma camada HTTP injetável (`scripts/ingestion/wiki-extract/http.mjs`). Cada execução que acessa a rede grava as respostas em `scripts/ingestion/wiki-extract/raw/<tradição>/<instante>/`: o `manifest.json` (URL, tipo, SHA-256, `etag` com a revisão, licença) é versionado; os corpos ficam em `blobs/`, ignorados pelo Git. `--replay <captura>` reproduz `discover` ou `fetch` a partir dessa captura, sem rede.

- Respostas JSON (metadados da API da Wikipedia e da Wikidata) seguem para `raw/<sha256>.bin` com `npm run ingest:publish-raw`, como as capturas Wikimedia. `npm run ingest:verify` confere o SHA-256 de cada captura.
- O HTML dos artigos é texto CC BY-SA 4.0 e não é publicado: fica local e só se reproduz com a captura desta máquina. Publicar esse texto no bucket público é decisão editorial pendente.
- `discover` propõe, além dos links dos artigos-semente, as entidades tipadas que os artigos já lidos ligam no corpo do texto (`origin: "mention"`), com a lista dos artigos que as citam. Menção não é relação: relações só entram com fonte e natureza declaradas, pela extração revisada.
- Rascunhos de extração (`generated/wiki-extract/<tradição>/extracts`) têm revisão `assistant`, nunca `revisado`, e vão só ao bucket privado `atlas-drafts` até aprovação.
