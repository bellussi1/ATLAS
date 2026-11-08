Status: atual
Última verificação: 08/11/2026

# Contexto vivo do ATLAS

Atualizado em 08/11/2026. Este é o handoff curto entre sessões. O histórico completo, com as 58 entradas anteriores, está em [`archive/2026-11/active-context-history.md`](archive/2026-11/active-context-history.md). O mapa dos documentos está em [`README.md`](README.md).

## Estado atual

- Repositório: `C:\Users\Bellussi\Documents\Workspace\ATLAS`.
- Gitflow: PR **#50** (`develop` → `master`) foi mergeado em **`31b8d8b`**, o PR **#51** (pacotes de conteúdo) em **`21bba13`** e o PR **#52** (d3-force lazy) em **`c7a0448`**; o deploy do Pages rodou com sucesso nas três rodadas. O `develop` segue para a próxima rodada.
- Deploy: origem única `https://atlas-bellussi.pages.dev` (Cloudflare Pages, Direct Upload). `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` estão cadastrados; o job `deploy-pages` publica o artefato verificado em push para a `master`. O Vercel foi removido do repositório, mas o projeto antigo ainda precisa ser desligado no painel.
- Conteúdo: 13 coleções. Release **`e841fac…`** publicado em 08/11 com o mesmo conteúdo do `2f7649…`, agora empacotado em `bundle` (23,7 MB) e `networkBundle` (4,1 MB); `content/content-pointer.json` aponta para os dois pacotes. O site antigo continua lendo as coleções; o novo build lê o pacote.
- **Worker de conteúdo**: a conta gratuita passou de **100 mil** requisições/dia (186.096 no alerta). O release empacotado reduz a navegação de leitura/catálogo de ~17 para **2 requisições** (ponteiro + pacote), `/acervo` para **2** e `/grafos` para **2** (ponteiro + `networkBundle`). Medição na URL publicada em 08/11: home **0**; acervo **2**; leitura/verbete **2** na navegação SPA e **1** na carga direta; grafo **2** na SPA e **1** na carga direta. Depois do `/acervo`, abrir um verbete na mesma sessão custa **0**. O ponteiro vem do prerender nas cargas diretas. O consumo futuro cai, mas o limite do dia ainda depende do reset ou do upgrade.
- Build local: **1.186 páginas no sitemap**; canonical e robots usam `https://atlas-bellussi.pages.dev` como origem padrão, com `ATLAS_SITE_URL` apenas para domínio próprio.
- CI: verify do PR **#52** e do merge **`c7a0448`** verde, com 355 testes, 184 de conteúdo e 155 e2e; `deploy-pages` concluído. O `ingest:fetch-raw` segue estável. O probe agendado de `uptime` passou a testar as rotas canônicas `/leitura/marxismo/` e `/leitura/liberalismo/` como 200 e as antigas como 301, corrigindo a falha a cada 15 minutos.

## Verificações recentes

- `npm test`: **355/355**.
- `npm run test:content`: **184/184**.
- `npm run build`: passou, **1.185 páginas prerenderizadas**, canonical absoluto em todas as páginas.
- `npx playwright test`: **155/155**, incluindo o contrato de carregamento: leitura baixa só o `bundle` e `/grafos` só o `networkBundle`.
- `npm run check:links`: **1.187 páginas** verificadas.
- `npm run lint` e `npm run typecheck`: exit 0.
- `content:build` local: release **`c0be77b`**, 13 coleções, **1.190 entidades**, **945 relações** e **775 documentadas**; o ponteiro público segue em **`e841fac`**.
- Cobertura documentada das quatro leituras: **Marxismo 41, Liberalismo 16, Social-democracia 34, Anarquismo 10**; metas 70/35/70/50.
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
- **Expansão de relações (paga)**: reextração de Marxismo/Liberalismo, 141 verbetes, 33 alvos e os 376 verbetes restantes geraram **+99 relações documentadas** (676 → 775) e **+32 entidades** (release local **`c0be77b`**, ainda não publicado). Custo de **~US$ 1,78** do teto de US$ 6; restam ~US$ 4,2. O `extract.mjs` usa Sonnet **low** na segunda passada. Detalhes em `docs/research/EXPANSAO-RELACOES-2026-11.md`.
- **Onda 2 / verbetes citados**: 908 artigos e **907 rascunhos** recuperados do worktree do `.claude`; os 907 foram publicados em `atlas-drafts/wiki/verbetes-citados/`. A coleção passou a **928 entidades e 496 relações** (447 antes da expansão). O lote dos 376 verbetes sem relação foi executado em três partes e consolidado; a extração em massa está concluída. As quatro leituras seguem em **41/16/34/10** relações documentadas (metas 70/35/70/50).

- **Onda 0 / expansão**: linha de base medida e gold set gerado em `docs/research/EXPANSAO-BASELINE-2026-11.md` e `docs/research/gold-set-2026-11/`. O achado principal é que as 122/75/35/10 relações incluem links de navegação; documentadas são **33/11/34/10 (88)**. A captura foi recuperada do worktree do `.claude`: Social-democracia 68/68, Anarquismo 54/54 e `verbetes-citados` 908 artigos/907 rascunhos. Os 907 rascunhos de verbetes foram publicados no `atlas-drafts`; o estágio 5 fica aberto por 3/4 rascunhos enxutos e a reextração paga ainda não foi autorizada.

- **Limpeza de disco**: 15 worktrees mesclados e limpos removidos (incluindo `loving-khayyam`, `ATLAS-gitflow` e `pipeline-tradicao`), ~22,5 GB; `generated/raw-cache` (9,6 GB), blobs locais de `scripts/ingestion` (909 MB), `tmp` e `dist` removidos. `output/` foi movido para `C:\Users\Bellussi\Documents\ATLAS-output`. Restam apenas worktrees sujos ou não mesclados (`great-chatelet`, `mystifying-tharp`, `rede-ux`, `youthful-spence`, `zen-solomon`) e `ATLAS-release`.

- **Grafo, estado atual**: o release público já tem `network`, então `/grafos` faz **2 requisições** ao Worker em vez de 11–17. Adicionei `?no=<id>` para link direto, "Ver no grafo" nos verbetes, filtro de conectados e zoom inicial de 145% no mobile (607 nós visíveis), além de "Ver como lista" no mobile. Lighthouse: desktop **88** (era 78–81), mobile **56** (TBT ~1,2 s), CLS 0/0,013. O `layoutNetwork` (d3-force) saiu do chunk do grafo: virou um chunk lazy de **21,5 kB**, carregado só quando `layouts.network` falta. O próximo ganho de TBT mobile agora é a navegação P2 (vizinhança de 1–2 saltos, histórico, caminho entre dois nós e filtro por período).

- **Onda 1 / calibração + revisão de IA**: amostra de 20 artigos rodada por **US$ 0,0706**. Haiku medium aceitou **17 de 37** relações e rejeitou 0,8% das citações; Haiku low aceitou 7 de 27. A revisão humana foi substituída por **revisão assistida por IA**, autorizada pelo responsável do projeto: Sonnet 5.5 marcou **96 sustenta e 4 não sustenta** nos 100 itens (2 textos e 2 tipos de relação). A re-verificação Sonnet low confirmou 22/24 relações do Haiku (low 7/7; medium 15/17) e rejeitou as duas arestas `desenvolveu-se-em` do Marxismo. Decisão: **Haiku 5.5 medium + Sonnet 5.5 low**; `model-choice.json` atualizado. Metas da Onda 2: **70/50/70/35**.

## Pendências que bloqueiam

1. **Limite do Worker** — a conta gratuita passou de 100 mil requisições/dia; o release empacotado reduz o consumo por navegação (medido em 2 requisições na leitura e no grafo), mas o limite do dia só volta com o reset (00:00 UTC) ou o upgrade. O Pages já serve o pacote.
2. **Vercel** — desconectar a integração Git e excluir o projeto antigo no painel.
3. **Token exposto** — o token Cloudflare foi colado no chat; após o primeiro deploy, rotacionar e atualizar o segredo.
4. **Dependências** — #38/#37 aguardam checks; #44 está em conflito; #40 bloqueado. Não forçar.
5. **Leituras** — faltam os quadros completos de debate, a cronologia estruturada e os cartões de vertentes em Social-democracia e Anarquismo; revisões com fonte parcial e trechos de voz ainda exigem verificação humana.
6. **Carregamento da leitura** — a rota ainda baixa o grafo completo (~24 MB, agora em um único `bundle`) antes de hidratar. As requisições caíram; reduzir os bytes exige desenho por coleção ou entidade.
7. **Texto a 200%** — header e footer não estouram mais; a leitura ainda tem overflow residual (~111 px em 1280 e ~61 px em 390) na cronologia/revisão.

## Pendências que pedem decisão

1. **Limite do Worker** — decidir se o consumo empacotado é suficiente ou se ainda vale o Workers Paid (US$ 5/mês) como margem.
2. **Revisão por IA em itinerários** — o plano recomenda manter `verified` apenas com revisor humano na v1; decidir depois do piloto comparativo.
3. **Itinerários** — aprovar a fase 0 (schema, fixtures e testes) antes de implementar.
4. **Aliases antigos** — se quiser que URLs antigas passem a 404, remover `/grafo`, `/rede`, `/comparar`, `/conhecimento` e os redirecionamentos top-level em uma segunda passada.
5. **Programa de Associados da Amazon** — criar a conta, aprovar o site e definir a tag em `src/app/core/content/queries/amazon-books.ts`. Sem tag, os links não geram comissão; a divulgação só aparece quando ela existir.
6. **Onda 2** — o lote dos verbetes foi concluído (+99 documentadas no total). Faltam as quatro leituras: Marxismo 41/70, Liberalismo 16/35, Social-democracia 34/70, Anarquismo 10/50. O saldo restante do teto de US$ 6 é ~US$ 4,2; a próxima decisão é entre alvos editoriais das leituras e um novo lote de verbetes.
7. **Publicação da expansão de relações** — o release local `c0be77b` tem +99 relações documentadas e +32 entidades; publicar exige aprovação humana.

## Próxima ação

1. Aprovar (ou não) a publicação do release `156b98a`; o ponteiro público ainda aponta para `e841fac`.
2. A Onda 1 está fechada por revisão de IA (96/100) e o modelo é Haiku medium + Sonnet low. O lote de verbetes da Onda 2 foi concluído; a próxima frente são as relações entre entidades das quatro leituras e os alvos que faltam.
3. Decidir o próximo lote: alvos editoriais das quatro leituras ou um novo recorte de verbetes, com o saldo de ~US$ 4,2.
4. Rodar Lighthouse na URL publicada para comparar com o relatório local.
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

