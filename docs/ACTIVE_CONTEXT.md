Status: atual
Última verificação: 08/11/2026

# Contexto vivo do ATLAS

Atualizado em 08/11/2026. Este é o handoff curto entre sessões. O histórico completo, com as 58 entradas anteriores, está em [`archive/2026-11/active-context-history.md`](archive/2026-11/active-context-history.md). O mapa dos documentos está em [`README.md`](README.md).

## Estado atual

- Repositório: `C:\Users\Bellussi\Documents\Workspace\ATLAS`.
- Gitflow: `develop` é a integração; o PR **#50** (`develop` → `master`) está aberto. `master` está em `69eaed4` e recebeu #41, #45 e #39. Último verify verde: **`0d0a8a9`**.
- Deploy: origem única `https://atlas-bellussi.pages.dev` (Cloudflare Pages, Direct Upload). `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` estão cadastrados; o job `deploy-pages` publica o artefato verificado em push para a `master`. O Vercel foi removido do repositório, mas o projeto antigo ainda precisa ser desligado no painel.
- Conteúdo: 13 coleções. Release **`2f7649…`** publicado em 08/11, com 12 registros de `verbetes-citados` atualizados, revisões de capítulo, figuras curadas e a projeção `network`; `content/content-pointer.json` foi atualizado. O site público passa a ler esse release.
- **Worker de conteúdo**: a conta gratuita passou de **100 mil** requisições/dia (186.096 no alerta). O Pages estático continua; o `atlas-content-delivery` pode falhar até o reset ou o upgrade. A publicação do `network` reduz o grafo, mas cada página de conteúdo ainda faz ~17 chamadas.
- Build local: **1.186 páginas no sitemap**; canonical e robots usam `https://atlas-bellussi.pages.dev` como origem padrão, com `ATLAS_SITE_URL` apenas para domínio próprio.
- CI: o verify de `0d0a8a9` passou (lint, tipos, testes, conteúdo, ingestão, build, links e e2e). As mudanças de Lighthouse desta rodada têm verificações locais, mas ainda não têm CI próprio.

## Verificações recentes

- `npm test`: **351/351**.
- `npm run test:content`: **184/184**.
- `npm run build`: passou, **1.186 páginas no sitemap**, canonical absoluto em todas as páginas prerenderizadas.
- `npm run check:links`: **1.187 páginas** verificadas.
- `npx playwright test`: **153/153** após endurecer o teste de sincronização do índice de leitura (usava `offsetTop` e falhava sob carga).
- `npm run lint` e `npm run typecheck`: exit 0.
- Lighthouse local com brotli/gzip na preview: mobile **91–94** e desktop **100** em desempenho; acessibilidade, boas práticas e SEO **100** nas duas emulações. Nenhum reflow forçado e nenhum erro de console.
- CSS: `/acervo` caiu de 13 para 9 cores de texto computadas e `/leitura/marxismo` de 14 para 10; tamanhos de fonte agora saem dos tokens `--text-*` (11, 12, 13, 14, 15, 16 e 17px).
- `content:build` após a Onda 2: release **`2f7649…`**, 13 coleções; `test:content` **184/184**.
- Auditoria assistida por IA dos 109 itens da amostra: **106 sustenta**, **2 não sustenta**, **1 inverte**; os três primeiros casos para conferência são John Rawls, Voltaire e Kant. Não substitui a revisão humana.
- Grafo, medição local: primeiro nó **948 ms**, seleção por clique **108 ms**, pan p95 **33,3 ms**.

## Trabalho ativo

- **PR #50**: leituras, shell, deploy no Pages, foco do grafo e limpeza de código. Aguarda o verify do commit final e o merge.
- **Grafo**: foco por seleção implementado; o `/grafos` lê a projeção `network` (3,13 MB contra 12,6 MB das coleções), mas o ganho de carregamento só chega ao site depois de `content:publish`.
- **Limpeza**: `/mesa` removido; `features/study`, `historical-visualizations`, `editorial-mark`, `editorial-text`, `notice` e `timeline-periods` removidos. Redirecionamentos de compatibilidade (`/marxismo`, `/grafo`, `/rede`, `/comparar`, `/conhecimento`) foram mantidos.
- **Documentação**: `ACTIVE_CONTEXT` compactado; histórico, auditorias, validações e planos antigos foram para `docs/archive/2026-11/`.
- **Lighthouse da home**: canonical absoluto gerado no build e mantido na navegação, scroll com offsets em cache, revelação em lote (um layout por página, após o primeiro paint), catálogos leves fora do índice de busca, rotas de ideologias/exploração lazy e preload do IBM Plex Mono. Os preconnects do Wikimedia foram removidos por não serem usados na home.
- **Higiene de console e CSS**: Zod roda sem JIT para não violar o CSP, o filtro de temas ganhou `id`, o logo do rodapé declara proporção e a paleta do `record-card` passou a usar tokens. A preview local agora comprime em brotli/gzip e aplica cache imutável a JS/CSS com hash, aproximando a medição do Pages.
- **Links de compra**: registros de obra que são livros, com autor conhecido, ganham "Comprar na Amazon" direto para a busca de livros, com `rel="sponsored"` e divulgação quando houver tag. A lista curada fica em `core/content/queries/amazon-books.ts`; tópicos, periódicos e o filme do acervo não recebem link. Sem `AMAZON_ASSOCIATE_TAG`, o link existe mas não gera comissão.
- **Onda 2 / verbetes citados**: 12 artigos baixados e extraídos com **Haiku 5.5 medium** (relações conferidas por Sonnet 5.5 low), com **US$ 0,076** de gasto acumulado. Os 12 rascunhos foram publicados em `atlas-drafts/wiki/verbetes-citados/` e o índice, antes 404, agora existe. O lote completo de 414 exige várias horas de captura (a resolução de links de cada artigo é o gargalo), não uma sessão; o extrator em si custa cerca de US$ 0,005 por artigo.

## Pendências que bloqueiam

1. **PR #50** — aguardar o verify do commit final e fazer o merge; o `deploy-pages` roda na `master`.
2. **Limite do Worker** — a conta gratuita passou de 100 mil requisições/dia; até o reset (00:00 UTC) ou o upgrade, o conteúdo dinâmico pode falhar. Decidir entre Workers Paid (US$ 5/mês) e reduzir as ~17 chamadas por página.
3. **Vercel** — desconectar a integração Git e excluir o projeto antigo no painel.
4. **Token exposto** — o token Cloudflare foi colado no chat; após o primeiro deploy, rotacionar e atualizar o segredo.
5. **Dependências** — #38/#37 aguardam checks; #44 está em conflito; #40 bloqueado. Não forçar.
6. **Leituras** — faltam os quadros completos de debate, a cronologia estruturada e os cartões de vertentes em Social-democracia e Anarquismo; revisões com fonte parcial e trechos de voz ainda exigem verificação humana.
7. **Carregamento da leitura** — a rota ainda baixa o grafo completo (~24 MB) antes de hidratar. Exige desenho próprio (coleção única ou grafo combinado).
8. **Texto a 200%** — header e footer não estouram mais; a leitura ainda tem overflow residual (~111 px em 1280 e ~61 px em 390) na cronologia/revisão.

## Pendências que pedem decisão

1. **Limite do Worker** — decidir entre Workers Paid (US$ 5/mês) ou reduzir as chamadas por página antes que o conteúdo dinâmico falhe.
2. **Revisão por IA em itinerários** — o plano recomenda manter `verified` apenas com revisor humano na v1; decidir depois do piloto comparativo.
3. **Itinerários** — aprovar a fase 0 (schema, fixtures e testes) antes de implementar.
4. **Aliases antigos** — se quiser que URLs antigas passem a 404, remover `/grafo`, `/rede`, `/comparar`, `/conhecimento` e os redirecionamentos top-level em uma segunda passada.
5. **Programa de Associados da Amazon** — criar a conta, aprovar o site e definir a tag em `src/app/core/content/queries/amazon-books.ts`. Sem tag, os links não geram comissão; a divulgação só aparece quando ela existir.
6. **Lote completo da Onda 2** — decidir entre refazer a captura dos 414 artigos em lotes de 40–60 (cerca de uma hora por lote, ~US$ 0,005 por artigo), restaurar os artefatos da máquina anterior ou parar no piloto de 12. A coleção já tem 896 registros; o lote completo é atualização e auditoria, não criação de 896 novos verbetes.

## Próxima ação

1. Fazer o verify final do PR #50; se verde, mergear e verificar o deploy do Pages — é o deploy que leva o canonical e o restante do Lighthouse à produção.
2. Revisar os 3 itens sinalizados pela auditoria (Rawls, Voltaire, Kant) e decidir o lote de 414 ou o piloto de 12.
3. Com autorização, executar `content:publish` e confirmar que `/grafos` passou a carregar `network` + `layouts` e que os 12 verbetes atualizados chegam ao público.
4. Rodar Lighthouse na URL publicada (com compressão) para comparar com o relatório anterior.
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
