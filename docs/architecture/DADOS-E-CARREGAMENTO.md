Status: atual
Última verificação: 08/11/2026

# Dados particionados e carregamento

Fase 2 implementada em 01/11/2026. Angular 21 standalone, Router, TypeScript strict, Zod e static-first preservados. Rotas: `/`, `/marxismo` e `/liberalismo`; esta fase não publica catálogos nem verbetes.

## Fontes canônicas e derivados

```text
src/content/knowledge/manifest.json
  → collections/<atlas-id>.<sha256>.json (uma coleção por arquivo)
  → leitura e validação global, preservando ordem e referências entre coleções
  → scripts/content/build-content.mjs (offline)
  → generated/content/manifest.json
      + 5 snapshots compactos de coleção, com hash
      + search.<hash>.json, adjacency.<hash>.json, layouts.<hash>.json
  → assets Angular /content/* + leitor SSR
  → ContentRepository + resolver das leituras
  → apresentação dos índices e layouts já prontos
```

- O antigo `src/content/atlas.json` foi removido. O grafo é composto em memória a partir das coleções; não há segunda fonte global mantida à mão.
- Baselines globais antigos da ingestão ficam imutáveis em `scripts/ingestion/wikimedia/raw` como registro de reprodução, não como base ativa.
- O manifesto canônico traz ID, versão, data do grafo e a lista ordenada de coleções com arquivo e hash. Snapshots seguem o mesmo contrato Zod. IDs, slugs, prosa, fontes, evidências, estados, datas, licenças e ordem editorial foram preservados e comparados com o baseline completo.
- `scripts/content/source-graph.mjs` concentra leitura, serialização e escrita. `readSourceGraph()` valida hashes, o grafo global e a unicidade dos QIDs, reutilizando a reconciliação da ingestão. `writeSourceGraph()` valida antes de gravar, cria arquivos imutáveis por hash e troca o manifesto por rename. Versões anteriores não são apagadas automaticamente.
- O Git mantém LF nesta árvore; o formatador ignora coleções com checksum. Alterações passam pelo escritor, que atualiza o manifesto; não editar um arquivo com hash no nome sem atualizá-lo.

## O que o build calcula

- **Busca:** reaproveita `buildDiscoveryIndex` (texto normalizado, aliases, tipos, estados e backlinks de fontes e relações). A busca da Home segue limitada às duas leituras; o índice global não cria sozinho uma experiência pública.
- **Adjacência:** para cada entidade, relações de entrada e saída com ID do atlas, ID da relação, destino, natureza, rótulo orientado, contexto, incerteza, período e referências de evidência. O runtime só filtra por tipo, direção, coleção e período.
- **Atlas:** pontos da espiral, centro e ordem dos registros pré-calculados. O componente mapeia a raiz e a seleção para esses pontos, sem trigonometria nem simulação no navegador. Qualquer entidade pode ser raiz; não há duplicação quadrática de coordenadas.
- **Rede enxuta:** `network.<hash>.json` projeta só o que `/grafos` lê: identidade, tipo, resumo, período, estado editorial, até três claims por entidade, licenças e relações. Seções, revisões, evidências, citações e fontes longas ficam fora. A projeção caiu de **12,6 MB** (coleções completas) para **3,1 MB** no release local.
- **Dossiê editorial:** valida os snapshots publicados pelo registro `publishedIdeologies`; gera nós, curvas e altura dos grafos e posições e marcas dos eixos temporais de cada bloco. Filtros não recalculam geometria. Exemplos não publicados não entram no registro de layouts.

Os algoritmos seguem nas funções puras existentes (`knowledge-graph.ts`, `discovery-index.ts`, `visualization-geometry.ts`), mas os consumidores públicos recebem resultados materializados. D3 não é chamado pelos componentes das leituras. A posição visual é arranjo editorial, não medida de influência histórica nem de similaridade ideológica.

O compilador Node 24 usa `module.registerHooks` só para resolver aliases e extensões dos módulos TS puros. Não executa Angular nem duplica contratos. Sem dependências novas. O manifesto público é escrito por último, após validar entradas e gerar recursos. JSON publicado compacto; fontes canônicas legíveis. Sem timestamps nos derivados: conteúdo igual gera os mesmos bytes e hashes no ambiente testado.

## Comandos

```powershell
npm run content:build
npm run test:content
npm run build
```

Os scripts `start`, `watch`, `test`, `typecheck`, `lint` e `build` têm hooks que geram os artefatos. `generated/` fica fora do Git; um clone novo não depende de arquivos gerados no computador do autor. Comandos Angular executados diretamente precisam de `npm run content:build` antes. Após alterar conteúdo durante a sessão, regenerar e recarregar a página; não há watcher adicional de conteúdo.

`generated/testing/content-fixture.json` é projeção para testes, não asset público. `src/testing/content-fixture.ts` fornece dados e providers aos testes. A regra arquitetural impede imports de `@testing/*` no código de produção. Snapshots canônicos e fixtures geradas não entram no bundle cliente.

## Carregamento, cache e hidratação

- `knowledgeContentResolver` prepara o conteúdo antes de ativar cada leitura; o componente mantém acesso síncrono ao grafo validado. Home não solicita o acervo. `loadCollection(id)` busca uma coleção; `loadKnowledgeGraph()` prepara o conjunto com índices. `loadNetworkGraph()` lê `network.<hash>.json` + `layouts.<hash>.json`; releases sem o campo caem nas coleções completas.
- **Política atual:** as duas leituras preparam as cinco coleções e os três derivados. Isso preserva consumidores síncronos e todas as conexões globais, inclusive fontes e relações de outros atlas. Particionar os arquivos não significa carregar só uma entidade ou coleção. Busca e layouts também são preparados em conjunto; carregamento mais granular pode vir depois, com medição e mudança deliberada dos contratos.
- **Navegador:** HttpClient busca o texto dos assets locais; o repositório valida tamanho, SHA-256, JSON, Zod e referências globais. Requisições simultâneas compartilham a mesma promessa; cada URL com hash fica em cache de memória durante a sessão. A página nunca vê estado parcial. A sessão mantém sua versão coerente e não troca de manifesto entre seleções.
- **Prerender:** `app.config.server.ts` fornece um leitor de arquivos para `generated/content`, que não entra no browser. Os textos passam por TransferState; na hidratação são consumidos e removidos, evitando nova requisição. As três páginas seguem prerenderizadas e os controles operáveis após a hidratação.
- **Falhas:** HTTP com erro, hash divergente ou dado inválido impedem a ativação da leitura. Promessas com erro são descartadas, e a falha invalida o manifesto em cache para que o retry encontre uma versão corrigida. O shell mantém a página anterior, mostra aviso acessível e permite tentar de novo. Após recuperação, o foco vai ao conteúdo. Não substitui auditoria WCAG integral.

## Integração com a ingestão

Sem `--output`, `runIngestion` publica o manifesto canônico de coleções, com as mesmas proteções contra sobrescrever curadoria posterior. Sem `--input`, a base vem de `readSourceGraphBytes()`. Saídas isoladas seguem como JSON completo em caminhos escolhidos. Data, configuração e respostas de capturas antigas permanecem congeladas; os dois replays existentes mantiveram os hashes da fase 1.

A publicação prepara as novas mídias, grava os novos shards e troca o manifesto por último. Falhas tratadas removem temporários; interrupção abrupta pode deixar órfãos, sem tornar um conjunto parcial a base ativa. Escrita concorrente por outro editor ainda exige coordenação; não há banco nem serviço de locks.

## Limites e rollback

- A arquitetura separa fontes de derivados e tira o grafo do JS, mas não promete redução de todo o tráfego inicial. Índices e TransferState também têm custo, registrado no relatório de qualidade.
- O índice interno preserva destinos históricos despublicados (`/verbete/*`, `/fontes`). As três páginas não os expõem como links novos; a fase de catálogos e permalinks deve reconciliá-los com o Router real.
- Layouts compilados cobrem as visualizações das páginas públicas atuais. Componentes antigos não publicados continuam no repositório; não se declara eliminação de todo cálculo visual.
- O cache descrito é de sessão e TransferState. Cache HTTP, CDN e publicação são responsabilidade da hospedagem; não houve deploy.
- Artefatos com hash antigos podem permanecer em `generated` entre builds locais. Build em checkout limpo começa sem eles; o manifesto identifica os recursos da versão ativa.
- **Rollback:** reverter o commit da fase restaura o modelo anterior. Para rollback de conteúdo após a migração, restaurar o manifesto canônico e os shards versionados correspondentes; não editar hashes nem apagar capturas brutas.

Validação e medidas: [Dados e carregamento(../archive/2026-11/quality/DADOS-E-CARREGAMENTO.md).

Referências técnicas: [resolvers Angular](https://angular.dev/guide/routing/data-resolvers), [TransferState](https://angular.dev/api/core/TransferState) e [hooks de módulos Node](https://nodejs.org/api/module.html#moduleregisterhooksoptions). Implementação executada com Node 24.13 e Angular 21 do projeto.
