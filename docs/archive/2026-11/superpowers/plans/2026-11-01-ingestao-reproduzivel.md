# Ingestão Wikimedia reproduzível

**Objetivo:** fase 1 autorizada: modo offline, captura bruta versionada, reconciliação global, deduplicação e validação antes de publicar snapshots.

**Arquitetura:** configurações, cliente e normalização em `scripts/ingestion/wikimedia`. Separar arquivo de captura, transformação pura, publicação e CLI. Reutilizar diretamente o schema Zod TypeScript com Node 24, sem copiar contratos nem adicionar dependências. Preservar UI, rotas, prosa autoral, claims e revisões. Capturas ficam fora de `src/content` e do build público.

**Contrato:** `--capture <diretório>` adquire as respostas e registra grafo de entrada, configuração, data, hashes e hash do resultado; `--offline <diretório>` reproduz com rede proibida e confere os hashes. O arquivo de captura é imutável. Mídia existente preservada por padrão; `--media refresh` captura também metadados e bytes das novas imagens autorizadas. `--output <arquivo>` valida em saída isolada. Replay de uma base antiga não sobrescreve curadoria posterior.

## Sequência

- [x] Testes Node com `node:test`: offline sem rede, replay byte a byte, corpo corrompido ou ausente, conflito QID/ID/tipo, colisão de aliases, deduplicação de statements com referências distintas.
- [x] `archive.mjs`: manifest validado, respostas brutas endereçadas por conteúdo, baseline e configuração versionados, checksum, nenhuma queda silenciosa para rede no offline.
- [x] `reconcile.mjs` e `transform.mjs`: ID global por QID; aliases ambíguos sem associação automática; relações com IDs canônicos; preservação editorial; deduplicação sem apagar referências.
- [x] `pipeline.mjs` e CLI: Zod antes de qualquer publicação; arquivo temporário e rename; proteção contra baseline obsoleta; mídia imutável. Wrapper do Liberalismo preserva as flags.
- [x] Captura de dados reais em diretório versionado; duas saídas offline isoladas com hashes comparados. O snapshot antigo não foi apresentado como resposta bruta de rede.
- [x] `test:ingestion` e verificação offline integrados ao CI; unitários, lint, typecheck e build executados. Comandos, hashes, falhas reais e limites registrados.
- [x] Diff revisado; um único commit local.

## Riscos e critérios

- Falha de coleta, resposta inválida, referência quebrada, ID ambíguo ou hash divergente não substitui o snapshot existente.
- Datas da captura vêm do manifest no replay, não do relógio da execução. Versão, configuração ou hash incompatível exige nova captura deliberada.
- Nomes ou aliases isolados não provam identidade. Mesmo QID com IDs existentes diferentes é conflito a reconciliar editorialmente, não fusão destrutiva automática.
- Dados capturados precisam de origem e licença registradas. A API do 12axes não participa desta fase.
- Testes cobrem atualização sobre destino idêntico, proteção de destino modificado e ausência de arquivos parciais publicados.
