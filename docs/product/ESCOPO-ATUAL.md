# Escopo atual: Knowledge Explorer

O pedido posterior de 01/11/2026 ampliou o escopo para busca universal, catálogos e páginas permanentes. As leituras `/marxismo` e `/liberalismo` e a mesa da Home continuam disponíveis.

Rotas novas: `/conhecimento`, `/entidades`, `/ideologias`, `/pessoas`, `/obras`, `/fontes`, `/verbete/:slug` e exemplos metodológicos em `/explorar/:tipo/:slug`. São 65 rotas prerenderizadas, incluindo 48 entidades e oito exemplos identificados como metodologia. `/fontes#source-<id>` mantém o destino das referências. Não há coleta adicional nem alegação de nova revisão humana.

Busca e filtros usam `q`, `tipo` e `estado`; a página de detalhe permite voltar ao recorte anterior. O permalink e o canonical não dependem desses parâmetros. IDs e slugs existentes são preservados. Links desconhecidos tratados pelo Router mantêm o retorno à home; verbetes desconhecidos mostram estado de recuperação na SPA e não são inventados no prerender.

Verificações desta entrega e limites: [Knowledge Explorer](../quality/KNOWLEDGE-EXPLORER.md).

## Histórico: redução temporária a três páginas

Em 01/11/2026, a pedido do usuário, a aplicação foi limitada temporariamente a:

- `/`: home, busca local nas duas leituras e mesa de pesquisa.
- `/marxismo`: leitura contínua com fontes e interações no contexto.
- `/liberalismo`: rede, cronologia e imagens do atlas existente.

Foram removidos os arquivos de páginas de exploração, busca geral, verbetes, estudos, fontes, sobre, sistema visual, hub de ideologias e índice antigo de Marxismo. O componente do debate de valor permanece como bloco interno de Marxismo, sem URL própria. Caminhos não reconhecidos pelo Angular retornam à home. A hospedagem deve manter seu fallback estático conforme a configuração do provedor.

Header, footer, home e links das duas leituras foram ajustados ao escopo. Prévias permanecem no lugar; referências externas continuam disponíveis. O link do exercício leva às fontes do próprio Marxismo e preserva a seleção e os filtros. Fontes, licenças e dados históricos foram preservados. As regras em `public/_redirects` compatibilizam URLs antigas nas hospedagens que suportam esse formato; não são páginas adicionais.

Verificações: `npm run build` passou com **3 rotas prerenderizadas**; `npm test` passou com **96 testes em 17 arquivos**; `npm run test:e2e -- --workers=2` passou com **6 testes**, incluindo lista de destinos internos, busca, leitura, fontes, interação do Liberalismo, mobile e axe (sem violações graves/críticas nos estados auditados). `npm run lint`, `npm run typecheck` e `npm run check:links` passaram; o último verificou os 3 HTMLs de conteúdo e o shell CSR. Não foi realizada auditoria WCAG integral.

Os testes das páginas removidas foram substituídos pela cobertura deste escopo; os testes de dados e contratos preservados continuam na suíte. Documentos V4 anteriores são histórico da etapa anterior e não representam a navegação atual. `AGENTS.md` e `README.md` foram atualizados. Nenhum push ou deploy foi feito.
