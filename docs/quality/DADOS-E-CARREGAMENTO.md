# Validação de dados e carregamento

Executada em 01/11/2026, Windows, Node `24.13.0`, npm `11.6.2`, Angular 21 e Chromium do Playwright do projeto. Base: commit `5a79f91`. Esta entrega implementa a fase 2, sem novas rotas ou publicação de conteúdo histórico novo.

## Equivalência e fonte de verdade

O grafo reconstruído de `src/content/knowledge/manifest.json` foi comparado com o baseline completo da captura Liberalismo de 01/11/2026 (`scripts/ingestion/wikimedia/raw/liberalism/2026-11-01/baseline.json`): **igualdade estrutural completa**, incluindo as 48 entidades e 66 relações em cinco coleções. A organização/ordem de chaves e a formatação JSON mudam; os valores editoriais não foram alterados.

O antigo `src/content/atlas.json` foi removido. Há cinco snapshots canônicos referenciados pelo manifesto; órfãos intermediários criados durante esta migração foram removidos antes da entrega, sem apagar arquivos previamente versionados. O teste permanente verifica round-trip e estabilidade do manifesto/hashes sem congelar futuras edições editoriais contra um baseline antigo.

Não houve diff em `public`, nas capturas brutas, nos dossiês de ideologias ou no suplemento `src/content/graph`. Não foi feita nova coleta Wikimedia. O pipeline de ingestão foi adaptado para ler/publicar a composição canônica e continuou reproduzindo as duas capturas antigas com os hashes originais.

## Comandos executados

| Comando | Resultado final observado |
| --- | --- |
| `npm run content:build` | **Passou**; 5 coleções + busca + adjacência + layouts e manifesto público |
| `npm run test:content` | **4 testes passaram**: round-trip, determinismo offline, rejeição de referência inválida e mudança seletiva de hashes/preservação da última versão |
| `npm test` | **120 testes passaram em 24 arquivos** |
| `npm run test:ingestion` | **15 testes passaram**, incluindo publicação/replay com manifesto de coleções |
| `npm run ingest:verify` | **2 capturas reproduzidas duas vezes sem rede**, bytes e hashes iguais aos da fase 1 |
| `npm run typecheck` | **Passou**, aplicação e testes |
| `npm run lint` | **Passou**, Angular/templates, 6 testes arquiteturais, Biome e Prettier |
| `npm run build` | **Passou**, 3 rotas prerenderizadas, headers/CSP gerados |
| `npm run check:links` | **Passou**, links internos de 4 HTMLs estáticos verificados |
| `npm run test:e2e` | **24 testes passaram em 25,4s**, 5 workers |
| `git diff --check` | **Passou**, sem erros de whitespace |

Hooks geram os artefatos antes de start/watch/test/typecheck/lint/build. Gerações concorrentes de build/typecheck/lint também concluíram nesta sessão, usando temporários únicos e rename. Não foi executado um workflow remoto; o YAML do CI foi atualizado e os comandos foram executados localmente.

## Comportamentos verificados

- **Home:** nenhuma requisição `/content/*` ao abrir a página. A busca local continua nas duas leituras publicadas.
- **SPA:** Home → Marxismo carrega uma vez o manifesto, cinco coleções e três derivados, por arquivos com hash; os dois arquivos do dossiê continuam no serviço editorial próprio. Marxismo → Liberalismo reutiliza os nove assets do acervo sem novo download.
- **SSR/hidratação:** abrir diretamente Liberalismo e interagir com um termo não fez requisições extras `/content/*`; o repositório consumiu TransferState. Unitário também verifica consumo completo do estado sem chamar o leitor.
- **Carregamento individual:** `loadCollection('atlas-liberalism')` lê apenas manifesto e coleção; a preparação global posterior compartilha esse cache, sem requisições duplicadas.
- **Falha real de rede simulada:** interceptação bloqueou o manifesto durante navegação a partir da Home. O conteúdo anterior permaneceu, o alerta apareceu, retry funcionou após remover o bloqueio e o foco foi para `#conteudo`. Axe no aviso não encontrou violações serious/critical.
- **Integridade:** bytes corrompidos foram recusados antes de disponibilizar qualquer grafo parcial; uma nova tentativa buscou novamente o asset com falha. Manifesto inválido via HttpTestingController foi rejeitado.
- **Identidade canônica:** leitura/escrita/compilação reutilizam a reconciliação global, inclusive rejeitando QID duplicado por IDs diferentes; a mudança de armazenamento não contorna a proteção da fase 1.
- **Relações:** índices de entrada/saída foram comparados às consultas de referência para todas as entidades, três direções e cada coleção. Rótulos reversos e proveniência da exploração contextual continuaram nos testes existentes.
- **Geometria:** SVG e eixos continuam prerenderizados; filtros mantêm coordenadas. O contrato de raiz arbitrária do atlas foi testado com John Locke, além da raiz Liberalismo. O navegador apenas associa IDs às posições geradas.
- **Responsividade e interação:** suíte completa cobriu Home, Marxismo e Liberalismo, desktop e larguras móveis de 390/320px, teclado/toque, reduced motion, diálogo, fontes e retorno ao contexto. Os testes existentes de scroll/foco/altura de painel continuaram passando.

## Medidas locais

Release do manifesto público: `a8b565cc49f5b4189c5fc8dd4f0ab19f052715e7d963b1b64eb58948eaf86c48`.

| Recurso ativo | Bytes |
| --- | ---: |
| Coleção Metodologia | 4.704 |
| Coleção Processo constituinte | 7.876 |
| Coleção Direitos constitucionais | 3.038 |
| Coleção Liberalismo | 44.781 |
| Coleção Marxismo | 104.850 |
| Busca | 139.680 |
| Adjacência nos dois sentidos | 64.167 |
| Layouts de atlas/dossiê | 4.619 |
| **Total dos oito recursos, sem manifesto** | **373.715** |

Gzip local desses oito arquivos, comprimidos individualmente com Node: **46.612 bytes**. Isso não é medição de tráfego real ou configuração de compressão da hospedagem.

O bundler informou **339,80 kB iniciais brutos / 95,02 kB estimados para transferência**, contra 337,45/92,79 kB registrados na fase anterior. O maior chunk lazy passou de cerca de 725,10 para **472,01 kB**. Não se afirma redução do payload inicial total: os índices materializados e a transferência SSR têm custo próprio.

Somatório de todos os JS da saída browser: **1.049.275 bytes**, gzip local **273.455 bytes**; esse total abrange chunks das diferentes rotas, não o download inicial de uma página. A varredura dos JS não encontrou sentinelas do grafo (`knowledge-graph-atlas`, QIDs selecionados), `buildDiscoveryIndex` ou `graphGeometry`. A revisão de imports confirmou que o grafo e os algoritmos de layouts não são importados pelos consumidores públicos; as fixtures estão isoladas por regra arquitetural.

| HTML prerenderizado | Bytes | Gzip local |
| --- | ---: | ---: |
| Home | 47.435 | 9.398 |
| Marxismo | 580.980 | 78.203 |
| Liberalismo | 510.489 | 63.396 |

Os HTMLs das leituras incluem os dados transferidos para hidratação. O custo é explícito: a política atual prepara o grafo global e os derivados, preservando todas as conexões. O benefício comprovado é retirar o monolito do JS, antecipar índices/geometria e eliminar downloads duplicados na hidratação/navegação; não foi feita medição de Core Web Vitals ou garantia de ganho de velocidade universal.

Métricas completas preservadas localmente em `output/content-loading-metrics.json`. A saída estática também foi inspecionada: não contém `content/atlas.json`, `content/knowledge` nem fixtures de teste. `generated/` é ignorado pelo Git.

## Regressões encontradas e corrigidas

- O primeiro teste do compilador usou uma chave de bloco incorreta; foi ajustado para o identificador real `correntes-1`.
- A remoção do JSON global expôs imports de teste/exports síncronos acoplados ao repositório. Foram migrados para fixture gerada e providers explícitos, sem colocar dados de teste na aplicação.
- Lint apontou ordem dos membros do serviço e formatação após migração de imports; ambos foram corrigidos e o lint completo foi repetido.
- A primeira estratégia de layouts gerava mapas apenas para algumas raízes. A regressão com raiz John Locke falhou com “Layout de atlas não compilado para esta raiz”. A geração passou a produzir centro/ordem/slots reutilizáveis, preservando qualquer raiz válida e reduzindo o artefato sem recalcular posições no cliente. O teste depois passou na suíte de 120 testes.
- Escrita de artefatos usa temporários únicos e rename, inclusive fixture derivada, evitando colisão de nomes em hooks concorrentes. Referência inválida não substitui o último manifesto válido.

## Limites e próximos passos

As páginas editoriais ainda preparam todas as coleções/índices, por compatibilidade com os consumidores síncronos. O repositório já separa/cacheia coleções, mas não se declara carregamento por entidade nem publicação de busca universal. Dossiês mantêm seu serviço/URLs e TransferState próprios; o manifesto desta fase versiona o grafo, índices e layouts, sem afirmar uma transação única de todos os textos editoriais entre deploys.

O índice mantém destinos históricos internos que precisam de revisão na fase de catálogos/permalinks; as três páginas não os apresentam como novas rotas. Componentes antigos não publicados continuam preservados. Mobile foi emulado no Chromium; Axe e testes de teclado não equivalem a auditoria WCAG integral.

Os arquivos de captura visual existentes em `output/playwright` foram regenerados pela suíte das três páginas. Não foram incorporados aos assets nem usados como evidência histórica. Não houve push, merge, deploy ou execução automática da fase de catálogos.

Contrato e operação: [Dados particionados e carregamento](../architecture/DADOS-E-CARREGAMENTO.md).
