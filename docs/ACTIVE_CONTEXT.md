# Contexto vivo do ATLAS

Atualizado em 06/11/2026. Este é o handoff entre sessões: leia no início, atualize no fim com `/handoff`. Não substitui `AGENTS.md` nem os documentos de arquitetura; registra o estado observado e o que está pendente.

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

## Piloto de modelo (Anthropic)

Amostra de 20 artigos de `marxismo` e `liberalismo`, com os artigos já contendo `targets` (`amostra-20v2`):

| Braço | Custo | Relações aceitas | Com QID | Rejeição | Citações rejeitadas |
| --- | --- | --- | --- | --- | --- |
| Haiku 5.5 `low` | US$ 0,021 | 6 | 5 | 80,0% | 3,7% |
| Haiku 5.5 `medium` | US$ 0,038 | 23 | 18 | 62,9% | 2,4% |

- Custo por relação útil: **US$ 0,0042** em `low` e **US$ 0,0021** em `medium`.
- `medium` rende cerca de duas vezes mais relações com QID por dólar; `model-choice.json` já fixa Haiku `medium` para extração e Sonnet `low` para relações.
- `score` respondeu "insuficiente": faltam 40 itens conferidos por pessoa em cada braço. Nenhum modelo foi alterado.
- DeepSeek não foi medido: não há chave `DEEPSEEK_API_KEY` no ambiente. Não usar a assinatura Go para lote de dados.

## Pendências que bloqueiam

1. **CI** — depois do upload dos blobs, reexecutar `gh run rerun 42274140215 --failed` e confirmar `verify`; lint, typecheck, 301 testes e 18 e2e do grafo já passaram localmente.
2. **Suíte e2e completa** — `contextual-exploration` (liberalismo 1440) falha no y do termo ao voltar (diferença de **64 px**), embora o scroll volte ao lugar. Corrigir a estabilidade do painel ou a tolerância do teste antes de considerar a rodada verde.
3. **Produção na Vercel** — o `vercel.json` da raiz só vale no próximo deploy. O job `deploy` do CI continua inerte porque `VERCEL_PROJECT_ID` não existe; falta criar o token e os IDs (ver `docs/operations/PRODUCAO.md`).
4. **Probe de 404** — hoje `https://atlasbr.vercel.app/caminho-inexistente` responde 200 com `index.html`; o `uptime.yml` falha por isso. Só verificar depois do deploy.
5. **Verbetes** — corrigir o modo `--partial` do tradutor e o desempate de rascunhos; depois rodar o lote prioritário e derivar o perfil político das relações.

## Pendências que pedem decisão

4. **Onda 2 do conteúdo** — 414 artigos e 896 extratos (~US$ 1,65) não estão neste checkout; faltam imagens, conversão, testes e relatório. Não publicar sem aprovação.
5. **Release `0.1.0`** — `release/0.1.0` contém o fluxo; falta CI verde para ativar proteções e release. Decidir se `develop` segue para `master` nesta rodada.
6. **Revisão humana** — as relações curadas e os 109 itens de `generated/eval/amostra-20v2/revisao.md` continuam pendentes.

## Protocolo

- Toda sessão que muda estado termina com `/handoff` ou atualização manual deste arquivo.
- Registre comando executado e resultado; não registre suposição como verificação.
- Links para arquivos e commits, não para transcrições.
