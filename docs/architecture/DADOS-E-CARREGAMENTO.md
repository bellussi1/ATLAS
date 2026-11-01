# Dados particionados e carregamento

Fase 2 implementada em 01/11/2026. Angular 21, standalone, Router, TypeScript strict, Zod e static-first preservados. As rotas continuam `/`, `/marxismo` e `/liberalismo`; esta fase não publica catálogos ou verbetes.

## Fontes canônicas e derivados

```text
src/content/knowledge/manifest.json
  → collections/<atlas-id>.<sha256>.json (uma coleção por arquivo)
  → leitura e validação global, preservando ordem e referências entre coleções
  → scripts/content/build-content.mjs (offline)
  → generated/content/manifest.json
      + 5 snapshots compactos de coleção, com hash
      + search.<hash>.json
      + adjacency.<hash>.json
      + layouts.<hash>.json
  → Angular assets /content/* + leitor SSR
  → ContentRepository + resolver das leituras
  → apresentação dos índices/layouts já prontos
```

O antigo `src/content/atlas.json` foi removido. O grafo é uma composição em memória das coleções; não há uma segunda fonte global mantida manualmente. Dados brutos antigos da ingestão continuam imutáveis em `scripts/ingestion/wikimedia/raw`; seus baselines globais são arquivos históricos de reprodução, não a base ativa da aplicação.

O manifesto canônico contém ID/versão/data do grafo e a lista ordenada de coleções com arquivo/hash. Os snapshots têm conteúdo normalizado pelo mesmo contrato Zod do produto. IDs, slugs, prosa, fontes, evidências, estados, datas, licenças e ordem editorial foram preservados; a migração foi comparada com o baseline anterior completo.

`scripts/content/source-graph.mjs` concentra leitura, serialização e escrita canônica. `readSourceGraph()` valida hashes, o grafo global e a unicidade dos QIDs, reutilizando a reconciliação da ingestão; `writeSourceGraph()` valida antes de gravar, cria novos arquivos imutáveis por hash e troca o manifesto por rename. Arquivos de versões anteriores não são apagados automaticamente. O Git mantém LF nesta árvore, e o formatador ignora as coleções com checksum: alterações devem passar pelo escritor e atualizar o manifesto, não modificar um arquivo com hash no nome sem atualizá-lo.

## O que o build calcula

- **Busca:** reaproveita `buildDiscoveryIndex`, incluindo texto normalizado, aliases, tipos, estados e backlinks de fontes/relações. A busca da Home continua limitada às duas leituras; o índice global não cria uma nova experiência pública sozinho.
- **Adjacência:** para cada entidade, materializa relações de entrada e saída, com ID do atlas/relação/destino, natureza, rótulo orientado, contexto, incerteza, período e referências de evidência. O runtime apenas filtra esse índice por tipo/direção/coleção/período.
- **Atlas:** pré-calcula os pontos da espiral, centro e ordem dos registros. O componente mapeia a raiz/seleção para esses pontos sem trigonometria nem simulação no navegador. Qualquer entidade existente pode ser raiz, como no contrato anterior; não há duplicação quadrática de coordenadas por possível raiz.
- **Dossiê editorial:** valida os snapshots publicados pelo registro `publishedIdeologies`; gera nós/curvas/altura de grafos e posições/marcas dos eixos temporais de cada bloco. Filtros não recalculam geometria. Exemplos não publicados não entram no registro de layouts editoriais.

Os algoritmos continuam nas funções puras existentes (`knowledge-graph.ts`, `discovery-index.ts`, `visualization-geometry.ts`), mas os consumidores públicos recebem seus resultados materializados. D3 não é chamado pelos componentes das leituras. A posição visual é um arranjo editorial, não medida de influência histórica ou similaridade ideológica.

O compilador Node 24 usa `module.registerHooks` somente para resolver aliases/extensões dos módulos TS puros do projeto. Ele não executa Angular nem duplica os contratos. Não foram adicionadas dependências. O manifesto público é escrito por último, após validar entradas e produzir os recursos. Os JSONs publicados são compactos; fontes canônicas permanecem legíveis. Não há timestamps de execução nos derivados: conteúdo igual gera os mesmos bytes/hashes no ambiente testado.

## Comandos e desenvolvimento

```powershell
npm run content:build
npm run test:content
npm run build
```

Os scripts `start`, `watch`, `test`, `typecheck`, `lint` e `build` possuem hooks que geram os artefatos necessários. `generated/` fica fora do Git. Um clone novo não depende de arquivos gerados previamente no computador do autor. Comandos Angular executados diretamente precisam de `npm run content:build` antes. Depois de alterar conteúdo durante uma sessão de desenvolvimento, regenere os artefatos e recarregue a página; não foi criado um watcher adicional de conteúdo.

`generated/testing/content-fixture.json` é uma projeção para testes e não um asset público. `src/testing/content-fixture.ts` fornece dados/providers aos testes. A regra arquitetural impede imports de `@testing/*` no código de produção. Os snapshots canônicos e as fixtures geradas não são importados pelo bundle cliente.

## Carregamento, cache e hidratação

`knowledgeContentResolver` prepara o conteúdo antes de ativar cada leitura; o componente continua com acesso síncrono ao grafo validado. Home não solicita o acervo. O repositório expõe `loadCollection(id)` para buscar uma coleção individualmente e `loadKnowledgeGraph()` para preparar o conjunto com índices.

**Política atual:** as duas leituras preparam as cinco coleções e os três artefatos derivados. Isso preserva os consumidores síncronos e todas as conexões globais existentes, inclusive fontes e relações de outros atlas. Particionar os arquivos não significa que a leitura já carrega apenas uma entidade ou uma coleção. Busca/layouts também são preparados em conjunto; carregamento mais granular desses derivados pode ser adotado depois com medição e mudança deliberada dos contratos.

No navegador, HttpClient busca texto dos assets locais; o repositório valida tamanho, SHA-256, JSON, Zod e referências globais. Requisições simultâneas compartilham a mesma promessa, e cada URL com hash fica em cache de memória durante a sessão. A página não vê um estado parcialmente carregado. Uma sessão mantém sua versão coerente; não muda silenciosamente para outro manifesto entre seleções.

No prerender, `app.config.server.ts` fornece um leitor de arquivos para `generated/content`. Esse leitor não entra no browser. Os textos carregados passam por TransferState; na hidratação são consumidos e removidos do estado transferido, evitando outra requisição dos mesmos dados. As três páginas continuam prerenderizadas e os controles permanecem operáveis depois da hidratação.

Falhas HTTP, hashes divergentes ou dados inválidos impedem a ativação da leitura. Promessas com erro são descartadas; uma falha na preparação invalida o manifesto em cache para permitir descobrir uma versão corrigida no retry. O shell mantém a página anterior, apresenta aviso acessível e permite tentar novamente. Após recuperação, o foco vai para o conteúdo. Isso não substitui uma auditoria WCAG integral.

## Integração com a ingestão

Sem `--output`, `runIngestion` publica o manifesto canônico de coleções, com as mesmas proteções contra sobrescrever curadoria posterior. Sem `--input`, a base vem de `readSourceGraphBytes()`. Saídas isoladas continuam sendo JSONs completos em caminhos explicitamente escolhidos. A data/configuração/respostas de capturas antigas permanecem congeladas; os dois replays existentes mantiveram os hashes da fase 1.

A publicação prepara novas mídias, grava os novos shards e troca o manifesto por último. Falhas tratadas removem temporários; interrupção abrupta pode deixar arquivos órfãos, sem tornar um conjunto parcial a base ativa. Escrita concorrente por outro editor ainda exige coordenação; não foi introduzido banco ou serviço de locks.

## Limites e rollback

- A arquitetura separa fontes de derivados e remove a incorporação do grafo ao JS; não promete redução de todo o tráfego inicial. Índices e TransferState também têm custo, registrado no relatório de qualidade.
- O índice interno preserva alguns destinos históricos despublicados (`/verbete/*`, `/fontes`). Eles não são expostos como novos links pelas três páginas; a fase de catálogos/permalinks deverá reconciliar esses destinos com o Router real.
- Layouts compilados cobrem as visualizações das páginas públicas atuais. Componentes antigos não publicados continuam preservados; não se declara eliminação de todo cálculo visual existente no repositório.
- O cache descrito é de sessão/TransferState. A configuração de cache HTTP/CDN e publicação continuam responsabilidade da hospedagem; não houve deploy.
- Artefatos com hash antigos podem permanecer em `generated` entre builds locais. Um build em checkout limpo começa sem eles; o manifesto identifica os recursos da versão ativa.
- Rollback: reverter o commit da fase restaura o modelo de carregamento anterior. Para rollback de conteúdo após a migração, restaurar o manifesto canônico e seus shards versionados correspondentes; não editar hashes nem apagar as capturas brutas.

Validação e medidas: [Dados e carregamento](../quality/DADOS-E-CARREGAMENTO.md).

Referências técnicas consultadas: [resolvers Angular](https://angular.dev/guide/routing/data-resolvers), [TransferState](https://angular.dev/api/core/TransferState) e [hooks de módulos Node](https://nodejs.org/api/module.html#moduleregisterhooksoptions). A implementação foi executada com Node 24.13 e Angular 21 do projeto.
