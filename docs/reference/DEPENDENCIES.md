# Bibliotecas de interação e visualização

Decisão aplicada em 01/11/2026, com base no resumo fornecido pelo usuário. O anexo original não estava disponível na sessão. As opções condicionais abaixo não equivalem a integrações implementadas.

## Matriz por necessidade

| Necessidade                  | Escolha do ATLAS                                                                 | Quando considerar outra opção                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Entrada e saída de elementos | CSS com `animate.enter` e `animate.leave`; transições de estado em CSS           | View Transitions como melhoria progressiva de navegação, sem animar âncoras ou filtros nem atrasar o foco                                 |
| Acessibilidade               | HTML nativo primeiro; CDK Dialog para painéis, foco e restauração                | `@angular/aria` para padrão composto que precise de comportamento headless; CDK virtual scroll só com volume medido e alternativa textual |
| Grafo editorial              | D3 modular e SVG declarativo do Angular                                          | Cytoscape.js se algoritmos de rede forem requisito; Sigma.js só para grafo global grande cuja escala justifique WebGL                     |
| Timeline                     | SVG próprio com eixo temporal sticky e lista cronológica operável                | vis-timeline só se o ganho de prazo compensar adaptar aparência, foco e prerender                                                         |
| Mapas históricos             | MapLibre GL JS sob demanda, com `maplibre-gl-dates` e dados do OpenHistoricalMap | Leaflet para mapa simples; escolher tiles e hospedagem explicitamente, com custos e atribuições próprios                                  |
| Gráficos quantitativos       | SVG e módulos D3 conforme a necessidade                                          | Biblioteca mais completa só quando um gráfico real exigir; sempre tabela com unidades, período, fonte e incerteza                         |
| Motion complexo              | CSS primeiro; WAAPI existente no shell permanece                                 | GSAP Flip e DrawSVG só com caso concreto e import dinâmico; revisar a licença vigente antes da adoção                                     |

Evitar em código novo: `@angular/animations` (depreciado desde 20.2), bibliotecas que imponham React, temas prontos que substituam a identidade editorial, múltiplos motores para a mesma visualização, ScrollSmoother e bibliotecas de smooth scroll. A rolagem pertence ao navegador e à pessoa.

## Aplicação no Marxismo

- `d3-shape` 3 e `d3-scale` 4 são as únicas novas dependências de produção; os tipos ficam em desenvolvimento. Ambas têm licença ISC, conferida nos arquivos LICENSE instalados. Preservar os avisos no empacotamento e na distribuição.
- `d3-force` 3 (ISC) calcula o layout do grafo em `/grafos` (links, repulsão e colisão entre formas); o build pré-calcula e o cliente usa o resultado compilado, com fallback determinístico.
- D3 calcula curvas e coordenadas em funções puras de `features/ideologies/utils/visualization-geometry.ts`. Angular cria o SVG, os controles e os IDs. Sem `d3-selection`, seleção global do DOM ou simulação de força concorrendo com a hidratação.
- O grafo usa todos os registros para fixar coordenadas; filtros alteram relações visíveis sem reorganizar nós. A altura acompanha o número de nós. A tabela conserva contexto, direção, certeza e fontes; posições não representam genealogia nem distância histórica.
- Timeline: anos iniciais disponíveis em escala proporcional, com domínio fixo durante filtros. Datas ausentes não viram zero; anos iguais compartilham posição. O SVG é complemento visual, oculto da árvore acessível, porque a lista contém os mesmos registros e controla o painel. O eixo integra a faixa sticky existente.
- Entradas e saídas de conexões usam `animate.enter` e `animate.leave` com opacidade CSS. Teclado, toque e movimento reduzido não recebem essa animação. Seleção não desloca a narrativa e mantém os painéis existentes.
- CDK já resolve os diálogos. Botões, select, details, lista e tabela nativos não justificam `@angular/aria` agora. Nenhuma série quantitativa nem snapshot cartográfico revisado justifica um gráfico ou mapa neste recorte. MapLibre, OHM, GSAP, Cytoscape, Sigma e vis-timeline não foram instalados.

## Prerender e acessibilidade

Conteúdo, lista cronológica, tabela, fontes e SVG são gerados no build. Cálculos determinísticos, sem aleatoriedade, relógio, medidas de viewport ou acesso a `window` e `document`. Módulos D3 seguem o carregamento lazy da rota; não é preciso adiar o SVG leve para o browser nem substituir conteúdo estático por loader.

Futuras bibliotecas dependentes de DOM ou WebGL: importar e inicializar só no browser, após a renderização e sob demanda. Manter resumo, lista e tabela no HTML prerenderizado; reservar dimensões; mostrar falha recuperável; destruir instância e listeners ao sair. Nenhum acesso a serviços Wikimedia durante uma visita. Mapas precisam de alternativa textual, controles por teclado e gestos que preservem o scroll da página. Fronteiras só com fonte, recorte temporal e indicação de aproximação; cobertura regional e temporal e licenças dos dados e tiles conferidas separadamente do código.

IDs de painéis e SVG derivam do ID estável do bloco, para permitir reutilização. Seleção com controles nativos e `aria-pressed`; estados vazios textuais. Foco visível, retorno do diálogo, Escape e preferência de movimento reduzido são critérios de aceite. Não constitui auditoria WCAG integral.

## Checklist de adoção

- [ ] Necessidade observável e caso de uso com dados reais; verificar antes os componentes existentes e as APIs nativas.
- [ ] Compatibilidade com Angular 21, TypeScript strict, ESM e Node 24; evitar wrappers desnecessários.
- [ ] Documentação primária, manutenção, versão fixada pelo lockfile e caminho de remoção ou substituição.
- [ ] Licença do código e dos plugins; licenças de dados, mídia e tiles; avisos e atribuições mantidos.
- [ ] Custo recorrente de API, tiles, hospedagem e manutenção, incluindo limites gratuitos.
- [ ] Impacto no build: tamanho bruto e transferido; chunk inicial ou lazy; importar só os módulos usados.
- [ ] SSR, prerender e hidratação determinística; isolamento browser-only, cleanup e fallback quando necessário.
- [ ] Teclado, foco, leitores de tela, alternativa textual, contraste, toque, 320 px e movimento reduzido.
- [ ] Loading, erro e vazio; cliques rápidos; estabilidade de dimensões e scroll durante a seleção.
- [ ] Typecheck, lint, testes, build com prerender, E2E e links pertinentes; resultados e limitações reais registrados.

## Fontes técnicas

- [Angular: migração para animações CSS](https://angular.dev/guide/animations/migration), [entrada e saída](https://angular.dev/guide/animations) e [Angular Aria](https://angular.dev/guide/aria/overview).
- [D3: curvas de conexão](https://d3js.org/d3-shape/link) e [escalas lineares](https://d3js.org/d3-scale/linear).
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) e [plugin de datas do OpenHistoricalMap](https://github.com/OpenHistoricalMap/maplibre-gl-dates).
- [Licença padrão do GSAP](https://gsap.com/community/standard-license/): a ausência de cobrança não elimina as restrições, inclusive sobre ferramentas visuais que concorram com capacidades da Webflow. Nenhum GSAP foi adotado.

## Verificação desta adoção

Executado em 01/11/2026 com Node 24.13.0 e npm 11.6.2:

- `npm run typecheck`: passou.
- `npm test`: 21 arquivos, 107 testes passaram. Após reduzir a densidade das marcas do eixo, o teste de geometria foi repetido: 2 testes passaram.
- `npm run lint`: passou, incluindo 5 testes dos limites arquiteturais, Biome e Prettier. Ordenação do import novo corrigida antes da repetição.
- `npm run build`: passou, três rotas prerenderizadas. Bundle inicial: 337,16 kB brutos e 92,78 kB de transferência estimada. Chunk lazy da página de ideologia: 110,32 kB e 28,73 kB estimados. Incluem código e conteúdo existentes; não são medição isolada do acréscimo de D3.
- Aviso do build: 87 bytes acima do orçamento de 7 kB em `ideology-atlas.component.scss`, arquivo de alterações concorrentes do Liberalismo. Os estilos deste recorte não excedem o orçamento.
- `npm run test:e2e`: 13 testes passaram, incluindo teclado, toque, geometria do painel, fontes, ausência de overflow, axe existente e a nova verificação do SVG prerenderizado com eixo fixo entre filtros em 320 px. O seletor do teste novo foi corrigido para correspondência exata após falha por ambiguidade com a barra de progresso.
- `npm run check:links`: links internos de quatro HTMLs estáticos (três rotas públicas e o fallback).
- `npm audit --omit=dev`: nenhuma vulnerabilidade nas dependências de produção. A instalação completa reportou 34 vulnerabilidades moderadas; sem atualização automática das ferramentas de desenvolvimento.
- Capturas: `output/playwright/marxismo-timeline-320.png`, `marxismo-timeline-desktop.png` e `marxismo-grafo-desktop.png`. Ausência de erros de página verificada no cenário novo. Não medidos: CLS, leitores de tela reais, texto a 200% e falhas de rede neste recorte.
