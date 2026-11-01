# Rede e comparadores: revisão de interface

Entrega de 01/11/2026, após a rejeição do visual e do fluxo das duas telas.

## Problemas observados e correções

- A rede apresentava o acervo inteiro como uma grade extensa, com a ficha abaixo. Agora parte de um registro, mostra seus vizinhos diretos e mantém contexto e vínculos ao lado no desktop. Pontos e linhas substituem caixas repetidas; a seleção tem destaque e foco visível.
- Foi adicionada busca por nome no recorte, com resultados operáveis por teclado, contagem e estado vazio. Uma lista completa continua disponível. No celular, busca, lista e vínculos fornecem a navegação sem exigir o diagrama.
- A lista de vínculos permite seguir outro registro e abrir evidência, direção, procedência e fontes. No mobile ela usa a rolagem natural da página.
- Os controles de escolha da comparação vêm antes dos filtros. Há inversão dos lados, exemplos existentes e critérios alinhados no desktop. Formulações completas e referências ficam em disclosures nativos; conteúdos, classificações e limites foram preservados.
- Filtros e método passam a ser abertos sob demanda. Recortes ativos, inválidos ou pares indisponíveis mostram os filtros para recuperação. A cronologia da rede também abre sob demanda e mantém o eixo global.
- Seleção, filtros e pares continuam nas URLs. A passagem do registro selecionado para a comparação preserva o recorte. Navegação local usa a opção de scroll manual do Router.

## Arquitetura

`AnalysisComponent`, `AnalysisFiltersComponent` e `KnowledgeNetworkComponent` continuam na feature de exploração. `buildExplorationLayout` gera as vizinhanças por registro e coleção, com pontos e curvas determinísticos; não foi adicionado cálculo de posições no browser. Os testes do build verificam vizinhos diretos, vínculos, centro e estabilidade após reordenação da entrada. Nenhum conteúdo histórico, fonte ou licença foi acrescentado ou alterado.

## Verificação

- Build de produção: 82 rotas estáticas.
- Typecheck da aplicação e dos testes: passou.
- Unitários: 140 testes em 29 arquivos passaram.
- Pipeline de conteúdo: sete testes passaram, incluindo a geometria local.
- Lint: Angular/ESLint, seis testes arquiteturais, Biome e Prettier passaram.
- Suíte E2E completa: 43 testes passaram. A suíte específica de rede/comparação foi repetida após os ajustes visuais, com sete testes passando.
- Links internos: 83 arquivos HTML verificados.
- Detector mecânico da skill Impeccable: nenhum achado na execução.
- Capturas de desktop a 1440 px e mobile a 390 px foram inspecionadas; E2E também verificou reflow e axe a 320 px. Capturas locais ficam em `output/playwright` e não são versionadas.

A auditoria automatizada não encontrou violações axe graves ou críticas nas superfícies verificadas; isso não certifica conformidade WCAG integral. O diagrama mostra vínculos diretos, não o acervo inteiro simultaneamente; a busca e a lista completa permitem mudar o foco. Referências e revisão editorial mantêm os limites já declarados no conteúdo.
