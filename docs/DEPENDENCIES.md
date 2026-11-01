# Bibliotecas de interação e visualização

Decisão aplicada em 01/11/2026, baseada no resumo fornecido pelo usuário. O anexo original não estava disponível na sessão. As opções condicionais abaixo não equivalem a integrações já implementadas.

## Matriz por necessidade

| Necessidade | Escolha do ATLAS | Quando considerar outra opção |
| --- | --- | --- |
| Entrada e saída de elementos | CSS com `animate.enter` / `animate.leave`; transições de estado em CSS | View Transitions como melhoria progressiva de navegação, sem animar âncoras/filtros nem atrasar foco |
| Acessibilidade | HTML nativo primeiro; CDK Dialog para painéis, foco e restauração | `@angular/aria` para um padrão composto que realmente precise de comportamento headless; CDK virtual scroll apenas com volume medido e alternativa textual |
| Grafo editorial | D3 modular e SVG declarativo Angular | Cytoscape.js se algoritmos de rede forem requisito; Sigma.js somente para grafo global grande cuja escala justifique WebGL |
| Timeline | SVG próprio com eixo temporal sticky e lista cronológica operável | vis-timeline apenas se o ganho de prazo compensar adaptar aparência, foco e prerender |
| Mapas históricos | MapLibre GL JS sob demanda, com `maplibre-gl-dates` e dados OpenHistoricalMap | Leaflet para mapa simples; escolher tiles e hospedagem explicitamente, com custos e atribuições próprios |
| Gráficos quantitativos | SVG e módulos D3 conforme a necessidade | Avaliar biblioteca mais completa somente quando um gráfico real exigir; sempre oferecer tabela com unidades, período, fonte e incerteza |
| Motion complexo | CSS primeiro; WAAPI existente no shell permanece | GSAP Flip/DrawSVG apenas com caso concreto e import dinâmico; revisar a licença vigente antes da adoção |

Evitar `@angular/animations` em código novo (depreciado desde 20.2), bibliotecas que imponham React, temas prontos que substituam a identidade editorial, múltiplos motores para a mesma visualização, ScrollSmoother e bibliotecas de smooth scroll. A rolagem pertence ao navegador e à pessoa.

## Aplicação no Marxismo

- `d3-shape` 3 e `d3-scale` 4 são as únicas novas dependências de produção; tipos correspondentes ficam em desenvolvimento. As duas usam licença ISC, conferida nos arquivos LICENSE instalados. Preservar avisos no empacotamento/distribuição.
- D3 calcula curvas e coordenadas em funções puras de `features/ideologies/utils/visualization-geometry.ts`. Angular cria o SVG, os controles e os IDs. Não há `d3-selection`, seleção global do DOM ou simulação de força concorrendo com hidratação.
- O grafo usa todos os registros para fixar coordenadas; filtros alteram relações visíveis sem reorganizar nós. A altura acompanha o número de nós. A tabela conserva contexto, direção, certeza e fontes; posições não representam genealogia nem distância histórica.
- A timeline usa anos iniciais disponíveis em escala proporcional, com domínio fixo durante filtros. Datas ausentes não viram zero; anos iguais compartilham posição. O SVG é complemento visual, oculto da árvore acessível porque a lista contém os mesmos registros e controla o painel. O eixo integra a faixa sticky existente.
- Entradas/saídas de conexões usam `animate.enter`/`animate.leave` e opacidade CSS. Teclado, toque e movimento reduzido não recebem essa animação. Seleção não desloca narrativa e mantém os painéis existentes.
- CDK já resolve os diálogos. Botões, select, details, lista e tabela nativos não justificam adicionar `@angular/aria` agora. Não há série quantitativa ou snapshot cartográfico revisado que justifique publicar um gráfico ou mapa neste recorte. MapLibre, OHM, GSAP, Cytoscape, Sigma e vis-timeline não foram instalados.

## Prerender e acessibilidade

Conteúdo, lista cronológica, tabela, fontes e SVG são gerados no build. Os cálculos são determinísticos, sem aleatoriedade, relógio, medidas de viewport ou acesso a `window`/`document`. Módulos D3 seguem o carregamento lazy da rota; não é necessário adiar o SVG leve para o browser nem substituir conteúdo estático por loader.

Para futuras bibliotecas dependentes de DOM/WebGL, importar e inicializar somente no browser após renderização e sob demanda. Manter resumo/lista/tabela no HTML prerenderizado, reservar dimensões, mostrar falha recuperável e destruir instância/listeners ao sair. Não acessar serviços Wikimedia durante uma visita. Mapas precisam de alternativa textual, controles por teclado e gestos que preservem o scroll da página. Publicar fronteiras apenas com fonte, recorte temporal e indicação de aproximação; conferir cobertura regional e temporal e licenças dos dados/tiles separadamente do código.

IDs de painéis/SVG derivam do ID estável do bloco para permitir reutilização. Seleção usa controles nativos e `aria-pressed`; estados vazios continuam textuais. Foco visível, retorno do diálogo, Escape e preferência de movimento reduzido permanecem critérios de aceite. Isso não constitui uma auditoria WCAG integral.

## Checklist de adoção de dependência

- [ ] Necessidade observável e caso de uso com dados reais; verificar antes componentes existentes e APIs nativas.
- [ ] Compatibilidade com Angular 21, TypeScript strict, ESM e Node 24; evitar wrappers desnecessários.
- [ ] Documentação primária, manutenção, versão fixada pelo lockfile e caminho de remoção/substituição.
- [ ] Licença do código e dos plugins; licenças de dados, mídia e tiles; manter avisos/atribuições.
- [ ] Custo recorrente de API, tiles, hospedagem e manutenção, incluindo limites gratuitos.
- [ ] Impacto observado no build: tamanho bruto/transferido e chunk inicial ou lazy; importar apenas módulos usados.
- [ ] SSR/prerender e hidratação determinística; isolamento browser-only, cleanup e fallback quando necessário.
- [ ] Teclado, foco, leitores de tela, alternativa textual, contraste, toque, 320px e movimento reduzido.
- [ ] Loading/erro/vazio, cliques rápidos e estabilidade de dimensões/scroll durante seleção.
- [ ] Rodar typecheck, lint, testes, build/prerender, E2E e links pertinentes; registrar resultados e limitações reais.

## Fontes técnicas

- [Angular: migração para animações CSS](https://angular.dev/guide/animations/migration), [entrada e saída](https://angular.dev/guide/animations) e [Angular Aria](https://angular.dev/guide/aria/overview).
- [D3: curvas de conexão](https://d3js.org/d3-shape/link) e [escalas lineares](https://d3js.org/d3-scale/linear).
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) e [plugin de datas do OpenHistoricalMap](https://github.com/OpenHistoricalMap/maplibre-gl-dates).
- [Licença padrão GSAP](https://gsap.com/community/standard-license/): a ausência de cobrança não elimina as restrições, inclusive sobre ferramentas visuais que concorram com capacidades da Webflow. Nenhum GSAP foi adotado aqui.

## Verificação desta adoção

Executado em 01/11/2026 com Node 24.13.0 e npm 11.6.2:

- `npm run typecheck`: passou.
- `npm test`: 21 arquivos, 107 testes passaram. Após reduzir a densidade das marcas do eixo, o teste de geometria foi repetido: 2 testes passaram.
- `npm run lint`: passou, incluindo 5 testes dos limites arquiteturais, Biome e Prettier. Corrigida a ordenação do import novo antes da repetição.
- `npm run build`: passou, três rotas prerenderizadas. Bundle inicial observado: 337,16 kB bruto / 92,78 kB de transferência estimada. Chunk lazy da página de ideologia: 110,32 kB / 28,73 kB. Estes números incluem código e conteúdo existentes; não são uma medição isolada do acréscimo de D3.
- O build ainda emite aviso de 87 bytes acima do orçamento de 7 kB em `ideology-atlas.component.scss`, arquivo de alterações concorrentes do Liberalismo. Os estilos alterados neste recorte não excedem o orçamento.
- `npm run test:e2e`: 13 testes passaram, incluindo teclado, toque, geometria do painel, fontes, ausência de overflow, verificações axe existentes e a nova verificação do SVG prerenderizado/eixo fixo entre filtros em 320 px. O seletor do teste novo foi corrigido para correspondência exata após uma falha por ambiguidade com a barra de progresso.
- `npm run check:links`: links internos de quatro arquivos HTML estáticos verificados (inclui o HTML de fallback, além das três rotas públicas).
- `npm audit --omit=dev`: nenhuma vulnerabilidade reportada nas dependências de produção. A instalação completa reportou 34 vulnerabilidades moderadas; não foi executada atualização automática das ferramentas de desenvolvimento.
- Capturas inspecionadas: `output/playwright/marxismo-timeline-320.png`, `marxismo-timeline-desktop.png` e `marxismo-grafo-desktop.png`. A ausência de erros de página foi verificada no cenário novo. Não foram medidos CLS, leitores de tela reais, texto a 200% ou falhas de rede neste recorte; esses itens não recebem validação implícita.
