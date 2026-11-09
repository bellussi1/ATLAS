Status: atual
Última verificação: 08/11/2026

# Escopo atual: exploração, ampliação editorial e idiomas

Pedido posterior de 01/11/2026 ampliou o escopo para busca universal, catálogos e páginas permanentes. As leituras `/marxismo` e `/liberalismo` e a mesa da Home seguem disponíveis.

**Rotas:** `/acervo`, `/entidades`, `/ideologias`, `/pessoas`, `/obras`, `/fontes`, `/verbete/:slug`, `/paises`, `/estados`, `/cidades`, `/locais`, `/regimes`, `/partidos`, `/instituicoes`, `/acontecimentos`, `/conceitos` e `/lugares`. São 1.221 páginas no sitemap do build atual. `/fontes#source-<id>` mantém o destino das referências.

**Planejado, não implementado:** `/itinerarios` e `/itinerario/:slug` são o próximo produto editorial, ainda sem rota, schema ou conteúdo. O contrato, os pilotos comparativo e histórico e as fases estão em [Itinerários editoriais](../design/ITINERARIOS.md).

- Busca e filtros usam `q`, `tipo` e `estado`; a página de detalhe permite voltar ao recorte anterior. Permalink e canonical não dependem desses parâmetros. IDs e slugs existentes preservados.
- `/conhecimento` e `/comparar` redirecionam para `/acervo`; `/grafo` e `/rede` redirecionam para `/grafos`.
- Endereços desconhecidos mostram "Página não encontrada" no próprio endereço, sem redirecionar para a home. Verbetes desconhecidos usam a mesma mensagem na SPA e não são gerados no prerender.

Verificações e limites: [Knowledge Explorer(../archive/2026-11/quality/KNOWLEDGE-EXPLORER.md).

**Rede e comparadores:** geometria antecipada por coleção; filtros comuns (`colecao`, `tipo`, `relacao`, `de`, `ate`, `semData`); timeline reutilizada na rede e na comparação histórica. `/grafos` preserva a seleção em `no`. Fontes, direção, incerteza e lacunas seguem explícitas; a interface não calcula similaridade nem inventa causalidade. [Método e validação(../archive/2026-11/quality/REDE-E-COMPARADORES.md).

**Ampliação editorial:** dois países, dois recortes de regime, um partido, uma instituição, um acontecimento e uma obra, com fontes institucionais. Tipos `country` e `regime` têm contratos próprios, sem reclassificar automaticamente lugares, governos ou formações políticas antigas. Quatro narrativas têm tradução para inglês revisada pelo assistente, identificada como IA e sem revisão humana; o estado historiográfico segue pendente. Seletor de idioma e fallback valem para catálogos e registros, não para a interface inteira nem para os dossiês. [Contratos e validação(../archive/2026-11/quality/AMPLIACAO-EDITORIAL-E-IDIOMAS.md).

## Histórico: redução temporária a três páginas

Em 01/11/2026, a pedido do usuário, a aplicação foi limitada temporariamente a:

- `/`: home, busca local nas duas leituras e mesa de pesquisa.
- `/marxismo`: leitura contínua com fontes e interações no contexto.
- `/liberalismo`: rede, cronologia e imagens do atlas existente.

Removidos os arquivos de páginas de exploração, busca geral, verbetes, estudos, fontes, sobre, sistema visual, hub de ideologias e índice antigo de Marxismo. O componente do debate de valor permanece como bloco interno de Marxismo, sem URL própria. Caminhos não reconhecidos mostram "Página não encontrada" sem redirecionar: o Angular exibe a mensagem em navegação interna e `public/404.html` responde com status 404 na hospedagem estática (Cloudflare Pages serve o `404.html` da raiz quando não há rota correspondente).

Header, footer, home e links das duas leituras ajustados ao escopo. Prévias no lugar; referências externas disponíveis. O link do exercício leva às fontes do próprio Marxismo, preservando seleção e filtros. Fontes, licenças e dados históricos preservados. As regras em `public/_redirects` compatibilizam URLs antigas nas hospedagens que suportam esse formato; não são páginas adicionais.

**Verificações da redução:** `npm run build` com **3 rotas prerenderizadas**; `npm test` com **96 testes em 17 arquivos**; `npm run test:e2e -- --workers=2` com **6 testes**, incluindo lista de destinos internos, busca, leitura, fontes, interação do Liberalismo, mobile e axe (sem violações graves ou críticas nos estados auditados). `npm run lint`, `npm run typecheck` e `npm run check:links` passaram; o último verificou os 3 HTMLs de conteúdo e o shell CSR. Sem auditoria WCAG integral.

Testes das páginas removidas substituídos pela cobertura deste escopo; testes de dados e contratos preservados. Documentos V4 anteriores são histórico e não representam a navegação atual. `AGENTS.md` e `README.md` atualizados. Sem push nem deploy.
