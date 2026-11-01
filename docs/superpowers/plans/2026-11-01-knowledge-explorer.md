# Knowledge Explorer

Pedido: implementar busca universal, catálogos e páginas permanentes no acervo existente.

Arquitetura: `features/exploration` recebe páginas de catálogo e detalhe, com consultas puras em core. O índice continua compilado no build. Slugs globais existentes definem `/verbete/:slug`; pessoas, obras e ideologias são recortes do mesmo catálogo, evitando páginas duplicadas. Dossiês existentes preservam seus URLs. Fontes e exemplos metodológicos indexados recebem destinos reais. Não haverá novas coletas ou afirmações históricas.

Composição: índice de arquivo, tipografia ampla, resultados em linhas com resumo e estado editorial; uma coluna lateral de filtros no desktop e fluxo simples no mobile. Papel, tinta, vermelho e fontes locais existentes. Detalhes mantêm leitura, conexões com evidências e proveniência próximas ao conteúdo.

- [x] Testar consultas de catálogo, busca por aliases/acentos, estados e destinos.
- [x] Implementar catálogos `/conhecimento`, `/entidades`, `/ideologias`, `/pessoas`, `/obras`, índice `/fontes` e detalhes reais de todas as entradas indexadas.
- [x] Integrar busca da home, navegação, contexto, metadados, breadcrumbs e prerender de parâmetros.
- [x] Validar unitários, compilador, lint, typecheck, build, links e jornadas E2E com teclado/mobile/erros/vazios; revisar e criar um commit local.

Decisões: o pedido atual substitui a restrição temporária de três páginas. Exemplos metodológicos permanecem identificados como exemplos, inclusive formatos previstos, sem confundir com pessoas/obras históricas nos catálogos. Uma rota desconhecida mantém o retorno à home existente. A implementação é executada neste chat, sem publicar ou fazer push.
