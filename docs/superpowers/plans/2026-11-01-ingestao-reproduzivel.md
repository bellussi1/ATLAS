# Ingestão Wikimedia reproduzível

**Objetivo:** implementar a fase 1 autorizada: modo offline, captura bruta versionada, reconciliação global, deduplicação e validação antes de publicar snapshots.

**Arquitetura:** manter configurações, cliente e normalização em `scripts/ingestion/wikimedia`. Separar arquivo de captura, transformação pura, publicação e CLI. Reutilizar diretamente o schema Zod TypeScript com Node 24, sem copiar contratos nem adicionar dependências. Preservar UI, rotas, prosa autoral, claims e revisões. Capturas ficam fora de `src/content` e do build público.

**Contrato:** `--capture <diretório>` adquire respostas e registra grafo de entrada, configuração, data, hashes e hash do resultado; `--offline <diretório>` reproduz com rede proibida e confere os hashes. O arquivo de captura é imutável. Mídia existente é preservada por padrão; `--media refresh` captura também metadados/bytes das novas imagens autorizadas. `--output <arquivo>` permite validar em saída isolada. Não sobrescrever curadoria posterior com replay de uma base antiga.

## Sequência de implementação

- [x] Testes Node com `node:test`: offline sem rede, replay byte a byte, corpo corrompido/ausente, conflito QID/ID/tipo, colisão de aliases e deduplicação de statements com referências distintas.
- [x] `archive.mjs`: manifest validado, respostas brutas content-addressed, baseline/config versionados, checksum e nenhuma queda silenciosa para rede no offline.
- [x] `reconcile.mjs` e `transform.mjs`: ID global por QID, aliases ambíguos sem associação automática, relações com IDs canônicos, preservação editorial e deduplicação sem apagar referências.
- [x] `pipeline.mjs` e entrada CLI: Zod antes de qualquer publicação, arquivo temporário/rename, proteção contra baseline obsoleta e mídia imutável. Wrapper Liberalismo preserva flags.
- [x] Capturar dados reais em diretório versionado; produzir duas saídas offline isoladas e comparar hashes. Não apresentar o snapshot antigo como se fosse resposta bruta de rede.
- [x] Integrar `test:ingestion` e verificação offline ao CI; executar unitários, lint, typecheck e build pertinentes. Registrar comandos, hashes, falhas reais e limites.
- [x] Revisar diff e criar um único commit local.

## Riscos e critérios

- Falha de coleta, resposta inválida, referência quebrada, ID ambíguo ou hash divergente não pode substituir o snapshot existente.
- Datas da captura vêm do manifest no replay, não do relógio da execução. Versão/configuração/hash incompatível exige nova captura deliberada.
- Não usar nomes/aliases isolados como prova de identidade. Mesmo QID com IDs existentes diferentes é conflito a reconciliar editorialmente, não fusão destrutiva automática.
- Dados capturados devem ter origem/licença registradas. A API do 12axes não participa desta fase.
- Testes devem cobrir atualização sobre um destino idêntico, proteção de destino modificado, e ausência de arquivos parciais publicados.
