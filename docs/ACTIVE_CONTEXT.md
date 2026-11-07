# Contexto vivo do ATLAS

Atualizado em 07/11/2026. Este é o handoff entre sessões: leia no início, atualize no fim com `/handoff`. Não substitui `AGENTS.md` nem os documentos de arquitetura; registra o estado observado e o que está pendente.

## Estado observado

- Repositório: `C:\Users\Bellussi\Documents\Workspace\ATLAS`.
- Gitflow: `develop` é a integração; a última alteração registrada é `eed3d28`. A auditoria integrada desta sessão entra em commit local, sem push; `master` não recebeu a rodada.
- Conteúdo: 13 coleções; release local `eae46644…`; o ponteiro público continua em `a54eee…` e nada foi publicado.
- Build local: **1.189 rotas prerenderizadas**.
- CI: não executado nesta sessão; a verificação abaixo é local.

## Verificações executadas

- `npm test`: **357/357**.
- `npm run test:content`: **186/186**.
- `npm run build`: passou, **1.189 rotas**; `vercel.json` gerado com CSP de 8 hashes.
- `node node_modules/@playwright/test/cli.js test e2e/pages.spec.ts e2e/graph.spec.ts`: **55/55**, incluindo a ausência do minimapa, a roda no grafo embutido, o encerramento em cards e as auditorias Axe.
- `npm run lint` e `npm run typecheck`: exit 0.

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

18. **Cloudflare Pages publicado**
    - `npm run infra:pages:check` valida o build contra os limites do plano gratuito (20.000 arquivos, 25 MiB por arquivo) e `npm run infra:pages` publica `dist/atlas/browser` em `atlas-bellussi.pages.dev`.
    - O build de 07/11/2026 tem **1.248 arquivos, 135,8 MB** e o maior arquivo em **0,84 MB** (`leitura/marxismo/index.html`); `_headers`, `_redirects` e `404.html` são o contrato nativo do Pages.
    - Deploy concluído em 07/11/2026 (`https://a732d526.atlas-bellussi.pages.dev`, alias de produção `https://atlas-bellussi.pages.dev`): `/leitura/marxismo` responde **200**, `/marxismo` e `/marxismo/mesa` chegam ao mesmo destino via 301, `/fontes` serve **193 KB** e `/acervo?q=lula` responde 200.
    - O Pages normaliza diretórios com **308** para a barra final; o canonical do app continua sem barra. É um salto a mais, não um erro de rota.
    - `pages-deploy.mjs` passou a montar o comando com quoting no Windows, porque `spawnSync('npx.cmd')` sem shell falhava com `EINVAL`.

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
    - O `identity-replacement` já não existia no `develop` (o teste foi reescrito); o `master` tinha a versão antiga. A correção foi integrada ao `master` em `8779f92` (merge de `develop`) e enviada para `origin/master`; o run CodeQL `42336831876` concluiu com sucesso e a API mostra **0 alertas abertos / 6 corrigidos**.
    - Verificações: `npm run test:ingestion` **68/68** (inclui `hosts.spec.mjs`), `npm run test:content` **182/182**, `npm run lint` exit 0 e `npm run build` exit 0 com **8 hashes** de CSP. O push também disparou a Verificação `42336831871`, que ainda estava em andamento na última consulta.

27. **Capturas gzip no `ingest:fetch-raw`**
    - A Verificação `42336831871` do merge falhou em `npm run ingest:fetch-raw` com `Falha de integridade` na resposta `acbba493…` da captura de liberalismo.
    - O Worker entrega o objeto do R2 com `Content-Encoding: gzip`; o cliente recebia os bytes comprimidos e comparava com o SHA-256 do JSON original. O blob local está descomprimido e confere.
    - `decodeRawBody` em `scripts/ingestion/wikimedia/raw-store.mjs` descompacta pelo magic gzip; `fetch-raw.mjs` usa o helper antes do hash. Teste novo em `raw-store.spec.mjs`.
    - Verificado contra o Worker: **1.215 bytes comprimidos → 4.599 bytes**, SHA-256 igual ao manifesto. `test:ingestion` **69/69**; `lint` exit 0.

28. **Triagem de issues (07/11)**
    - Fechadas com evidência: **#5** (Anarquismo publicado, 12 capítulos/45 fontes), **#7** (Social-democracia, 12 capítulos/70 fontes), **#29** (paleta e leituras por dados em `ideology-readings.ts`), **#30** (precisão de datas no `EraChartComponent`) e **#11** (previews Vercel por PR).
    - **#35** ficou aberta com comentário: falha do R2, catálogo vazio e rota desconhecida já têm E2E; falta o caso explícito de `/verbete/<inexistente>`.
    - Novas: **#46** (o `ingest:verify` falha na captura `liberalism/2026-11-01-remoto`, bloqueando a Verificação do master e os PRs) e **#47** (Dependabot agrupa majors incompatíveis de Angular/TypeScript/Tailwind/Vitest/jsdom).
    - **#42** e **#43** foram fechadas sem merge: Angular 22 exige TypeScript `>=6.0 <6.1` e o grupo dev-tools sobe TypeScript para 7, incompatível com Angular 21. Ver #47.

29. **Branchs e proteção do master**
    - Remotas excluídas por já estarem totalmente contidas no `master` (`ahead=0`): `chore/gitflow-ci`, `claude/loving-khayyam-d2ccc9`, `claude/padrao-texto-contexto-6caf9d`, `codex/atlas-editorial-marxismo`, `codex/atlas-v4`, `docs/compactar-documentacao` e `feat/ideologia-leve-e-gerador`.
    - Ficaram no remoto `master`, `develop` e as 9 branches do Dependabot, incluindo as dos PRs #42/#43 já fechados. As branches locais e dos worktrees não foram apagadas; o link de branches do GitHub lista só as remotas.
    - `master` agora exige PR, checks `verify`, `secrets` e `CodeQL`, branch atualizada, conversa resolvida, sem force push e sem deleção; `enforce_admins` ativo. Aprovações obrigatórias ficam em **0** porque há um mantenedor; elevar para 1 quando houver um segundo revisor.
    - `delete_branch_on_merge` e `allow_update_branch` ativados. O perfil comunitário segue em **100%** (README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, PR template e issue templates).
    - Segurança: **private vulnerability reporting** e **Dependabot security updates** ativados (vulnerability alerts habilitados antes); secret scanning e push protection já estavam ligados.

30. **Origem do conteúdo no Worker**
    - `atlas-content-delivery` publicado (`Version ID c49f1d30-3e94-4a3a-a47e-681d6d12d2f9`) em `https://atlas-content-delivery.atlas-bellussi.workers.dev`, com binding somente leitura em `atlas-public`.
    - `switch-content-domain --apply` trocou a constante do app, o ponteiro local e a CSP para essa origem.
    - `content:publish` publicou o release **a54eee7274…** e gravou o `pointer.json` com `baseUrl` novo; `content:fetch` reaproveitou o cache (0 de 21 baixados) e o `build` passou.
    - `ATLAS_CDN_URL` atualizado para o Worker.
    - Verificado: `pointer.json` com `Cache-Control: public, max-age=0, must-revalidate`; artefato `c/<sha>.json` com `max-age=31536000, immutable`; CORS `*`; `OPTIONS` 204; `Content-Encoding: gzip` quando `Accept-Encoding: gzip`. `e2e/content-loading.spec.ts` **4/4**.
    - A produção do site continua no build antigo até um PR/deploy; a `master` protegida exige `verify`, `secrets` e `CodeQL`, e a Verificação ainda falha na captura remota da issue #46.

31. **Busca por nome**
    - A busca do acervo deixou de varrer o texto inteiro: `explorerEntries` e `filterDiscoveryIndex` comparam o termo com título, aliases e títulos traduzidos aprovados.
    - Registros que apenas citam o termo entram só quando nenhum nome corresponde, com o aviso “Nenhum nome corresponde a …” e ordem por relevância (título exato, prefixo, alias exato, prefixo, contém).
    - “Lula” passou de **40** resultados para **4** (pessoa, prisão e duas fontes homônimas); “Federative” continua encontrando Brasil pela tradução aprovada, via fallback de texto.
    - Verificações: `npm test` **318/318**; `lint` e `typecheck` exit 0; `build` passou; e2e de `knowledge-explorer`, `editorial-i18n` e `route-focus` **21/21**; `test:content` sem falhas.

32. **Rotas de leitura, Worker `raw/` e capturas aposentadas**
    - A migração para `/leitura/:slug` foi commitada (`0086631`), com `vercel.json` alinhado em `25eebd1`; a entrega do Worker descompactado foi commitada em `ed25192`.
    - O Worker agora serve `raw/<sha256>.bin` (deploy `e1be72c7`), necessário para `ingest:fetch-raw` reidratar as capturas a partir do Worker em vez do `r2.dev`.
    - A issue **#46** foi tratada aposentando as capturas cujo replay diverge do `snapshotHash`: `liberalism/{2026-11-01-remoto,2026-11-01-retratos,2026-11-03-descoberta}` e `marxism/{2026-11-01-retratos,2026-11-02-remoto,2026-11-03-descoberta}`. Cada uma tem `retired.json` com issue, data, motivo e hash; `ingest:verify` registra e segue; `ingest:fetch-raw` não baixa blobs delas. As duas capturas `preserve` seguem verificadas.

- A divergência também ocorre com o código de 03/11 (`aef543c`), o que indica snapshot gerado fora do estado commitado; a cobertura `refresh`/`remote` só volta com nova captura.
  - `fetch-raw` passou a copiar para `generated/raw-cache` o corpo local que existia só nos blobs de uma captura; antes ele pulava o download e as outras capturas ficavam sem blob. Depois disso, `ingest:fetch-raw` baixou **15.135 de 15.979** respostas e `ingest:verify` passou: 2 capturas Wikimedia reproduzidas duas vezes sem rede e 26 capturas Wikipedia conferidas.

33. **Hierarquia de rótulos do grafo**
    - `/grafos` deixou de ordenar nomes por `degree` bruto. `labelRelevance()` pondera arestas `stated`, `editorial`, `catalogue` e `navigation`, vizinhos distintos por natureza, presença em coleções e estado editorial; navegação não vale ponto.
    - Zoom semântico: 12 nomes no global (< 175%), 24 no intermediário e 36 no local, com histerese (145/175 e 300/350), bônus para nomes já visíveis, filtro da área visível, distribuição em grade 4×3 e oito posições de colocação.
    - Nós pequenos (grau < 8 e raio < 10 px) podem passar sob um nome; nós grandes continuam bloqueando. Rótulos visuais seguem `aria-hidden`; cada nó mantém nome acessível.
    - Medição: 1440 px passou de 13 para 12 nomes no global, máximo por célula de 6 para 4, sem sobreposição; os nomes agora incluem ONU, Otan, Maquiavel, Karl Marx e Max Weber. Em 390 px, 2 → 3. No intermediário, 21 nomes em 1440 e 11 em 390 (antes 14 e 1).
    - Plano, alternativas, pesos e limites em `docs/design/GRAFO-ROTULOS.md`. Testes: `knowledge-network.spec.ts`, `network-labels.spec.ts`, componente e `e2e/graph.spec.ts` **19/19**; `npm test` **326/326**; lint e typecheck exit 0; build passou.

34. **Anarquismo no pipeline**
    - `content/traditions/anarquismo.json` registra QID Q6199, recorte, 8 sementes e `Category:Anarchism`; o estágio 1 derivou as sementes e gravou `identity.palette: "anarquismo"` na leitura.
    - A cobertura continua com 10 relações no escopo da leitura (o atlas tem 59, mas 49 ligam entidades de outros atlas). Fechar o piso exige ampliar o escopo editorial ou rodar captura + extração rica; a extração é paga e não foi executada.

35. **Ficha lateral do nó no grafo**
    - Ao selecionar um nó, a ficha mostra a imagem licenciada do registro (`entityMedia` + `contentMedia`) com atribuição, licença e página do arquivo. Sem imagem, entra a ilustração geométrica da mesma entidade e paleta usadas no verbete.
    - A seção “Caminho entre verbetes” foi removida, junto com o estado, os atalhos `C`, o cálculo `shortestPath` e os testes correspondentes.
    - “Ligações” virou uma lista de cartões compactos: ícone do tipo, verbo em caixa alta, título, seta, razão em até três linhas, natureza e fonte com link externo.
    - “Ler resumo completo” agora é um botão de largura total, com borda, contraste invertido quando aberto e ícone que vira “×”.
    - O orçamento de estilo por componente subiu de 18/20 kB para 20/22 kB (`angular.json`) porque a ficha somou cerca de 1 kB e o build passou a exceder 20 kB.
    - Verificações: `npm test` **325/325**, `e2e/graph.spec.ts` **18/18**, `lint` e `typecheck` exit 0, `build` passou.

36. **Tipos de nó e de ligação no grafo**
    - Dez famílias de nó, agrupadas em Pessoas e ideias, Obras e acontecimentos e Instituições e territórios. Países e formações políticas deixaram de se misturar com Lugares e Organizações.
    - `networkKindOfEntity` passou a ler `placeType` e a descrição (“País…”, “Capital…”); overrides revisados corrigem 50 registros que a captura classificou como instituição/conceito.
    - As 11 famílias de ligação viraram 7: Influência, Ruptura, Atuação, Criação, Continuidade, Relação documentada e Conexão. O verbo exato continua na ficha.
    - A legenda ganhou grupos, tiles com moldura, forma colorida e índice `01`–`10`; o estado desligado não depende só da cor.
    - Contagens após a revisão: Países 69, Lugares 79, Organizações 153, Conceitos 251, Formações políticas 3; ligações Influência 132, Ruptura 77, Atuação 47, Criação 53, Continuidade 7, Relação documentada 308, Conexão 212.
    - A classificação de origem continua ampla; os overrides são dívida declarada em `docs/design/GRAFO-TIPOS.md` e pedem uma onda de dados.
    - Verificações: `npm test` **325/325**, `e2e/graph.spec.ts` **18/18**, `lint` e `typecheck` exit 0, `build` passou.

37. **Desempenho do zoom em `/grafos`**
    - O perfil do Chrome mostrou que o custo não estava no JavaScript: `ScriptDuration` ~0,3 s contra `TaskOtherDuration` ~7,6 s por sequência de zoom. Repintar e testar o ponteiro sobre 1.156 nós e seus alvos invisíveis dominava o frame.
    - Mudanças no componente compartilhado: culling de nós e arestas fora da viewport (com margem de 96 px), minimapa separado do `view()` para não recalcular os pontos a cada frame, eventos de wheel coalescidos em um `requestAnimationFrame`, `--node-scale` no grupo `.nodes` e cartões opacos sem `backdrop-filter`.
    - Os círculos `.node-hits` foram removidos: o clique, o hover e o duplo clique resolvem o nó por `nodeAt()` com alcance mínimo de 16 px na tela. As formas continuam acessíveis por teclado e o teste e2e de clique ao lado do ícone segue passando.
    - Benchmark local em 1440×900, 45 passos de wheel (`generated/bench-zoom.mjs`, não versionado): de **31.474 ms** de long tasks, máximo **628 ms** e **71** intervalos acima de 100 ms para **865–937 ms**, máximo **102 ms** e **1** intervalo. O culling reduziu os nós desenhados de 1.156 para 541 em 286% e 66 em 817%.
    - `selectedVisible` deixou de depender de `drawnNodes()` para não criar ciclo de computação com `insets()`; antes da medição do palco, nenhum nó é descartado.
    - Verificações: `npm test` **325/325**, `e2e/graph.spec.ts` **18/18**, `lint` e `typecheck` exit 0, `build` passou.

38. **Flash ao paginar e filtrar o acervo**
    - Com `/acervo` rolado, paginar ou trocar o tipo devolvia a página ao topo por um frame antes de restaurar a posição; o cabeçalho aparecia e sumia.
    - O roteador zera o scroll da nova entrada dentro do evento `Scroll`; o componente restaurava a posição em `setTimeout`, depois da pintura. A restauração passou a usar `queueMicrotask`, que roda depois de todos os listeners do mesmo evento e antes da pintura.
    - Teste e2e novo em `e2e/pages.spec.ts` grava `scrollY` a cada `requestAnimationFrame` ao paginar e ao trocar de tipo; falha se algum frame cair abaixo de 200 e foi confirmado falhando com o `setTimeout` anterior.
    - Verificações: `npm test` **325/325**, `e2e/pages.spec.ts` **26/26**, `lint`, `typecheck` e `build` exit 0.

39. **Ficha de contexto: ações compactas e fontes separadas**
    - O “Fechar” virou um X de 44×44 com `aria-label` e tooltip; a leitura em ordem passou de uma linha fixa de 55 px para um grupo `‹ 1 de 6 ›` na linha existente de atalhos “Conexões/Fontes”. No cabeçalho o grupo empurrava o título e subia a altura para 188 px; na linha de atalhos ele não acrescenta altura fixa.
    - No telefone, o contador “1 de 6” fica oculto e os rótulos acessíveis dos botões (“Anterior, registro 1 de 6”) mantêm a posição; o grupo cabe na mesma linha de atalhos.
    - O fim da ficha passou a ter dois blocos explícitos: **Fontes** (título, URL e edição) e **Licenças e créditos** (texto e imagem), com tipografia de leitura em vez do bloco compacto em mono. A citação “Fonte:” de cada relação continua junto da evidência.
    - Verificações: `npm test` **325/325**, `e2e/encyclopedia`, `e2e/ideology-sheets` e `e2e/contextual-exploration` **22/22**, `lint`, `typecheck` e `build` exit 0.

40. **Curadoria das imagens de abertura**
    - As imagens do topo de `/leitura/:slug` deixaram de ser as quatro primeiras pessoas com retrato. Cada dossiê declara `poster.figures` com `entityId`, `assetId`, `label`, `note`, `frame`; o componente só resolve os IDs e mantém a composição compartilhada.
    - Marxismo abre com Marx, Engels, Manifesto Comunista e Comuna de Paris; Liberalismo com Locke, Montesquieu, Adam Smith e a Declaração de 1789; Anarquismo com Proudhon, Bakunin, Kropotkin e Goldman; Social-democracia com Bebel, Bernstein, Jaurès e Palme.
    - `validateIdeologyDossier` recusa imagem sem vínculo com a leitura, asset de outro registro, licença/reprodução/crédito/link ausentes e imagem repetida. `planPageMedia` reserva os assets da abertura para não repeti-los num cartão de capítulo.
    - Sem curadoria, o fallback usa os registros mais citados na página, no máximo duas pessoas e um registro de cada outro tipo; o bloco de créditos se chama “Imagens: créditos” e declara a seleção automática. A grade aceita 1 a 4 imagens, com molduras e dimensões estáveis.
    - Créditos, licença, link do arquivo e a razão editorial ficam em “Imagens: créditos e critério”, recolhido sob as imagens; a atribuição também continua no registro do atlas e na ficha do verbete. Regras e escolhas em `docs/design/IMAGENS-DE-ABERTURA.md`.
    - Verificações: `npm test` **334/334**, `npm run test:content` **184/184**, `e2e/pages.spec.ts` + `e2e/ideology-sheets.spec.ts` **34/34**, `lint`, `typecheck` e `build` exit 0. Conferência visual em 1440 e 390 nas quatro leituras, com 1 a 4 figuras e sem overflow.
    - O release local é `e794a295…`; o ponteiro público continua no release anterior. A curadoria não foi publicada.

41. **Transições da linha do tempo em `#epocas`**
    - Diagnóstico: o `@if` removia o corpo no mesmo ciclo em que o novo período era inserido. `animate.leave` funcionava ao fechar, mas não na troca simultânea; o conteúdo antigo também passaria a ler os dados do novo período.
    - O componente mantém o período anterior em `leavingId` por 280 ms, com `inert` e `aria-hidden`, enquanto a altura e a opacidade recolhem. O corpo que sai usa um retrato do período e do estado de expansão, então o conteúdo não troca nem salta durante a animação.
    - O novo corpo entra com transição de `grid-template-rows` (`0fr → 1fr`) e opacidade em 240 ms, com atraso de 40 ms; o recolhimento usa a mesma duração sem atraso. A abertura inicial da página é imediata; só depois da primeira interação o movimento aparece. `prefers-reduced-motion` zera o atraso e encurta a transição pelo token global.
    - O período aberto ganhou hierarquia além da cor: faixa lateral na cor do período, anos em chip de tinta, indicador quadrado com mais/menos animado e marcador ampliado. O corpo mantém foco, `aria-expanded` e `aria-controls`.
    - Verificações: `npm test` **337/337**, `e2e/pages.spec.ts` **27/27** (inclui o novo teste de recolhimento e posição de scroll), `lint`, `typecheck` e `build` exit 0. Medição em 1440 e 390: altura do corpo de 312→24 px ao fechar, sem overflow; clique em outra época mantém `scrollY` e fecha em 280 ms.

42. **Revisão pedagógica dos capítulos**
    - A revisão deixou de ser gerada pela primeira relação do grafo. O molde “Que relação o capítulo estabelece entre X e Y?” aparecia em 7 capítulos e repetia nomes em vez de pedir compreensão; várias fichas só listavam registros de dois capítulos antes.
    - Os **40** capítulos de argumento das quatro leituras agora têm pergunta editorial própria (10 por leitura). O contrato do capítulo ganhou `review` com `question`, `answer`, `rationale`, `sourceIds` e `revisit[{ entityId, why }]`. `leituras` e `fontes` ficam sem revisão por serem percurso e bibliografia.
    - A validação recusa pergunta repetida na mesma leitura, fonte fora do capítulo, registro revisitado inexistente ou repetido. A resposta é sustentada pelo capítulo e cita fontes que o capítulo já usa.
    - A ficha perdeu o título repetido e a introdução genérica; mostra o critério da pergunta, a resposta oculta com fontes e, quando existe, “Retome” com a nova conexão a perceber. O componente segue acessível por teclado e respeita movimento reduzido.
    - Exemplos e justificativa em `docs/design/REVISAO-DE-CAPITULOS.md`. O e2e usa o fixture local para testar a ficha ainda não publicada.
    - Verificações: `npm test` **341/341**, `e2e/pages.spec.ts` **27/27**, `lint`, `typecheck` e `build` exit 0. Conferência visual em 1440 e 390; sem overflow.
    - O release local é `2724b855…`; o ponteiro público continua no release anterior. Nenhuma revisão humana foi registrada e nada foi publicado.

43. **Índice de entidades fora da leitura**
    - O índice card-based do `IdeologyAtlasComponent` repetia nomes, imagens e resumos que o leitor já encontrara nos capítulos. A busca do grafo e o painel de contexto cobrem a mesma descoberta.
    - O índice foi removido da leitura contínua. A seção do grafo agora diz para buscar um nome na barra, arrastar, aproximar e selecionar um nó; um link curto leva ao acervo em lista. O aviso de registros sem conexão aponta para a busca e para o acervo.
    - `CardCarouselComponent` não foi alterado. O teste e2e do carrossel passou a exercitar “Posições por registro”, que continua sendo consumidor real.
    - Verificações: `npm test` **342/342**, `e2e/carousel.spec.ts` **6/6**, `e2e/pages.spec.ts` **28/28** (inclui a ausência do índice nas quatro leituras), `lint`, `typecheck` e `build` exit 0.

44. **Contexto único no grafo da leitura**
    - A área “Ficha selecionada” (`entity-reading`) duplicava título, resumo, relações e fontes do painel contextual compartilhado. A seleção do grafo abria essa área por `openEntity`, enquanto `inspect` rolava até ela; o painel compartilhado ficava desativado no modo embedded.
    - O grafo agora abre `ContextPanelService` ao selecionar um nó. O painel é lateral no desktop e ocupa a largura no celular; a página não ganha outra seção abaixo do grafo. O gatilho é o próprio nó, usado para restaurar o foco.
    - `ContextPanelService.entityId` acompanha a ficha aberta; o atlas usa esse sinal para manter a seleção do grafo em passo quando o leitor segue uma relação e volta pelo percurso. Entidades fora do recorte não alteram a seleção do grafo.
    - A lista textual de conexões continua como alternativa acessível; não há segunda ficha nem outro componente competindo pela seleção. O painel global de `/grafos` não mudou.
    - Verificações: `npm test` **342/342**, `e2e/pages.spec.ts` + `e2e/graph.spec.ts` **48/48**, `e2e/liberalism-atlas.spec.ts` **3/3**, `e2e/ideology-sheets.spec.ts` + `e2e/contextual-exploration.spec.ts` + `e2e/encyclopedia.spec.ts` **22/22**, `e2e/carousel.spec.ts` **6/6**, `lint`, `typecheck` e `build` exit 0. Conferência visual em 1440 e 390 sem `entity-reading` e sem overflow.

45. **Cronologia única em `#épocas`**
    - O eixo horizontal `app-timeline-axis` saiu de `#conexoes`. A leitura tem uma só cronologia, no capítulo de épocas; o atlas ficou restrito à rede e à lista textual. Foram removidos o componente, o layout, o serviço de foco e os testes do eixo, além do `view-switch` que apontava para uma seção inexistente.
    - `app-era-chart` ganhou filtros por tipo (pessoas, obras, acontecimentos, organizações), faixa de duração por época, faixa da vida dentro do período, marcos destacados e “Por que importa”. Os filtros não fecham a época nem escondem a posição do período.
    - O contrato `chronology` ganhou `markerNotes` (opcional para compatibilidade com o release publicado). As duas leituras com cronologia, marxismo e liberalismo, receberam nota editorial para cada marco; a validação recusa nota de registro ausente do bloco, mas aceita marco sem nota para não quebrar o release antigo.
    - Vida, atividade e participação passaram a ser linhas distintas: a vida vem de `temporalExtent`; “Obras datadas” e “Participação documentada” vêm apenas de relações `authored`/`wrote` e `participated_in` já presentes no atlas. Ausência de relação significa “não registrado”, não “não aconteceu”; a ordem e a proximidade não são apresentadas como causalidade.
    - Social-democracia e anarquismo não têm `temporalExtent` estruturado no atlas. Em vez de inventar datas ou manter um segundo eixo vazio, o capítulo de épocas mostra um estado editorial curto dizendo que faltam datas. A próxima etapa é dados, não outra visualização.
    - O zoom/pan do eixo foi removido junto com o componente. A legibilidade em períodos densos passa a depender dos filtros e de “Ver todas”; o recorte temporal não foi transformado em gráfico de exploração. Essa é uma troca deliberada: uma cronologia vertical narrativa no lugar de duas visualizações concorrentes.
    - Verificações: `npm test` **332/332**, `npm run test:content` **184/184**, `e2e/pages.spec.ts` + `e2e/graph.spec.ts` + `e2e/encyclopedia.spec.ts` + `e2e/carousel.spec.ts` + `e2e/ideology-sheets.spec.ts` + `e2e/contextual-exploration.spec.ts` + `e2e/liberalism-atlas.spec.ts` **75/75**, `e2e/public-routes.spec.ts` + `e2e/accessibility.spec.ts` **36/36**, `lint`, `typecheck` e `build` exit 0. Conferência visual em 1440 e 390: cabeçalho em uma coluna no celular, sem overflow; marcos e notas legíveis; atividade/participação separadas.
    - O release local é `eae46644…`; o ponteiro público continua em `a54eee…`. Nada foi publicado.

46. **Carrossel de posições analíticas**
    - O card de “Posições por registro” abria com o resumo da entidade, listava todos os eixos e repetia o valor numérico no texto de status. O visitante não distinguia com clareza o que era uma estimativa, um intervalo divergente ou uma pista de uma só fonte.
    - O card agora começa pelo registro e por **um eixo selecionado**; os outros eixos ficam em chips com forma e rótulo de status. O painel mostra a interpretação do intervalo em palavras, a faixa, os polos, a confiança por afirmação e as evidências sob demanda.
    - Estimada, divergente e indicativa têm formas diferentes: estimada usa marca central; divergente mostra os dois extremos e nenhuma média; indicativa usa marca tracejada e o rótulo “1 afirmação” ou “1 fonte”. Eixos sem afirmação com fonte não recebem trilho nem valor neutro e são listados em “Eixos sem evidência”.
    - As evidências trazem a afirmação, a classificação, a confiança, o valor atribuído pela fonte e o link/edição de cada fonte. A média ponderada e o intervalo são explicados dentro da evidência, não no título. O texto de método muda quando as fontes divergem ou quando há uma só fonte.
    - A comparação contextual usa o **maior contraste entre dois registros** num eixo comum, com as posições em palavras e dois trilhos; “Ver no carrossel” leva ao card correspondente. Um seletor livre de dois registros foi avaliado e descartado para não criar uma segunda interface de exploração.
    - O `CardCarouselComponent` ganhou pontos opcionais (`showDots`, usados só nas posições), anúncio de posição em região viva, alinhamento por card e transição do indicador. Arraste, snap, setas, barra, teclado e clique continuam iguais; o padrão dos outros carrosséis não muda.
    - `positionAxes` ganhou rótulos curtos; `positions.ts` ganhou frases de posição, interpretação de intervalo, rótulo de status, resumo de confiança e descrição acessível. Só marxismo tem afirmações de posição neste checkout; as outras leituras não exibem o bloco, e o componente segue reutilizável.
    - Verificações: `npm test` **343/343**, `e2e/pages.spec.ts` + `e2e/carousel.spec.ts` **34/34**, `e2e/public-routes.spec.ts` + `e2e/accessibility.spec.ts` **36/36**, `lint`, `typecheck` e `build` exit 0. Conferência visual em 1440 e 390: um card por vez, chips, polos em palavras, status por forma e texto, sem overflow. A auditoria Axe do carrossel em 1280 e 390 não encontrou achados sérios.
    - O release local continua `eae46644…`; nenhuma publicação nesta rodada.

47. **Filtros temáticos do roteiro de leitura**
    - O filtro tinha um botão por tema, sem contagem, sem ação explícita de limpar e com até 11 botões nas leituras de liberalismo e marxismo. Como quase todos os temas reúnem uma só obra, o esmaecimento deixava o percurso quase apagado e o visitante não sabia se estava filtrando ou escondendo.
    - O componente agora abre com o chip **Todos** e a contagem total. Os temas são ordenados por quantidade de obras e depois por nome; os seis primeiros viram atalhos com contagem, e a lista completa fica em um seletor nativo.
    - O seletor aparece no desktop quando há mais de seis temas e sempre abaixo de 640 px, quando os atalhos são ocultados. O tema ativo é identificado pelo chip, pelo seletor e pela linha de status (“Economia · 3 de 13 obras em destaque”).
    - A seleção pode ser limpa pelo chip Todos, pelo próprio chip ativo ou pela opção “Todos os temas” do seletor. Hover, disponível, selecionado e foco têm estados distintos; mudar de tema não altera a altura do filtro (155 px no desktop e 185 px no celular) nem fecha a obra aberta.
    - O esmaecimento passou de 0,35 para 0,45, suficiente para preservar o percurso sem apagar as obras fora do tema. O rodapé explica que o filtro não remove obras.
    - Nenhum contrato de conteúdo mudou: as contagens são derivadas de `works[].theme`; `themes` passou a devolver `{ name, count }` ordenado, e o seletor usa os mesmos nomes. O bloco continua recebendo `works`, `theme`, `open` e os níveis existentes.
    - Verificações: `npm test` **348/348**, `e2e/pages.spec.ts` + `e2e/contextual-exploration.spec.ts` **40/40**, incluindo o filtro nas quatro leituras, o seletor compacto em 390 px, os estados de chip e a auditoria Axe; `lint`, `typecheck` e `build` exit 0. Conferência visual em 1440 e 390 sem overflow e com altura estável antes/depois da seleção.
    - Limite: a taxonomia de temas continua granular; o filtro é um destaque de uma obra em muitas leituras. O seletor resolve a escala da interface, mas não substitui uma futura revisão editorial dos temas. Nada foi publicado.

48. **Referências progressivas e retorno à evidência**
    - A auditoria encontrou três problemas: o capítulo `fontes` de social-democracia e anarquismo repetia a bibliografia no bloco e no _details_ de fontes do capítulo; o capítulo `debates` de marxismo abria até 10 referências de uma vez; e a ficha contextual podia repetir a mesma fonte e não tinha retorno de um salto para “Fontes”. O “Voltar de onde veio” do índice voltava ao topo do capítulo, não ao ponto exato.
    - `EditorialSourcesComponent` agora agrupa referências com o mesmo título, URL, edição e localizador, mas mantém separadas as que têm localizador ou edição distinta. O contador do botão usa a lista única, e o botão ganhou `aria-controls` para o id da lista.
    - Fontes de capítulo mostram **5** entradas e “Ver todas”; a bibliografia integral mostra **8** e “Ver todas”. O _details_ de fontes do capítulo é omitido quando o bloco de bibliografia cobre todas as fontes daquele capítulo, evitando a repetição em `fontes`.
    - A ficha contextual mostra no máximo **5** fontes, com “Ver todas as fontes”, uma nota que separa fontes do registro das evidências de cada conexão e um botão “Voltar ao ponto anterior” após saltar para Conexões ou Fontes. A lista única também protege contra fontes repetidas em registros montados fora do grafo.
    - `entityContext` passou a deduplicar IDs de fonte; o painel e o componente de referências também agrupam repetições visíveis. Fonte sem URL continua texto, sem link; localizadores e edições distintas permanecem.
    - O rótulo da revisão virou “Fontes da resposta” para distingui-lo das fontes do capítulo e da bibliografia. O bloco de bibliografia ganhou uma nota de hierarquia.
    - O retorno do índice agora guarda o `scrollY` exato antes do salto e o restaura depois do evento `Scroll` do roteador; o painel contextual já restaurava foco e rolagem ao voltar de uma relação, e o teste passou a cobrir o foco da conexão. O salto para fontes restaura o ponto anterior e foca o título.
    - Verificações: `npm test` **353/353**, `e2e/pages.spec.ts` + `e2e/contextual-exploration.spec.ts` + `e2e/encyclopedia.spec.ts` + `e2e/ideology-sheets.spec.ts` **58/58**, `lint`, `typecheck` e `build` exit 0. Conferência visual: capítulo com 5 + “Ver todas (10)”, bibliografia com 8 + “Ver todas (13)” e sem _details_ duplicado, ficha com 3 fontes e retorno visível; sem overflow.
    - Limite: a contagem do resumo de capítulo deduplica IDs de fonte, enquanto o componente agrupa pelo conteúdo visível; registros com o mesmo conteúdo e IDs diferentes são raros e não foram unificados no resumo. Nada foi publicado.

49. **Encerramento editorial e continuidade de leitura**
    - O fim de cada capítulo repetia “A seguir” mesmo com o índice e o scroll disponíveis. A página fechava com “Uma leitura termina. As perguntas continuam.”, dois links simples e uma lista de conexões; a leitura indicada como próxima também aparecia na lista, duplicando o mesmo destino.
    - O botão “A seguir” saiu do fluxo dos capítulos. A continuidade fica com o índice lateral, o progresso e o scroll; a navegação por histórico continua coberta pelos testes.
    - `companionOf()` deixou de escolher pela posição em `ideologyReadings`: cada leitura tem uma conexão `lead` curada, e a função devolve essa conexão publicada. A leitura-líder não vira link separado.
    - Cada conexão passou a declarar `relation`, `question`, `reason` e uma `imageEntityId` opcional. As quatro leituras mostram **3** cards, com **Contraste**, **Continuidade**, **Divergência** e **Aprofundamento** quando a relação sustenta a categoria. O limite de 3 a 5 caminhos e a filtragem de destinos não publicados continuam em `connectionsOf()`.
    - O novo `IdeologyReadingEndComponent` compõe um card-líder largo e dois cards menores em pares desencontrados. Cada card traz relação, nome da leitura, pergunta, razão e link para a rota publicada; a mídia licenciada é um documento, fotografia ou cartaz ligado ao destino, não um retrato repetido. Sem mídia, entra a composição geométrica da paleta da leitura. Créditos ficam em `details`, fora do link.
    - `IdeologyReading.palette` e `readingPalette()` substituem o mapa de paletas liberadas; o encerramento não carrega o dossiê da leitura de destino para desenhar o card. O retorno à página inicial permanece como ação secundária.
    - Nenhum contrato de capítulo ou de conteúdo tipado mudou. O contrato de `connections` é dado editorial da feature.
    - Verificações: `npm test` **358/358**, `npm run test:content` **184/184**, `build` **1.189 rotas**, `e2e/pages.spec.ts` + `e2e/contextual-exploration.spec.ts` + `e2e/encyclopedia.spec.ts` + `e2e/ideology-sheets.spec.ts` **58/58**, `lint` e `typecheck` exit 0. Conferência visual em 1440 e 390 sem overflow, com o card-líder, as quatro relações e os créditos verificados nas quatro leituras.
    - Limite: as imagens dos cards vêm de registros do grafo; uma leitura futura sem mídia licenciada cai na ilustração geométrica. A composição foi verificada com três cards por leitura, não com quatro ou cinco. Um stash de outra branch (`wip-header-home-atlas-graph`) estava aplicado sobre a árvore e foi resolvido para o lado atual; o stash continua em `git stash list`. Nada foi publicado.

50. **Minimapa do grafo removido**
    - O minimapa de `/grafos` recalculava a posição de todos os nós visíveis a cada mudança de `view()` e desenhava um segundo conjunto de caminhos SVG. Ele já aparecia apenas na tela cheia, porque o grafo embutido nos capítulos usa `embedded()`.
    - Foram removidos o bloco `.minimap` do template, os sinais `minimapBase`/`minimap`, o método `minimapJump`, os estilos e o helper `batchDots` que existia só para os pontos do minimapa.
    - A orientação em `/grafos` fica com o zoom, o reenquadramento, a busca, os rótulos e a legenda. O grafo embutido não foi alterado.
    - Verificação: `/grafos` abriu localmente sem `.minimap` e sem o grupo “Visão geral do mapa”, com 1.156 nós e o zoom em 100%; `/leitura/marxismo` abriu com 12 capítulos e 3 cards de encerramento, sem erro de leitura. O servidor de desenvolvimento respondeu em `http://localhost:4306`; `http://127.0.0.1:4306` recusou a conexão, o que explica falha de acesso quando o endereço é trocado.
    - Verificações: `npm test` **357/357**, `npm run test:content` **184/184**, `build` **1.189 rotas**, `e2e/graph.spec.ts` + `e2e/pages.spec.ts` **54/54**, `lint` e `typecheck` exit 0. Conferência local: `/grafos` sem minimapa, com 1.156 nós; `/leitura/marxismo` com 12 capítulos e 3 cards, sem erro de leitura. Nada foi publicado.

51. **Auditoria integrada das leituras contínuas**
    - A revisão cobriu as quatro leituras em cinco frentes: arquitetura Angular, UI/UX e acessibilidade, narrativa e didática, história e fontes, motion e desempenho. Não há P0 de código; o bloqueio P0 é de publicação.
    - **Publicação:** o ponteiro público `a54eee…` está atrás do release local `d35b3dc4…`. Com o ponteiro público, o HTML prerenderizado das quatro páginas tem **0 revisões de capítulo** e **0 figuras curadas**; o conteúdo local tem **10 revisões** e **4 figuras** por leitura. Um build com o ponteiro local renderiza o conteúdo novo, mas a hidratação busca o ponteiro público e a navegação falha. É preciso `npm run content:publish` e atualizar `content/content-pointer.json` (decisão humana) antes de considerar as páginas publicadas.
    - **Selo editorial:** `IdeologyPageComponent.reviewSummary` lê `page.review.status`. `rascunho` aparece como “Versão preliminar”; `com-fontes` mantém “Conteúdo com fontes”; `revisado` exige revisor. Antes o selo era fixo e escondia o estado de social-democracia e anarquismo.
    - **Bibliografia:** o bloco `fontes` agora é a união de todas as fontes citadas (marxismo 23, liberalismo 27, social-democracia 18, anarquismo 10), com teste em `scripts/content/readings.spec.mjs`. Antes a lista “integral” omitia 4, 8, 5 e 3 fontes.
    - **Transições:** 19 bridges de liberalismo, social-democracia e anarquismo foram corrigidas para o capítulo seguinte; `fontes.kicker` foi padronizado em “Fontes e metodologia”.
    - **Vertentes:** as revisões foram alinhadas aos cartões existentes. Liberalismo passou a `partial` com gap sobre Rawls e a abordagem das capacidades; social-democracia e anarquismo declaram no gap as correntes que não recebem cartão próprio.
    - **Cronologia e lacunas:** `epocas` sem bloco `chronology` agora mostra uma única mensagem que reúne cobertura e ausência de linha do tempo. As notas de gap ficaram compactas, sem caixa pesada repetida em cada capítulo.
    - **Grafo embutido:** a roda não sequestra mais o scroll da leitura; Ctrl/Meta ou os botões operam o zoom. `[scope]` virou `computed`, estável entre ciclos, e o texto do atlas foi atualizado.
    - **Abertura:** a primeira figura usa `loading="eager"` e `fetchpriority="high"`; há preconnect para Wikimedia e para o Worker de conteúdo, e a primeira imagem não entra mais com animação de opacidade. O `appReveal` no cabeçalho (no-op por `display: contents`) e a referência `#reading` morta foram removidos.
    - **Verificações:** `npm test` **357/357**, `npm run test:content` **186/186**, `build` **1.189 rotas**, `e2e/pages.spec.ts` + `e2e/graph.spec.ts` **55/55**, `lint` e `typecheck` exit 0. Axe sem achados sérios com movimento reduzido em 320, 390, 768, 1280 e 1920. Screenshots antes/depois em `generated/audit-*` e `generated/audit3-*`.
    - **Limites:** (1) a publicação do release pendente bloqueia a experiência final; (2) `debates` de social-democracia e anarquismo ainda são cartões de crítica, não um quadro defesa → crítica → resposta → limites; (3) as duas leituras seguem sem cronologia estruturada; (4) a rota de leitura ainda baixa o pacote completo (~24 MB, incluindo search e adjacency) antes de hidratar; (5) em 200% de texto, header e footer compartilhados ainda causam overflow horizontal em 1280 e 390; (6) o grafo embutido ainda captura toque de um dedo no mobile; (7) algumas revisões citam uma fonte que cobre apenas parte da resposta e há afirmações que pedem verificação humana; (8) o encerramento foi testado com 3 cards por leitura. Nada foi publicado.

## Pendências que bloqueiam

1. **Nova rodada** — o PR **#48** foi mesclado no `master` em `2655569`; a `develop` foi recriada em `b982aca` e a issue **#46** está fechada. As mudanças de anarquismo, rótulos, ficha do nó e tipos do grafo estão commitadas e enviadas no `develop`; falta abrir o próximo PR para a `master` e retomar os PRs de dependências #45/#44/#41/#40/#38 (#39/#37 aguardam recreate).
2. **Suíte e2e completa** — `contextual-exploration` passou **7/7** e o CI do PR #48 concluiu `verify` em 16m39s. `e2e/graph.spec.ts` passou **18/18** depois da ficha do nó.
3. **Produção** — o app está publicado no Cloudflare Pages (`atlas-bellussi.pages.dev`), com `/fontes` em **193 KB**. O `vercel.json` da raiz só vale no próximo deploy Vercel, e o job `deploy` do CI continua inerte porque `VERCEL_PROJECT_ID` não existe; decidir se o Vercel segue como espelho ou se o Pages passa a ser o único alvo.
4. **Probe de 404** — no Pages, `/rota-inexistente` responde **404** com `404.html` (3.078 bytes), `/grafos`, `/verbete/karl-marx` e `/acervo` respondem 200. O antigo `atlasbr.vercel.app` continua respondendo 200 com `index.html` e só será verificado se o Vercel for mantido.
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
