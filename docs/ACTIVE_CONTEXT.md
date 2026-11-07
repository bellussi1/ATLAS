# Contexto vivo do ATLAS

Atualizado em 07/11/2026. Este é o handoff entre sessões: leia no início, atualize no fim com `/handoff`. Não substitui `AGENTS.md` nem os documentos de arquitetura; registra o estado observado e o que está pendente.

## Estado observado

- Repositório: `C:\Users\Bellussi\Documents\Workspace\ATLAS`.
- Gitflow: `develop` existe no remoto e é a integração; a última rodada publicada é `791a362`. As frentes de zoom, performance do grafo e `publish-raw` estão mescladas localmente e ainda não foram pushadas. `master` não recebeu esta rodada.
- Conteúdo: 13 coleções publicadas no release `45300c5…`; `content/content-pointer.json` atualizado.
- Build local: **1.185 rotas prerenderizadas**.
- CI: `42274140215` falhou em `ingest:fetch-raw` porque os dois novos manifests de captura ainda não tinham blobs publicados no R2. `npm run ingest:publish-raw` foi corrigido e está publicando; reexecutar o run depois do upload.

## Verificações executadas

- `npm test`: **304/304**.
- `npm run test:content`: **171/171**.
- `npm run build`: passou, **1.185 rotas**; `vercel.json` gerado com CSP de 9 hashes.
- `npm run test:e2e`: `e2e/graph.spec.ts` **18/18**; `pages.spec.ts` **19/19** (inclui `/fontes` paginado e o grafo de `#conexoes`); `ideology-sheets.spec.ts` **8/8**; `public-routes` **35/35** em 390/1440, sem achados sérios em `/marxismo` e `/liberalismo`; `editorial-i18n` **6/6** (países, regimes, perfis e conceitos); `knowledge-explorer` (catálogos) **1/1**. `contextual-exploration` segue com **6/7**: liberalismo 1440 falha no y do termo ao voltar (diferença observada de **64 px**); ajustar a estabilidade do painel ou a tolerância do teste.
- `npm run lint` e `npm run typecheck`: passaram.

## O que mudou nesta rodada

1. **Relações e dados**
   - Removidas 15 arestas `P1142` de pessoas; o rótulo continua no Wikidata, mas não vira afiliação.
   - `membro fundador` deixou de ser classificado como `fundou`; 8 relações corrigidas, incluindo Dilma → PDT como "foi membro fundadora de".
   - Relações curadas com fonte literal e `editorialStatus: pending`: Che Guevara → Revolução Cubana, Fidel Castro e Marxismo; Leon Trótski → Revolução Russa, Comunismo, Stalin, Marx e Lenin; Fernando Haddad → Lula (candidatura após o indeferimento).
2. **Pipeline de extração**
   - `scripts/ingestion/wiki-extract/refresh.mjs`: `fetch --refresh` reabre todo artigo gravado sem `targets`, inclusive fora da seleção; antes só reabria o que estava na lista declarada.
   - `scripts/tradicao/extract.mjs`: `reguard` preserva os vereditos de texto já pagos em vez de zerar a métrica.
   - Artigos de `marxismo` e `liberalismo` refeitos com links e capturas registradas em `scripts/ingestion/wiki-extract/raw/`.
3. **Vercel**
   - `vercel.json` versionado na raiz com `framework: null`, `routes` de 404, redirecionamentos novos e headers de segurança; a CSP com hashes continua só no arquivo gerado pelo build.
   - `scripts/infra/vercel-config.spec.mjs` falha se as regras determinísticas dos dois arquivos divergirem.
4. **Leitura e e2e**
   - O capítulo escolhido no seletor mobile não é mais desfeito por uma medição de rolagem anterior à rolagem do roteador.
   - O fixture de e2e espera o fim do event replay (`jsaction`) e serve o conteúdo fixado também nos contextos criados pelos testes; as auditorias pesadas ganharam 60 s de teto.
5. **Zoom inicial do grafo**
   - `/grafos` abre no enquadramento do **grafo inteiro**, e esse enquadramento é o **100%** do HUD.
   - Home, a tecla `0` e o botão "Reenquadrar o grafo inteiro" voltam ao mesmo 100%.
   - Testes: unidade em `graph.component.spec.ts` e asserção de `100%` em `e2e/graph.spec.ts`.
6. **Publicação das capturas**
   - `publish-raw` confere o R2 por HEAD quando o corpo local sumiu e avisa em vez de abortar um recorte antigo; os blobs novos seguem sendo publicados.
   - O script repete HEAD/PUT com backoff quando o R2 responde 429 e faz uma pausa curta entre objetos.
7. **Desempenho do grafo**
   - `graph-batching.ts` junta arestas e pontos do minimapa em poucos `<path>`; cada nó virou um único path, com halos e pulsos em grupos próprios.
   - O cartão de hover só escreve sinal sob um nó e no máximo uma vez por frame; os rótulos usam grade espacial em vez de varrer 1.156 nós por candidato.
   - `knowledgeGraphSchema` indexa revisões por `claimId`; a validação do grafo caiu de **~748 ms para ~80 ms**.
   - Medido em 1440×900: primeiro nó de **~1,7 s para ~1,1 s**, maior tarefa de **~900 ms para ~300 ms**, DOM de **~5.800 para ~2.700** elementos; pan e zoom seguem perto de 60 fps (p95 ~27 ms).
8. **Revisão das leituras de ideologias**
   - As quatro páginas deixaram de narrar a fonte ou a interface ("Segundo o verbete...", "Selecione...") e passaram a explicar o assunto; a auditoria de voz só encontra termos técnicos e o estado `rascunho` das duas leituras em revisão.
   - Palavras por página: **marxismo 1.130**, **liberalismo 933**, **social-democracia 908**, **anarquismo 900**; minutos recalculados por palavra e bloco (19/19/14/14), em vez de 2–8 min por capítulo.
   - `leituras` de social-democracia e anarquismo saiu de `pending` e ganhou roteiro com obras primárias e estudos; `fontes` recebeu título e prosa próprios, sem falar do processo editorial.
   - Conteúdo e ponteiro publicados no release `7fb37afa…`; capturas e páginas conferidas por `content:build`, 171 testes de conteúdo e e2e de páginas/ideologia.
9. **Verbetes: auditoria e bloqueio**
   - 1.158 entidades e 825 relações; **554 sem nenhuma relação**; mediana de **131 palavras** em `sections`; 217 abaixo de 100. Não há campos de ideologia, vertente ou lado político.
   - Piloto de John Locke: US$ 0,006, resumo de 583 caracteres, 2 seções e 3 relações confirmadas. O tradutor não foi usado para publicar: ele (a) reconstrói a coleção inteira a partir de um subconjunto de rascunhos e (b) remove fontes/evidências que outros verbetes ainda usam, deixando `sourceId` pendente.
   - Estado restaurado no release `7fb37afa…`; nenhum conteúdo corrompido foi publicado.
   - Próximo: modo `--partial` no tradutor (preserva registros e funde só o QID do rascunho), desempate que prefere rascunho com seções e, só então, lote de verbetes prioritários. O perfil político (partido, ideologia, vertente, lado) deve ser derivado das relações e exibido com atribuição, sem rótulo inventado.
10. **`/fontes` paginado**

- A lista passou de um artigo por fonte, todos na mesma página, para **linhas compactas** com título, resumo curto, link para a fonte e citações recolhidas.
- **24 fontes por página**, com o pager existente; o HTML prerenderizado de `/fontes` caiu de **4,8 MB para ~195 KB**.
- Links `#source-…` continuam funcionando: o componente descobre a página da fonte, navega para `?pagina=N` e rola até o item, sem restaurar o scroll antigo.
- Teste: `pages.spec.ts` cobre paginação, “Próxima” e deep link para uma fonte da página 2; `public-routes` confirma `/fontes` em 390 e 1440 sem achados sérios.

11. **Grafo compartilhado no capítulo de conexões**
    - O componente do `/grafos` foi promovido para `shared/ui/knowledge-network` (`app-knowledge-network`) e ganhou `embedded`, `scope`, `focus` e `picked`; a rota `/grafos` consome o mesmo componente.
    - Em `/marxismo#conexoes` (e nas demais tradições), o capítulo usa o motor real do grafo limitado ao atlas da tradição — **42 entidades** em `atlas-marx-valor` —, com o conceito raiz selecionado e o enquadramento do atlas como **100%**.
    - O painel de detalhe do grafo fica desligado no capítulo: a seleção no mapa abre a ficha no painel de leitura abaixo, e índice e linha do tempo continuam funcionando. O canvas radial de 920×572 foi removido.
    - No modo embutido o grafo não captura atalhos de teclado fora do próprio componente; a barra fica compacta e o status vira texto acessível.

12. **Regime, país e lugar unificados**
    - O tipo de entidade `place` passou a ser único; `placeType` (`country` ou `regime`) marca apenas os recortes que têm perfil próprio. O grafo agora tem **127 lugares** e nenhum nó `country` ou `regime`.
    - `country` e `regime` continuam aceitos na entrada por um `preprocess` do `entitySchema`, que os converte em `place` com o `placeType` correspondente; capturas e snapshots antigos seguem válidos.
    - O índice de descoberta continua derivando `País` e `Regime` do `placeType`, então `/paises`, `/regimes` e os filtros do acervo preservam os recortes; `/lugares` lista apenas os 123 lugares sem perfil.
    - `/verbete/brasil` e `/verbete/portugal-recorte-constitucional-1976` mantêm os perfis de país e regime; a rede, o card e a linha do tempo usam o mesmo nó de lugar, com rótulo de catálogo quando aplicável.
    - Conteúdo republicado no release `d6ac0ed…`; ponteiro atualizado.

13. **Eventos que eram conceitos**
    - Reclassificados **69 verbetes** de `event` para `concept` em `atlas-verbetes-citados`: os sete exemplos apontados (Aborto, Casamento, Casamento entre pessoas do mesmo sexo, Desigualdade econômica, Estado de direito, Irreligião e Violência) e outros tópicos gerais sem data, como Agnosticismo, Alienação, Coerção, Corrupção, Crime, Crise, Divórcio, Eleição, Globalização, Golpe militar, Guerra civil, Privatização, Salário mínimo, Tortura e Verão.
    - Regra aplicada: só virou conceito o verbete sem data e sem relação que nomeia prática, instituição, processo ou ideia; guerras, revoluções, invasões, eleições datadas, operações, tratados, pandemias e períodos nomeados continuam `event`.
    - O override `conceptualEventIds` do grafo foi removido; a classificação agora vem do dado.
    - `/conceitos` passou a listar esses verbetes e `/acontecimentos` ficou com os acontecimentos históricos nomeados; o release `63fac66…` foi publicado e o ponteiro atualizado.

14. **Posicionamento do grafo por contexto**
    - O layout deixou de agrupar por coleção. Os nós agora são agrupados por **similaridade de texto** (título, resumo e afirmações), com k-means determinístico sobre vetores TF-IDF; as regiões passaram a ser `ctx-…`, não ids de atlas.
    - Links de contexto invisíveis ligam cada verbete aos três textos mais próximos; as relações documentadas continuam com peso maior. Assim, um verbete sem relação ainda fica perto do vocabulário que compartilha com outros.
    - Efeito observado: o antigo grupo `atlas-verbetes-citados` com **896 nós** virou **14 grupos semânticos**, o maior com **167**. Dos **554 nós sem relação**, a mediana de distância até um nó conectado ficou em **51 px** (p90 **75 px**).
    - O painel de legenda passa a explicar que a posição aproxima por vocabulário e ligações, não por distância histórica. Release `45300c5…` publicado; ponteiro atualizado.

15. **CDN de conteúdo e `/fontes` em produção**
    - O Worker `atlas-content-delivery` foi preparado em `scripts/infra/content-delivery.worker.mjs` com binding somente leitura em `atlas-public`; serve `pointer.json`, `c/<sha256>.json` e `m/<sha256>.<ext>` com CORS, `ETag` e cache imutável, sem expor o endpoint S3.
    - O deploy está pendente de credencial Cloudflare Workers (`CLOUDFLARE_API_TOKEN` com Workers Scripts:Edit + `CLOUDFLARE_ACCOUNT_ID`, ou `npx wrangler login`). O endereço padrão será `https://atlas-content-delivery.atlas-bellussi.workers.dev`.
    - Produção ainda serve o `master` antigo: `/fontes` responde **4.847.763 bytes** crus (**634.979 bytes** comprimidos); o build local tem **194.726 bytes**. O `master` mantém `paginated = path !== 'fontes'`; a paginação está no `develop`.
    - Armazenamento do release atual: **24,25 MB brutos** em artefatos, **~3,71 MB gzip + 0,28 MB de mídia ≈ 4 MB** no R2; `dist` do Vercel com **140 MB**. O gargalo é a banda/deploy, não o espaço.
    - Depois do Worker: `switch-content-domain --apply`, `content:publish`, `content:fetch`, build e deploy. O `publish-r2` passou a usar `DEFAULT_CONTENT_BASE_URL`, então o `R2_PUBLIC_URL` local pode continuar no endpoint S3.

16. **Capturas cruas: gzip e ciclo de vida**
    - O bucket não tinha 438 MB: a listagem do prefixo `raw/` em 06/11/2026 mostrou **16.058 objetos e 9,6 GB**, perto do limite gratuito de 10 GB do R2. A maior parte é JSON sem compressão.
    - `publish-raw` passou a gravar novos objetos com `Content-Encoding: gzip`; `npm run ingest:compress-raw -- --apply` recompacta os antigos sem mudar a chave SHA-256 do JSON descomprimido. A migração terminou: **13.171 objetos** recompactados; o prefixo `raw/` caiu de **9,6 GB para 1,58 GB** (16.058 objetos) e o hash descomprimido continua batendo.
    - A regra de ciclo de vida de **90 dias** para `raw/` está em `scripts/infra/raw-lifecycle.json`. A chave S3 atual responde **403** ao lifecycle; é preciso um token **Workers R2 Storage:Write** e `npx wrangler r2 bucket lifecycle set atlas-public --file scripts/infra/raw-lifecycle.json`, ou `wrangler login`.
    - `npm run infra:raw-prune -- --keep 20` mostra o plano de manter as 20 capturas mais recentes; `--apply` apaga o resto. Em 06/11 o plano de `--keep 20` removia **3.361 objetos / 3,16 GB** antes do gzip, mas capturas antigas deixariam de ser reexecutáveis; não foi aplicado.
    - Próximo: aplicar o lifecycle com o token e decidir se a poda por contagem será usada; o gzip já reduziu o bucket para 1,58 GB.

## Piloto de modelo (Anthropic)

Amostra de 20 artigos de `marxismo` e `liberalismo`, com os artigos já contendo `targets` (`amostra-20v2`):

| Braço              | Custo     | Relações aceitas | Com QID | Rejeição | Citações rejeitadas |
| ------------------ | --------- | ---------------- | ------- | -------- | ------------------- |
| Haiku 5.5 `low`    | US$ 0,021 | 6                | 5       | 80,0%    | 3,7%                |
| Haiku 5.5 `medium` | US$ 0,038 | 23               | 18      | 62,9%    | 2,4%                |

- Custo por relação útil: **US$ 0,0042** em `low` e **US$ 0,0021** em `medium`.
- `medium` rende cerca de duas vezes mais relações com QID por dólar; `model-choice.json` já fixa Haiku `medium` para extração e Sonnet `low` para relações.
- `score` respondeu "insuficiente": faltam 40 itens conferidos por pessoa em cada braço. Nenhum modelo foi alterado.
- DeepSeek não foi medido: não há chave `DEEPSEEK_API_KEY` no ambiente. Não usar a assinatura Go para lote de dados.

17. **Carregamento do grafo e retenção de releases**
    - `/grafos` passou a usar `loadNetworkGraph()`/`networkContentResolver`: baixa as coleções e `layouts` e não baixa `search` (9,5 MB) nem `adjacency` (744 KB). Se uma rota de catálogo abrir depois, o mesmo repositório completa o pacote sem repetir as coleções.
    - Medição no release `45300c5…`: o pacote do grafo caiu de **24,1 MB brutos / 3,66 MB gzip** para **13,8 MB / 1,92 MB**; o HTML prerenderizado de `/grafos` ficou em **92 KB**.
    - Testes: unidade em `content-repository.service.spec.ts` e `e2e/content-loading.spec.ts` verificam que `search` e `adjacency` não são pedidos em `/grafos`; `e2e/graph.spec.ts` **18/18**.
    - `npm run infra:prune-releases` mantém o ponteiro atual e os três releases anteriores distintos, a partir do histórico de `content/content-pointer.json`; o padrão é dry-run e `--apply` apaga só objetos de `c/` e `m/`. Executado em 06/11: **92 objetos / 19,9 MB** removidos; restaram **30 objetos em `c/` e 3 em `m/`**, com o release atual conferido por HEAD.
    - O Worker `atlas-content-delivery` e o lifecycle de `raw/` continuam aguardando o token Cloudflare; o `r2.dev` segue como origem pública.

18. **Cloudflare Pages preparado**
    - `npm run infra:pages:check` valida o build contra os limites do plano gratuito (20.000 arquivos, 25 MiB por arquivo) e `npm run infra:pages` publica `dist/atlas/browser` em `atlas-bellussi.pages.dev`.
    - O build em 06/11/2026 tinha **1.242 arquivos, 133,7 MB** e o maior arquivo em **0,86 MB**. `_headers`, `_redirects` e `404.html` já são o contrato nativo do Pages.
    - Falta apenas criar o projeto e publicar com uma credencial Cloudflare (`npx wrangler login` ou token com Pages Edit). O R2 continua como origem do conteúdo; `ATLAS_CDN_URL` não muda.

19. **Leituras contínuas: skill, conexões e verbete**
    - Nova skill `atlas-create-reading` decide entre leitura e verbete, adapta os 12 capítulos a pessoa, acontecimento, instituição, período ou conceito, exige fontes acadêmicas e caso brasileiro e limita as conexões a cinco. `atlas-create-ideology` e `atlas-pipeline-tradicao` apontam para ela.
    - `docs/research/readings-map.md` planeja o cluster Governo Vargas, Trabalhismo, Golpe de 1964, Ditadura militar e Brizola/PDT, com entidades existentes, fontes a verificar e ordem sugerida. Nada foi publicado.
    - As quatro leituras ganharam casos brasileiros em "Situar" e "Avaliar": marxismo **1.471 palavras**, liberalismo **1.216**, social-democracia **1.163**, anarquismo **1.169**. Foram adicionadas fontes acadêmicas (História do Marxismo no Brasil, Caio Prado, Florestan Fernandes, Angela de Castro Gomes, Edilene Toledo, José Murilo de Carvalho, CPDOC, Constituição de 1988) e 3 conexões curadas por leitura.
    - Os rascunhos de social-democracia e anarquismo continuam `rascunho`; a promoção exige revisão humana registrada. A revisão de IA permanece `assistant`.
    - Existem **51 esqueletos automáticos** de ideologias com narrativa de reserva (por exemplo, `trabalhismo`, 131 palavras); eles não contam como leitura publicada e não entram em rotas, prerender ou `ideologyReadings` antes de pesquisa.
    - O verbete ganhou tempo de leitura e contagem de seções, um bloco "Este verbete tem contexto maior" com link para a leitura contínua e "Voltar ao topo"; o mapa de entidades para leitura foi ampliado.
    - A página de leitura termina com "Conexões desta leitura" (3 a 5, com razão) e o teste de dados garante que nenhum rascunho ou auto-link apareça.
    - Verificações: `content:build` gerou o release local `869446f…` (não publicado; o ponteiro continua em `45300c5…`); `test:content` **179/179**; `npm test` **306/307** (o timeout de `knowledge-network.spec.ts` passou **17/17** isolado); `typecheck` e `lint` exit 0; unidade de leituras **6/6**; `build` **1.185 rotas**; `e2e/pages.spec.ts` **20/20** e os dois testes focados de conexões/verbete **2/2**.

20. **Consolidação parcial e piloto de 20**
    - `wiki-drafts-to-collections.mjs` ganhou `--partial --only <id>`: lê todas as coleções, **não remove** registros, funde pelo QID, anexa QID por título quando falta, deduplica por ID e grava só as coleções alteradas. `--dry-run` mostra o plano.
    - Desempate de rascunhos agora usa **seções, datas, relações e resumo**; claims não decidem mais qual rascunho fica.
    - Piloto: **20 artigos de liberalismo** extraídos com Haiku médio + Sonnet baixo; **18 ficaram com seções**; custo real **US$ 0,078** (estimativa era US$ 0,29 no pior caso). Restam cerca de **US$ 6,02** do teto de US$ 6,10.
    - A consolidação parcial dos 20 anexou **684 registros** a 3 coleções (`atlas-liberalism`, `atlas-liberalismo`, `atlas-marx-valor`), sem perder entidades nem registros antigos: entidades 27→27, 12→12 e 42→42; os claims subiram de 40→159, 8→39 e 100→112.
    - Os 20 rascunhos ricos foram publicados no bucket privado `atlas-drafts` (`wiki/liberalismo/`), que passou a ter **41 objetos** incluindo o índice.
    - A Onda 2 continua ausente: `wiki/verbetes-citados/index.json` responde **404** e não há prefixo `wiki/verbetes-citados` no `atlas-drafts`; os 92 objetos existentes são de anarquismo, liberalismo, marxismo e social-democracia.
    - Verificações após a consolidação: `content:build` release local `26998099…`; `test:content` **182/182**; `npm test` **308/308**; `typecheck` e `lint` exit 0; `build` **1.185 rotas**. O ponteiro público continua em `45300c5…`; nada foi publicado no `atlas-public`.

21. **Termos clicáveis dentro da ficha de contexto**
    - O texto do painel (`summary`, parágrafos e seções) agora transforma termos do grafo em botões: clicar em "meios de produção", "classe" ou "Bakunin" abre outra ficha no mesmo painel, com o mesmo percurso e o botão Voltar.
    - A lista usa títulos e aliases do grafo, mas descarta rótulos ambíguos; `classe`, `Bakunin`, `Kropotkin`, `Marx`, `Engels` e `Weber` têm formas curtas curadas. Se um alias aparecer em dois registros, o título único resolve; sem título único, o rótulo não vira link.
    - O painel limita a **6 termos por parágrafo**, ignora a própria entidade e mantém o foco no título da nova ficha quando não há conexão correspondente. O componente compartilhado é `app-context-text`.
    - O botão **“Fixar para comparar”** foi removido, junto com a coluna fixada e o estado de comparação. O painel mantém Anterior/Próximo, percurso e Voltar.
    - Testes: unidade de vocabulário, do componente e do painel **13/13**; e2e de enciclopédia **7/7**, incluindo Proletariado → “meios de produção” → Voltar; e2e de fichas **8/8**.

22. **Linha do tempo vertical em `#epocas`**
    - `app-era-chart` deixou de ser um gráfico horizontal com faixas, barras de vida, marcadores absolutos e carrossel. Agora é uma lista vertical ordenada: cada época tem anos, título, contexto, registros datados e pessoas vivas no intervalo.
    - A linha vertical usa trilho e marcadores; a época selecionada expande no lugar. Não há zoom, pan, régua, sobreposição de rótulos nem rolagem horizontal.
    - O bloco `timeline` duplicado foi removido de `content/ideologies/marxismo/page.json`; `A riqueza das nações` passou para `markerIds` da cronologia, para não perder o registro.
    - `docs/design/PAGE_STANDARD.md` registra a decisão: timeline de época é vertical; eixo horizontal fica restrito ao atlas quando o recorte temporal for o objeto.
    - Verificações: unidade de `era-chart` **5/5**; `e2e/pages.spec` teste de épocas **1/1**; `e2e/encyclopedia` timeline e régua **3/3**; screenshots locais em 1440 e 390 confirmaram o trilho vertical e a ausência de overflow horizontal.

23. **Revisão de capítulo redesenhada**
    - O bloco deixou de ser um `details` solto com a pergunta como resumo e cartões grandes de verbete. Agora tem cabeçalho “Revisão do capítulo”, explicação curta e duas partes: **Pergunta** e **Dois capítulos atrás**.
    - A resposta fica oculta até “Mostrar resposta”; “Ocultar resposta” a recolhe. Os registros antigos viraram links compactos com “Abrir ficha”.
    - Componente próprio `app-chapter-review`, com IDs únicos por instância e foco visível; a página de ideologia não carrega mais os estilos e imports antigos.
    - Verificações: componente e util **3/3**; `npm test` **315/315**; `e2e/pages.spec` **22/22**, incluindo o novo teste de revisão; `build` **1.185 rotas**; `lint` e `typecheck` exit 0.

24. **Galeria “Ver todos” corrigida**
    - O `[hidden]` dos cards era anulado por `:host { display: flex }` no `appRecordCard`; os cards além dos seis continuavam visíveis e o botão parecia não funcionar.
    - `record-card.component.scss` agora tem `:host([hidden]) { display: none }`. O conserto vale para todas as galerias, inclusive `vertentes-2-gallery`.
    - Teste e2e novo em `#pensadores`: 6 cards visíveis, “Ver todos” mostra o total e “Mostrar menos” volta a 6. `e2e/pages.spec` **23/23**; `lint` exit 0.

25. **Seleção no grafo e ficha sincronizada**
    - Selecionar um nó deixou de ser um filtro: o mapa inteiro continua visível e só o hover ilumina a vizinhança. O nó selecionado ganha anel permanente (com raio medido em tela) e rótulo em vermelho; a seleção não apaga mais o contexto.
    - Clicar num nó não aproxima mais para 450%: a vista fica parada. A busca ainda revela o resultado (pan no capítulo, enquadramento em `/grafos`) e fecha a lista. `filterNetwork` passou a puxar para o recorte os endpoints das relações do atlas, então a raiz e as suas ligações aparecem: social-democracia **96 nós/77 ligações**, marxismo **52**, liberalismo **38**.
    - O painel flutuante do capítulo mostra “Ver ficha” e “Verbete”; “Ver ficha” rola até a ficha e foca o título. A ficha ganhou “Abrir verbete” no topo.
    - No mobile o HUD não é mais escondido quando há seleção; o pill e o zoom cabem em duas linhas e o enquadramento reserva espaço para eles, então nenhum rótulo fica atrás do pill.
    - O cartão de hover diz “Aproxime para ler N ligações” quando as frases ainda não estão visíveis, em vez de afirmar que não há ligações; o dimming do hover ficou em **0.4** para nós e **0.18** para arestas.
    - Hover e clique passaram a resolver o **nó mais próximo pelo centro**, com alcance de 16 px na tela, em vez de depender da ordem do DOM entre a forma e o círculo de clique. A forma não recebe mais o ponteiro; o crescimento de 1.22 no hover não devolve o evento e não pisca. O círculo continua dando o alvo acessível, e o cartão, o dimming e o clique apontam para o mesmo nó.
    - Verificações: `npm test` **317/317** (56 arquivos); `typecheck` e `lint` exit 0; `build` passou com o aviso de orçamento do SCSS do grafo (18 kB; 19,43 kB); `e2e/pages.spec.ts` + `e2e/graph.spec.ts` **41/41**; a rodada anterior dos seis specs (pages, graph, encyclopedia, ideology-sheets, carousel, liberalism-atlas) tinha **65/65**. Diagnóstico de hover em `/marxismo#conexoes` e `/grafos` manteve **1 estado** estável em 25 amostras e o cartão do nó correto. Nada foi publicado; o ponteiro segue em `45300c5…`.
    - O aviso de orçamento do SCSS é anterior a esta rodada e não falha o build (`maximumError` 20 kB); se o componente crescer, dividir estilos ou rever o limite.

26. **Code scanning do GitHub**
    - Em 07/11/2026 a página tinha **6 alertas abertos** no `master` (`b50675e`): 4 de `js/incomplete-url-substring-sanitization` nos scripts de ingestão, 1 de `js/bad-tag-filter` em `security-headers.mjs` e 1 de `js/identity-replacement` em `e2e/pages.spec.ts`.
    - `scripts/ingestion/wikimedia/hosts.mjs` passou a ler o `hostname` com `new URL`, com `isWikidataHost` e `isCommonsHost`; `archive.mjs`, `wiki-extract/http.mjs` e `pipeline.spec.mjs` usam o helper em vez de `url.includes(...)`.
    - O extrator de hashes CSP em `security-headers.mjs` passou a aceitar o fim de tag que os navegadores aceitam, como `</script >` e `</script foo="bar">`; o build continua gerando **8 hashes**.
    - O `identity-replacement` já não existe no `develop` (o teste foi reescrito); o `master` ainda tem a versão antiga. O CodeQL só fecha os alertas depois de uma análise no `master`, então esta correção precisa chegar lá por merge ou PR.
    - Verificações: `npm run test:ingestion` **68/68** (inclui `hosts.spec.mjs`), `npm run test:content` **182/182**, `npm run lint` exit 0 e `npm run build` exit 0 com **8 hashes** de CSP.

## Pendências que bloqueiam

1. **CI** — depois do upload dos blobs, reexecutar `gh run rerun 42274140215 --failed` e confirmar `verify`; lint, typecheck, 301 testes e 18 e2e do grafo já passaram localmente.
2. **Suíte e2e completa** — `contextual-exploration` (liberalismo 1440) falha no y do termo ao voltar (diferença de **64 px**), embora o scroll volte ao lugar. Corrigir a estabilidade do painel ou a tolerância do teste antes de considerar a rodada verde.
3. **Produção na Vercel** - o `vercel.json` da raiz só vale no próximo deploy. O job `deploy` do CI continua inerte porque `VERCEL_PROJECT_ID` não existe; falta criar o token e os IDs (ver `docs/operations/PRODUCAO.md`). Enquanto o `master` não receber a paginação, `/fontes` segue em 4,8 MB; o Worker de conteúdo também aguarda token Cloudflare.
4. **Probe de 404** — hoje `https://atlasbr.vercel.app/caminho-inexistente` responde 200 com `index.html`; o `uptime.yml` falha por isso. Só verificar depois do deploy.
5. **Verbetes** — o modo `--partial` e o desempate por conteúdo foram implementados e testados; o piloto de 20 anexou registros sem perder os antigos. Falta o lote maior (bloqueado pela Onda 2 ausente), a revisão humana dos 20 e o perfil político derivado das relações (partido, ideologia e vertente; “lado” só com classificação atribuída).
6. **Onda 2 ausente** — `wiki/verbetes-citados/index.json` responde **404** e não há prefixo `wiki/verbetes-citados` no `atlas-drafts`; os 92 objetos existentes são de anarquismo, liberalismo, marxismo e social-democracia. Sem os 414 artigos/896 extratos não há lote maior neste checkout.

## Pendências que pedem decisão

4. **Onda 2 do conteúdo** — 414 artigos e 896 extratos (~US$ 1,65) não estão neste checkout; faltam imagens, conversão, testes e relatório. Não publicar sem aprovação.
5. **Release `0.1.0`** — `release/0.1.0` contém o fluxo; falta CI verde para ativar proteções e release. Decidir se `develop` segue para `master` nesta rodada.
6. **Revisão humana** — as relações curadas e os 109 itens de `generated/eval/amostra-20v2/revisao.md` continuam pendentes.

## Protocolo

- Toda sessão que muda estado termina com `/handoff` ou atualização manual deste arquivo.
- Registre comando executado e resultado; não registre suposição como verificação.
- Links para arquivos e commits, não para transcrições.
