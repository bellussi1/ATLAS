# Rede e comparadores: revisão de interface

Entrega de 01/11/2026, após a rejeição do visual e do fluxo das duas telas.

## Problemas e correções

- **Rede:** mostrava o acervo inteiro como grade extensa, com a ficha abaixo. Agora parte de um registro, mostra seus vizinhos diretos e mantém contexto e vínculos ao lado no desktop. Pontos e linhas substituem caixas repetidas; seleção com destaque e foco visível.
- **Busca no recorte:** por nome, com resultados operáveis por teclado, contagem e estado vazio. Lista completa continua disponível. No celular, busca, lista e vínculos dão a navegação sem exigir o diagrama.
- **Vínculos:** a lista permite seguir outro registro e abrir evidência, direção, procedência e fontes. No mobile usa a rolagem natural da página.
- **Comparação:** os controles de escolha vêm antes dos filtros. Inversão dos lados, exemplos existentes e critérios alinhados no desktop. Formulações completas e referências em disclosures nativos; conteúdos, classificações e limites preservados.
- **Filtros e método:** abertos sob demanda. Recortes ativos, inválidos ou pares indisponíveis mostram os filtros para recuperação. A cronologia da rede também abre sob demanda e mantém o eixo global.
- **URLs:** seleção, filtros e pares continuam na URL. Passar do registro para a comparação preserva o recorte. Navegação local usa a opção de scroll manual do Router.

## Arquitetura

`AnalysisComponent`, `AnalysisFiltersComponent` e `KnowledgeNetworkComponent` seguem na feature de exploração. `buildExplorationLayout` gera as vizinhanças por registro e coleção, com pontos e curvas determinísticos; não há cálculo de posições no browser. Testes do build verificam vizinhos diretos, vínculos, centro e estabilidade após reordenar a entrada. Nenhum conteúdo histórico, fonte ou licença foi alterado.

## Verificação

- Build de produção: 82 rotas estáticas.
- Typecheck da aplicação e dos testes: passou.
- Unitários: 140 testes em 29 arquivos.
- Pipeline de conteúdo: sete testes, incluindo geometria local.
- Lint: Angular/ESLint, seis testes arquiteturais, Biome e Prettier.
- E2E completo: 43 testes. Suíte de rede e comparação repetida após os ajustes visuais: sete testes.
- Links internos: 83 HTMLs verificados.
- Detector mecânico da skill Impeccable: sem achados.
- Capturas de desktop (1440 px) e mobile (390 px) inspecionadas; E2E verificou reflow e axe a 320 px. Capturas locais em `output/playwright`, não versionadas.

Sem violações axe graves ou críticas nas superfícies verificadas; não certifica WCAG integral. O diagrama mostra vínculos diretos, não o acervo inteiro; busca e lista completa permitem mudar o foco. Referências e revisão editorial mantêm os limites declarados no conteúdo.
