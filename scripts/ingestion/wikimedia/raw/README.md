# Capturas Wikimedia

As subpastas contêm dados realmente adquiridos da Wikimedia, configuração e grafo de entrada necessários ao replay. `baseline.json` é conteúdo próprio do ATLAS; não é apresentado como resposta de uma API.

Cada resposta possui URL de origem, tipo e hash SHA-256 em `manifest.json`. Os `.bin` são corpos brutos (incluindo JSON UTF-8), preservados sem formatação. Wikidata disponibiliza dados estruturados sob CC0; os metadados de descoberta Wikipedia mantêm sua origem e atribuição. Consulte os termos Wikimedia e, para imagens em capturas refresh, os metadados/licença específicos do arquivo. A captura não transforma procedência em validação historiográfica.

Não editar arquivos existentes nem executar formatadores nesta árvore. Novas aquisições usam diretório novo. O Git preserva bytes com `-text`; o build do site não publica esta pasta.

Respostas JSON não ficam mais no Git: estão publicadas no R2 como `raw/<sha256>.bin` (`npm run ingest:publish-raw`) e são obtidas de volta com `npm run ingest:fetch-raw`, que confere o SHA-256 de cada corpo. Os `blobs/` de imagens permanecem versionados até a revisão de licença de cada arquivo.

Execute `npm run ingest:fetch-raw` e depois `npm run ingest:verify` para reproduzir cada captura duas vezes sem rede. Procedimentos completos: `docs/architecture/INGESTAO-REPRODUZIVEL.md`.
