# Validação de dados e carregamento

Executada em 01/11/2026, Windows, Node `24.13.0`, npm `11.6.2`, Angular 21 e Chromium do Playwright do projeto. Base: commit `5a79f91`. Implementa a fase 2, sem novas rotas nem conteúdo histórico novo.

## Equivalência e fonte de verdade

- O grafo reconstruído de `src/content/knowledge/manifest.json` foi comparado com o baseline completo da captura Liberalismo (`scripts/ingestion/wikimedia/raw/liberalism/2026-11-01/baseline.json`): **igualdade estrutural completa**, com 48 entidades e 66 relações em cinco coleções. Ordem das chaves e formatação JSON mudam; valores editoriais não.
- `src/content/atlas.json` removido. Cinco snapshots canônicos referenciados pelo manifesto; órfãos intermediários da migração removidos antes da entrega, sem apagar arquivos versionados. O teste permanente verifica round-trip e estabilidade de manifesto e hashes, sem congelar edições futuras contra um baseline antigo.
- Sem diff em `public`, capturas brutas, dossiês de ideologias ou suplemento `src/content/graph`. Sem nova coleta Wikimedia. A ingestão passou a ler e publicar a composição canônica e continuou reproduzindo as duas capturas com os hashes originais.

## Comandos executados

| Comando | Resultado |
|---|---|
| `npm run content:build` | **Passou**: 5 coleções, busca, adjacência, layouts e manifesto público |
| `npm run test:content` | **4 testes**: round-trip, determinismo offline, rejeição de referência inválida, mudança seletiva de hashes e preservação da última versão |
| `npm test` | **120 testes em 24 arquivos** |
| `npm run test:ingestion` | **15 testes**, incluindo publicação e replay com manifesto de coleções |
| `npm run ingest:verify` | **2 capturas reproduzidas duas vezes sem rede**, bytes e hashes iguais aos da fase 1 |
| `npm run typecheck` | **Passou**, aplicação e testes |
| `npm run lint` | **Passou**: Angular/templates, 6 testes arquiteturais, Biome e Prettier |
| `npm run build` | **Passou**: 3 rotas prerenderizadas, headers e CSP gerados |
| `npm run check:links` | **Passou**: links internos de 4 HTMLs estáticos |
| `npm run test:e2e` | **24 testes em 25,4 s**, 5 workers |
| `git diff --check` | **Passou** |

Hooks geram os artefatos antes de start, watch, test, typecheck, lint e build. Gerações concorrentes de build, typecheck e lint também concluíram, com temporários únicos e rename. Sem workflow remoto; o YAML do CI foi atualizado e executado localmente.

## Comportamentos verificados

- **Home:** nenhuma requisição `/content/*` ao abrir a página. A busca local segue nas duas leituras publicadas.
- **SPA:** Home → Marxismo carrega uma vez o manifesto, as cinco coleções e três derivados, por arquivos com hash; os dois arquivos do dossiê seguem no serviço editorial próprio. Marxismo → Liberalismo reutiliza os nove assets do acervo sem novo download.
- **SSR e hidratação:** abrir o Liberalismo direto e interagir com um termo não gerou requisições `/content/*`; o repositório consumiu TransferState. Teste unitário verifica o consumo completo do estado sem chamar o leitor.
- **Carregamento individual:** `loadCollection('atlas-liberalism')` lê só manifesto e coleção; a preparação global posterior compartilha esse cache, sem duplicar requisições.
- **Falha de rede simulada:** bloqueio do manifesto durante navegação a partir da Home. O conteúdo anterior permaneceu, o alerta apareceu, o retry funcionou após remover o bloqueio e o foco foi para `#conteudo`. Axe no aviso sem violações serious ou critical.
- **Integridade:** bytes corrompidos recusados antes de disponibilizar qualquer grafo parcial; nova tentativa buscou de novo o asset com falha. Manifesto inválido via `HttpTestingController` rejeitado.
- **Identidade canônica:** leitura, escrita e compilação reutilizam a reconciliação global, inclusive recusando QID duplicado com IDs diferentes. A mudança de armazenamento não contorna a proteção da fase 1.
- **Relações:** índices de entrada e saída comparados às consultas de referência para todas as entidades, três direções e cada coleção. Rótulos reversos e proveniência da exploração contextual seguem nos testes existentes.
- **Geometria:** SVG e eixos seguem prerenderizados; filtros mantêm coordenadas. O atlas aceita raiz arbitrária, testada com John Locke além da raiz Liberalismo. O navegador apenas associa IDs às posições geradas.
- **Responsividade e interação:** suíte completa de Home, Marxismo e Liberalismo, em desktop e 390 e 320 px; teclado, toque, reduced motion, diálogo, fontes e retorno ao contexto. Testes de scroll, foco e altura de painel seguem passando.

## Medidas locais

Release do manifesto público: `a8b565cc49f5b4189c5fc8dd4f0ab19f052715e7d963b1b64eb58948eaf86c48`.

| Recurso ativo | Bytes |
|---|--:|
| Coleção Metodologia | 4.704 |
| Coleção Processo constituinte | 7.876 |
| Coleção Direitos constitucionais | 3.038 |
| Coleção Liberalismo | 44.781 |
| Coleção Marxismo | 104.850 |
| Busca | 139.680 |
| Adjacência nos dois sentidos | 64.167 |
| Layouts de atlas e dossiê | 4.619 |
| **Total dos oito recursos, sem manifesto** | **373.715** |

- Gzip local dos oito arquivos, comprimidos individualmente: **46.612 bytes**. Não é tráfego real nem configuração de compressão da hospedagem.
- Bundler: **339,80 kB iniciais brutos e 95,02 kB estimados para transferência**, contra 337,45 e 92,79 kB na fase anterior. Maior chunk lazy: de cerca de 725,10 para **472,01 kB**. Não se afirma redução do payload inicial: índices materializados e transferência SSR têm custo próprio.
- Todos os JS da saída browser: 1.049.275 bytes; gzip local 273.455 bytes. O total abrange chunks de rotas diferentes, não o download inicial de uma página. A varredura não encontrou sentinelas do grafo (`knowledge-graph-atlas`, QIDs selecionados), `buildDiscoveryIndex` nem `graphGeometry`. A revisão de imports confirmou que grafo e algoritmos de layout não são importados pelos consumidores públicos; fixtures isoladas por regra arquitetural.

| HTML prerenderizado | Bytes | Gzip local |
|---|--:|--:|
| Home | 47.435 | 9.398 |
| Marxismo | 580.980 | 78.203 |
| Liberalismo | 510.489 | 63.396 |

Os HTMLs das leituras incluem os dados transferidos para hidratação. O custo é explícito: a política atual prepara o grafo global e os derivados, preservando todas as conexões. O benefício comprovado: o monolito saiu do JS, índices e geometria foram antecipados e os downloads duplicados na hidratação e na navegação foram eliminados. Não houve medição de Core Web Vitals nem garantia de ganho de velocidade universal.

Métricas completas em `output/content-loading-metrics.json`. A saída estática não contém `content/atlas.json`, `content/knowledge` nem fixtures de teste. `generated/` é ignorado pelo Git.

## Regressões encontradas e corrigidas

- Primeiro teste do compilador usava chave de bloco incorreta; ajustado para o identificador real `correntes-1`.
- Remoção do JSON global expôs imports de teste e exports síncronos acoplados ao repositório. Migrados para fixture gerada e providers explícitos, sem dados de teste na aplicação.
- Lint apontou ordem dos membros do serviço e formatação após a migração de imports; corrigidos e o lint repetido.
- A primeira estratégia de layouts gerava mapas só para algumas raízes; a regressão com John Locke falhou com "Layout de atlas não compilado para esta raiz". A geração passou a produzir centro, ordem e slots reutilizáveis, preservando qualquer raiz válida e reduzindo o artefato sem recalcular posições no cliente. O teste passou na suíte de 120 testes.
- Escrita de artefatos com temporários únicos e rename, inclusive a fixture derivada, evitando colisão entre hooks concorrentes. Referência inválida não substitui o último manifesto válido.

## Limites e próximos passos

- As páginas editoriais ainda preparam todas as coleções e índices, por compatibilidade com consumidores síncronos. Há separação e cache por coleção, mas não carregamento por entidade nem publicação de busca universal.
- Dossiês mantêm serviço, URLs e TransferState próprios. O manifesto versiona grafo, índices e layouts, sem afirmar transação única de todos os textos editoriais entre deploys.
- O índice mantém destinos históricos internos que precisam de revisão na fase de catálogos e permalinks; as três páginas não os apresentam como rotas novas. Componentes antigos não publicados seguem preservados.
- Mobile emulado no Chromium; Axe e testes de teclado não equivalem a auditoria WCAG integral.
- Capturas em `output/playwright` regeneradas pela suíte. Não incorporadas aos assets nem usadas como evidência histórica. Sem push, merge, deploy ou execução automática da fase de catálogos.

Contrato e operação: [Dados particionados e carregamento](../architecture/DADOS-E-CARREGAMENTO.md).
