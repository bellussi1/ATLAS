Status: atual
Última verificação: 09/11/2026

# Contexto vivo do ATLAS

Atualizado em 09/11/2026. Este é o handoff curto entre sessões. O histórico completo, com as 58 entradas anteriores, está em [`archive/2026-11/active-context-history.md`](archive/2026-11/active-context-history.md). O mapa dos documentos está em [`README.md`](README.md).

## Estado atual

- Repositório: `C:\Users\Bellussi\Documents\Workspace\ATLAS`.
- Gitflow: PR **#50** (`develop` → `master`) em **`31b8d8b`**, PR **#51** (pacotes) em **`21bba13`**, PR **#52** (d3-force lazy) em **`c7a0448`**, PR **#53** (uptime) em **`729cc5b`**, PR **#54** (publicação `c0be77b`) em **`25762fa`**, PR **#55** (vizinhança P2) em **`949080a`**, PR **#56** (arestas dos suplementos) em **`0a02cf6`**, PR **#57** (Wikidata) em **`5f623b0`**, PR **#58** (correção P800) em **`4c5afdc`**, PR **#59** (datas) em **`0d74eee`**, PR **#60** (hover do grafo) em **`b8ef621`**, PR **#61** (home) em **`f917459`**, PR **#62** (correção artística da home) em **`487f46f`**, PR **#63** (acervo) em **`3da2c7f`** e PR **#64** (lugares e bandeiras) em **`c12bd11`**; `deploy-pages` concluído em todas as rodadas.
- Deploy: origem única `https://atlas-bellussi.pages.dev` (Cloudflare Pages, Direct Upload). `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` estão cadastrados; o job `deploy-pages` publica o artefato verificado em push para a `master`. O Vercel foi removido do repositório, mas o projeto antigo ainda precisa ser desligado no painel.
- Conteúdo: 13 coleções. Release **`c48b0b6…`** publicado em 09/11: **1.190 entidades**, **1.580 relações** e **1.410 documentadas**; `bundle` de 28,56 MB e `networkBundle` de 5,42 MB. O ponteiro público aponta para esse release.
- **Worker de conteúdo**: a conta gratuita passou de **100 mil** requisições/dia (186.096 no alerta). O release empacotado reduz a navegação de leitura/catálogo de ~17 para **2 requisições** (ponteiro + pacote), `/acervo` para **2** e `/grafos` para **2** (ponteiro + `networkBundle`). Medição na URL publicada em 08/11: home **0**; acervo **2**; leitura/verbete **2** na navegação SPA e **1** na carga direta; grafo **2** na SPA e **1** na carga direta. Depois do `/acervo`, abrir um verbete na mesma sessão custa **0**. O ponteiro vem do prerender nas cargas diretas. O consumo futuro cai, mas o limite do dia ainda depende do reset ou do upgrade.
- Build local: **1.221 páginas no sitemap**; canonical e robots usam `https://atlas-bellussi.pages.dev` como origem padrão, com `ATLAS_SITE_URL` apenas para domínio próprio.
- CI: PR **#64** e merge **`c12bd11`** verdes, com 359 testes, 185 de conteúdo, build de 1.221 páginas, 1.222 links e 163 e2e (um teste de carrossel flutuou e passou no rerun); `deploy-pages` concluído. O `ingest:fetch-raw` segue estável e o probe agendado de `uptime` foi corrigido para as rotas canônicas.
- Publicado e verificado em 09/11: ponteiro `c48b0b6`; `/paises` mostra 82 países, `/estados` 19, `/cidades` 20, `/locais` 7 e `/lugares` 21; `/verbete/alemanha/` exibe `Flag_of_Germany.svg` no hero com `hero--flag`. Sitemap com **1.221 URLs**; `/grafos` baixa só o `networkBundle`, e verbete/acervo baixam só o `bundle` na carga direta. A vizinhança P2 isola 23/103/1.188 verbetes em 1 salto/2 saltos/tudo.

## Verificações recentes

- `npm test`: **359/359**.
- `npm run test:content`: **185/185**.
- `npm run build`: passou, **1.221 páginas no sitemap**, canonical absoluto em todas as páginas.
- `npx playwright test` (ideologia, acervo e grafo): **47/47**.
- `npm run check:links`: **1.222 páginas** verificadas.
- `npm run lint` e `npm run typecheck`: exit 0.
- `content:build` local: release **`c48b0b6`**, 13 coleções, **1.190 entidades**, **1.580 relações** e **1.410 documentadas**; o ponteiro público aponta para esse release.
- Cobertura documentada das quatro leituras: **Marxismo 42, Liberalismo 24, Social-democracia 34, Anarquismo 10**; metas 70/35/70/50.
- Lighthouse local com brotli/gzip na preview: mobile **91–94** e desktop **100** em desempenho; acessibilidade, boas práticas e SEO **100** nas duas emulações. Nenhum reflow forçado e nenhum erro de console.
- CSS: `/acervo` caiu de 13 para 9 cores de texto computadas e `/leitura/marxismo` de 14 para 10; tamanhos de fonte agora saem dos tokens `--text-*` (11, 12, 13, 14, 15, 16 e 17px).
- `test:content` **184/184** após o lote de 376 verbetes; o fixture cresceu sem duplicar os pacotes.
- Auditoria de IA anterior (109 itens): **106 sustenta**, **2 não sustenta**, **1 inverte**; foi substituída pela revisão de IA da Onda 1 (100 itens) e não é usada como gate.
- Grafo, medição local: primeiro nó **948 ms**, seleção por clique **108 ms**, pan p95 **33,3 ms**.

## Trabalho ativo

- **PR #50 / #51**: #50 levou leituras, shell, deploy e foco do grafo; #51 levou os pacotes de conteúdo. Ambos mergeados e publicados.
- **Grafo**: foco por seleção implementado; o `/grafos` lê o `networkBundle` (4,1 MB contra 12,6 MB das coleções) em **uma** requisição de conteúdo além do ponteiro. Medição na URL publicada: **2** requisições na navegação SPA e **1** na carga direta.
- **Pacote de conteúdo**: `build-content` gera `bundle` (grafo + busca + adjacência + layouts + leituras) e `networkBundle` (projeção + layouts); o ponteiro referencia os dois e o `ContentRepository` os consome antes do manifesto. Releases antigos e o fixture continuam no caminho anterior.
- **Limpeza**: `/mesa` removido; `features/study`, `historical-visualizations`, `editorial-mark`, `editorial-text`, `notice` e `timeline-periods` removidos. Redirecionamentos de compatibilidade (`/marxismo`, `/grafo`, `/rede`, `/comparar`, `/conhecimento`) foram mantidos.
- **Documentação**: `ACTIVE_CONTEXT` compactado; histórico, auditorias, validações e planos antigos foram para `docs/archive/2026-11/`.
- **Lighthouse da home**: canonical absoluto gerado no build e mantido na navegação, scroll com offsets em cache, revelação em lote (um layout por página, após o primeiro paint), catálogos leves fora do índice de busca, rotas de ideologias/exploração lazy e preload do IBM Plex Mono. Os preconnects do Wikimedia foram removidos por não serem usados na home.
- **Higiene de console e CSS**: Zod roda sem JIT para não violar o CSP, o filtro de temas ganhou `id`, o logo do rodapé declara proporção e a paleta do `record-card` passou a usar tokens. A preview local agora comprime em brotli/gzip e aplica cache imutável a JS/CSS com hash, aproximando a medição do Pages.
- **Links de compra**: registros de obra que são livros, com autor conhecido, ganham "Comprar na Amazon" direto para a busca de livros, com `rel="sponsored"` e divulgação quando houver tag. A lista curada fica em `core/content/queries/amazon-books.ts`; tópicos, periódicos e o filme do acervo não recebem link. Sem `AMAZON_ASSOCIATE_TAG`, o link existe mas não gera comissão.
- **Expansão de relações (paga)**: reextração de Marxismo/Liberalismo, 141 verbetes, 33 alvos, os 376 verbetes restantes e as arestas curadas dos suplementos geraram **+108 relações documentadas** (676 → 784) e **+32 entidades** (release **`ff48809`**). Custo de **~US$ 1,78** do teto de US$ 6; restam ~US$ 4,2. O `extract.mjs` usa Sonnet **low** na segunda passada. CI do commit `084bd9a` verde; o release atual passou 356 testes e 156 e2e. Detalhes em `docs/research/EXPANSAO-RELACOES-2026-11.md`.
- **Enriquecimento Wikidata (grátis)**: `scripts/content/enrich-wikidata-verbetes.mjs` leu as declarações dos 928 QIDs e ligou apenas alvos que já existem no grafo: **+648 relações** em `atlas-verbetes-citados` (496 → 1.122), todas com fonte, evidência e procedência. Descartei P361, P1142 em pessoa e P463 em país/local/conceito; P1142 e P737 entram como `associated_with` de catálogo, com aviso. A correção de P276 removeu 22 arestas de conceito/obra e renomeou 5 sedes de instituição; P800 foi reescrito na direção criador → obra. O passe de datas (`enrich-wikidata-dates.mjs`) preencheu `temporalExtent` em **448 verbetes** (194 pessoas, 120 instituições, 44 eventos, 43 partidos, 33 obras, 10 conceitos e 4 ideologias), só com precisão de ano ou melhor. Release **`99db066`** publicado; 4.036 alvos externos ficaram fora.
- **Onda 2 / verbetes citados**: 908 artigos e **907 rascunhos** recuperados do worktree do `.claude`; os 907 foram publicados em `atlas-drafts/wiki/verbetes-citados/`. A coleção passou a **928 entidades e 1.122 relações** após o Wikidata. O lote dos 376 verbetes sem relação foi executado em três partes e consolidado. As quatro leituras seguem em **42/24/34/10** relações documentadas (metas 70/35/70/50).

- **Onda 0 / expansão**: linha de base medida e gold set gerado em `docs/research/EXPANSAO-BASELINE-2026-11.md` e `docs/research/gold-set-2026-11/`. O achado principal é que as 122/75/35/10 relações incluem links de navegação; documentadas são **33/11/34/10 (88)**. A captura foi recuperada do worktree do `.claude`: Social-democracia 68/68, Anarquismo 54/54 e `verbetes-citados` 908 artigos/907 rascunhos. Os 907 rascunhos de verbetes foram publicados no `atlas-drafts`; o estágio 5 fica aberto por 3/4 rascunhos enxutos e a reextração paga ainda não foi autorizada.

- **Limpeza de disco**: 15 worktrees mesclados e limpos removidos (incluindo `loving-khayyam`, `ATLAS-gitflow` e `pipeline-tradicao`), ~22,5 GB; `generated/raw-cache` (9,6 GB), blobs locais de `scripts/ingestion` (909 MB), `tmp` e `dist` removidos. `output/` foi movido para `C:\Users\Bellussi\Documents\ATLAS-output`. Restam apenas worktrees sujos ou não mesclados (`great-chatelet`, `mystifying-tharp`, `rede-ux`, `youthful-spence`, `zen-solomon`) e `ATLAS-release`.

- **Grafo, estado atual**: o release público já tem `network`, então `/grafos` faz **2 requisições** ao Worker em vez de 11–17. Adicionei `?no=<id>` para link direto, "Ver no grafo" nos verbetes, filtro de conectados e zoom inicial de 145% no mobile (607 nós visíveis), além de "Ver como lista" no mobile. Lighthouse: desktop **88** (era 78–81), mobile **56** (TBT ~1,2 s), CLS 0/0,013. O `layoutNetwork` (d3-force) saiu do chunk do grafo: virou um chunk lazy de **21,5 kB**, carregado só quando `layouts.network` falta.
- **P2 / vizinhança**: a primeira fatia está implementada. O controle **Tudo / 1 salto / 2 saltos** isola o BFS a partir do verbete selecionado, grava `?no=<id>&saltos=1|2` e não recalcula o layout; o recorte é induzido pelas arestas filtradas. Teste unitário do BFS e e2e com restauração da URL. Faltam histórico, filtro por período e caminho entre dois nós.
- **Grafo / hover e desempenho**: o hover de um nó causava um bloqueio de **90–130 ms** e o ícone “fugia” para baixo à direita porque a propriedade `scale` individual ignora `transform-box` no SVG do Chromium. A escala agora entra no mesmo `transform` da posição, e o mapa base é escurecido por opacidade de grupo enquanto uma cópia iluminada desenha só a vizinhança. O `world` passou de atributo SVG para `transform` CSS, o `nodeScale` congela durante pan/zoom e o rótulo acessível é pré-calculado. Hover e wheel ficam sem long tasks; `nodeScale` e rótulos atualizam uma vez ao assentar. Medido no grafo publicado: centro fixo, diâmetro +22% e nenhuma long task. Testes: 356/356, `graph.spec` 19/19; merge **`b8ef621`**.
- **Home atualizada**: `content:build` compila `generated/home-stats.json` com os números do release (928 verbetes, 1.410 relações com fonte, 504 registros datados, 4 leituras/48 capítulos, 1.188 registros/1.578 ligações, 1.330 fontes). A ficha editorial “O acervo hoje” usa composição assimétrica — 928 dominante, balanço de relações/datas/leituras/fontes e nota vermelha com a rede —, não uma faixa de KPIs. Os cartões de leitura vêm de `publishedIdeologies` e `ideologyReadings`, com status editorial real e trecho extraído do primeiro capítulo com conteúdo. O guia e as portas agora citam datas e a vizinhança de 1/2 saltos. Nenhuma requisição de conteúdo na home: o JSON entra no bundle no build. Testes: 356/356, 184/184, build 1.217 rotas, 35 rotas públicas e 4 e2e de home verdes.
- **Acervo / filtros e categorias**: a busca universal ganhou camadas **Tudo / Registros / Fontes / Leituras** na URL (`camada=`), um índice tipográfico de tipos agrupado em **Pessoas e ideias**, **Obras** e **Contexto**, filtros ativos removíveis e um seletor de catálogo no mobile que substitui a tabela. Fontes e leituras têm layouts próprios (lista de fontes e lista editorial), em vez de cair na grade de cards. O “Todos” do índice conta os 1.190 registros, não as 2.524 entradas da camada Tudo. Verificado com screenshots em 1440/390, axe sem achados sérios em `/acervo`, `/acervo?camada=fontes`, `/pessoas`, `/verbete/karl-marx` e `/fontes`, e2e de camadas, seletor mobile e remoção de filtros; ao vivo, `/acervo` mostra 2.524/1.190/1.330/4 e `?camada=fontes` devolve **1.330 fontes** em lista.
- **Lugares / categorias e imagens**: 151 mudanças classificaram os lugares em `placeCategory` (`country`, `state`, `city`, `region`, `continent`, `site`, `other`) e corrigiram tipos óbvios — 10 cidades estavam como conceito e 12 países como instituição. O acervo ganhou **Países (82)**, **Estados (19)**, **Cidades (20)**, **Locais (7)** e **Lugares (21)**, além de `/regimes`. As imagens foram renovadas pelo Wikidata: P41 com rank `preferred` para países/Estados e P18 para cidades/regiões; Alemanha, Reino Unido, Rússia e Estados Unidos deixaram de usar bandeiras históricas ou mapas; Áustria-Hungria, Itália Fascista e Alemanha Ocidental têm overrides. 137 lugares com imagem licenciada e 7 com ícone. Cards de país/Estado mostram a bandeira inteira em moldura; o hero do verbete usa `contain`. Release **`c48b0b6`** publicado; merge **`c12bd11`**. Ao vivo: 82/19/20/7/21. Testes: 359/359, axe em `/paises` e `/cidades`, e2e de categorias e bandeira da Alemanha.
- **Navegação / desempenho**: a troca Acervo → Leitura custava **1,8–3,1 s**, com long task de **1,4–1,7 s**, porque cada um dos 38 parágrafos reconstruía o vocabulário do grafo (1.185 entidades) e a regex de ~2.000 termos. O vocabulário agora é memoizado por grafo e a regex/índice de termos é compilado uma vez por vocabulário; no preview local, a leitura caiu para **0,47 s** na segunda navegação e **~1,1 s** na primeira. O `ContentRepository` deixou de rodar o Zod sobre o pacote de 28 MB no browser: o build valida o release e o SHA-256 do ponteiro fixa os bytes. Home → Acervo caiu de **1,9 s para 1,36 s** no preview local (long task de 442 para 207 ms); Grafo → Acervo na mesma sessão: **149 ms**. O pacote completo continua sendo o limite do Acervo: 28,56 MB crus e ~3,15 MB em brotli; o `search` tem 10 MB e o `graph` 13,7 MB. Reduzir mais exige dividir o pacote por rota.
- **Auditoria dos verbetes**: 928 verbetes de `atlas-verbetes-citados` foram medidos por tipo, escopo e peso das relações. **69 candidatos** a correção de tipo (54 de alta confiança: 10 cidades como conceito, 8 países como instituição, 8 esportes/profissões como obra, 6 veículos como obra etc.), **20 itens claramente fora do escopo** (anos, esportes, ficção, profissão genérica, doença) e **~64 de contexto** (mídia, universidade, empresa, religião, filosofia). No grafo, **630 de 1.122 relações (56,1%) são administrativas ou de catálogo** e apenas **150 (13,4%)** afirmam influência, crítica ou desenvolvimento; relação não confere importância política. Relatório em `docs/research/AUDITORIA-VERBETES-2026-11.md` com os TSVs de tipos e fora de escopo. O lote de lugares já foi aplicado; os 69 tipos restantes, o `scope` (`nucleo`/`contexto`/`fora`) e o peso das relações (`historical`/`action`/`administrative`/`catalog`) continuam pendentes.

- **Onda 1 / calibração + revisão de IA**: amostra de 20 artigos rodada por **US$ 0,0706**. Haiku medium aceitou **17 de 37** relações e rejeitou 0,8% das citações; Haiku low aceitou 7 de 27. A revisão humana foi substituída por **revisão assistida por IA**, autorizada pelo responsável do projeto: Sonnet 5.5 marcou **96 sustenta e 4 não sustenta** nos 100 itens (2 textos e 2 tipos de relação). A re-verificação Sonnet low confirmou 22/24 relações do Haiku (low 7/7; medium 15/17) e rejeitou as duas arestas `desenvolveu-se-em` do Marxismo. Decisão: **Haiku 5.5 medium + Sonnet 5.5 low**; `model-choice.json` atualizado. Metas da Onda 2: **70/50/70/35**.

## Pendências que bloqueiam

1. **Limite do Worker** — a conta gratuita passou de 100 mil requisições/dia; o release empacotado reduz o consumo por navegação (medido em 2 requisições na leitura e no grafo), mas o limite do dia só volta com o reset (00:00 UTC) ou o upgrade. O Pages já serve o pacote.
2. **Vercel** — desconectar a integração Git e excluir o projeto antigo no painel.
3. **Token exposto** — o token Cloudflare foi colado no chat; após o primeiro deploy, rotacionar e atualizar o segredo.
4. **Dependências** — #38/#37 aguardam checks; #44 está em conflito; #40 bloqueado. Não forçar.
5. **Leituras** — faltam os quadros completos de debate, a cronologia estruturada e os cartões de vertentes em Social-democracia e Anarquismo; revisões com fonte parcial e trechos de voz ainda exigem verificação humana.
6. **Carregamento da leitura** — a rota ainda baixa o grafo completo (28,56 MB crus, ~3,15 MB em brotli) antes de hidratar; o gargalo de renderização foi corrigido. Reduzir os bytes exige desenho por coleção ou entidade.
7. **Texto a 200%** — header e footer não estouram mais; a leitura ainda tem overflow residual (~111 px em 1280 e ~61 px em 390) na cronologia/revisão.

## Pendências que pedem decisão

1. **Limite do Worker** — decidir se o consumo empacotado é suficiente ou se ainda vale o Workers Paid (US$ 5/mês) como margem.
2. **Revisão por IA em itinerários** — o plano recomenda manter `verified` apenas com revisor humano na v1; decidir depois do piloto comparativo.
3. **Itinerários** — aprovar a fase 0 (schema, fixtures e testes) antes de implementar.
4. **Aliases antigos** — se quiser que URLs antigas passem a 404, remover `/grafo`, `/rede`, `/comparar`, `/conhecimento` e os redirecionamentos top-level em uma segunda passada.
5. **Programa de Associados da Amazon** — criar a conta, aprovar o site e definir a tag em `src/app/core/content/queries/amazon-books.ts`. Sem tag, os links não geram comissão; a divulgação só aparece quando ela existir.
6. **Onda 2** — o lote dos verbetes foi concluído (+99 documentadas no total). Faltam as quatro leituras: Marxismo 41/70, Liberalismo 16/35, Social-democracia 34/70, Anarquismo 10/50. O saldo restante do teto de US$ 6 é ~US$ 4,2; a próxima decisão é entre alvos editoriais das leituras e um novo lote de verbetes.
7. **Publicação da expansão** — o release `c0be77b` foi publicado e o ponteiro público já aponta para ele; o próximo deploy do Pages fixa o novo conteúdo no HTML prerenderizado.

## Próxima ação

1. Rodar Lighthouse mobile na URL publicada e comparar com o relatório anterior; o d3-force já saiu do chunk do grafo e a vizinhança P2 está implementada.
2. Seguir a P2: histórico (`?no=` com push em seleção explícita), filtro por período e caminho entre dois nós.
3. A Onda 1 está fechada por revisão de IA (96/100) e o modelo é Haiku medium + Sonnet low. O lote de verbetes da Onda 2 foi concluído; a próxima frente são as relações entre entidades das quatro leituras e os alvos que faltam.
4. Decidir o próximo lote: alvos editoriais das quatro leituras ou um novo recorte de verbetes, com o saldo de ~US$ 4,2.
5. Rotacionar o token Cloudflare e desligar o Vercel no painel.
6. Só depois iniciar a fase 0 dos itinerários.

## Mapa rápido

- Produto e escopo: [`product/ESCOPO-ATUAL.md`](product/ESCOPO-ATUAL.md)
- Arquitetura: [`architecture/ARCHITECTURE.md`](architecture/ARCHITECTURE.md)
- Dados e carregamento: [`architecture/DADOS-E-CARREGAMENTO.md`](architecture/DADOS-E-CARREGAMENTO.md)
- Pipeline editorial: [`architecture/FLUXO-DE-POPULACAO.md`](architecture/FLUXO-DE-POPULACAO.md)
- Design e leitura: [`design/PAGE_STANDARD.md`](design/PAGE_STANDARD.md)
- Voz: [`design/GUIA-DE-VOZ.md`](design/GUIA-DE-VOZ.md)
- Operação: [`operations/PRODUCAO.md`](operations/PRODUCAO.md)
- Agentes: [`agents/PROMPT-SYSTEM.md`](agents/PROMPT-SYSTEM.md)
- Itinerários: [`design/ITINERARIOS.md`](design/ITINERARIOS.md) (plano)
- Histórico: [`archive/2026-11/README.md`](archive/2026-11/README.md)

## Protocolo

- Ao começar: ler este arquivo, `docs/README.md`, `git status` e `git log -5`.
- Ao terminar: atualizar a seção **Estado atual**, **Trabalho ativo** e **Próxima ação**; o relato detalhado vai para o arquivo do mês, não para este handoff.
- Não registrar transcrição, opinião ou suposição como fato verificado.
- `AGENTS.md` continua sendo a fonte única das regras.

