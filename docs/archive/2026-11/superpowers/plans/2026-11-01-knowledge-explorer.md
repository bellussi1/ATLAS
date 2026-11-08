# Knowledge Explorer

Pedido: busca universal, catálogos e páginas permanentes no acervo existente.

**Arquitetura:** `features/exploration` recebe páginas de catálogo e detalhe, com consultas puras em core. O índice segue compilado no build. Slugs globais existentes definem `/verbete/:slug`; pessoas, obras e ideologias são recortes do mesmo catálogo, sem páginas duplicadas. Dossiês existentes preservam seus URLs. Fontes e exemplos metodológicos indexados recebem destinos reais. Sem novas coletas nem afirmações históricas.

**Composição:** índice de arquivo, tipografia ampla, resultados em linhas com resumo e estado editorial; coluna lateral de filtros no desktop e fluxo simples no mobile. Papel, tinta, vermelho e fontes locais existentes. Detalhes mantêm leitura, conexões com evidências e proveniência próximas ao conteúdo.

- [x] Testar consultas de catálogo, busca por aliases e acentos, estados e destinos.
- [x] Implementar `/conhecimento`, `/entidades`, `/ideologias`, `/pessoas`, `/obras`, índice `/fontes` e detalhes de todas as entradas indexadas.
- [x] Integrar busca da home, navegação, contexto, metadados, breadcrumbs e prerender de parâmetros.
- [x] Validar unitários, compilador, lint, typecheck, build, links e jornadas E2E com teclado, mobile, erros e vazios; revisar e criar um commit local.

**Decisões:** o pedido substitui a restrição temporária de três páginas. Exemplos metodológicos seguem identificados como exemplos, inclusive formatos previstos, sem confusão com pessoas e obras históricas nos catálogos. Rota desconhecida mantém o retorno à home existente. Implementação feita neste chat, sem publicar nem fazer push.
