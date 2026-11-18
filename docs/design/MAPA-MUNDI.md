# Mapa-múndi histórico e geopolítico (`/mapa`)

- **Status:** plano (especificação de produto, dados e interface)
- **Última verificação:** 18/11/2026
- **Escopo:** proposta documentada para abertura de issue e validação de arquitetura antes de implementação

## 1. Objetivo e pergunta editorial

O ATLAS já organiza entidades em catálogos (`/acervo`), relações em rede topológica (`/grafos`), sínteses narrativas (`/leituras`) e percursos guiados (`/itinerarios`). Falta uma leitura **territorial e sincrônica**: responder visualmente *onde* os acontecimentos e relações ocorrem e *o que estava acontecendo simultaneamente em diferentes países num mesmo período histórico*.

A página `/mapa` permitirá ao leitor:

1. Explorar um mapa-múndi editorial com **conexões geopolíticas, econômicas, intelectuais e de conflito** traçadas entre países, cidades e lugares documentados.
2. Deslizar uma **linha do tempo histórica** (ou escolher marcos curados) para observar o estado documentado de cada região em determinado recorte temporal.
3. Clicar em um país ou conexão para abrir uma **mesa de estudo contextual** com governos/regimes vigentes (`regimeProfile`), acontecimentos simultâneos, pessoas, obras e atalhos para `/verbete/:slug`, `/grafos` e `/leituras`.

> [!IMPORTANT]
> **Rigor e honestidade histórica:** o mapa não deve inventar fronteiras anacrônicas como se fossem eternas, nem preencher lacunas de dados com suposições. Fronteiras contemporâneas de referência devem vir claramente rotuladas quando usadas como base de leitura para períodos anteriores, e itens sem `temporalExtent` verificada não entram na filtragem cronológica estrita sem aviso editorial.

---

## 2. Direção visual (`atlas-editorial-geometrico`)

A interface segue integralmente os padrões aprovados em `atlas-editorial-geometrico`:

- **Superfície de papel e tinta:** papel claro `#FBF8F1`, tinta grafite `#141211`, pautas suíças sutis, zero fundo escuro de monitoramento, zero aparência de painel de métricas ou cards repetitivos.
- **Referência cartográfica:** atlas histórico editorial e modernismo suíço — traço fino em tinta sobre papel creme, projeção global equilibrada (**Natural Earth** ou **Robinson** em SVG vetorial estático, sem dependência de servidores de tiles externos), massas continentais em tom neutro quente e realce cromático apenas no país em foco e nas famílias de conexão.
- **Composição da tela:**
  1. **Barra superior compacta:** título editorial discreto, busca por país/acontecimento/conexão, seletor de projeção/recorte, filtro por recorte temporal e botão **"Surpreenda-me"** (sorteia um par país + período rico em evidências).
  2. **Legenda na lateral esquerda:** famílias relacionais (cor + padrão de traço `stroke-dasharray` + efeito de hover que ilumina a família no mapa e atenua o restante) e camadas geográficas (países, cidades, locais, acontecimentos georreferenciados).
  3. **Prancha do mapa central:** zoom e pan fluidos (mouse, toque e teclado `+`/`-`/`0`), rótulos protegidos contra colisão com os painéis laterais e linha do tempo inferior.
  4. **Linha do tempo inferior:** faixa cronológica com ajuste de intervalo/ano e marcadores de densidade do acervo, permitindo comparar sincronias ("o que acontecia no mundo entre 1929 e 1945").
  5. **Mesa de estudo à direita (ou gaveta no mobile):** ficha do país/conexão no período ativo — regime/organização política documentada, acontecimentos simultâneos, relações de entrada/saída, fontes e botões para abrir `/verbete/:slug` ou inspecionar a vizinhança no `/grafos`.

---

## 3. Modelo de dados e geolocalização

O contrato atual em `src/app/core/content/models/content-schema.ts` já possui a base necessária (`placeSchema`, `countryProfileSchema`, `regimeProfileSchema`, `temporalExtentSchema`, `relationSchema`, `evidenceSchema`). As extensões propostas são aditivas e compatíveis com o build no R2:

### 3.1 Extensões no grafo de conhecimento

1. **Coordenadas e códigos geográficos em `place` / `countryProfile`:**
   - `coordinates?: { lat: number; lon: number }` (centroide institucional/geográfico ou coordenada verificada da cidade/local; nunca gerada sem fonte).
   - `isoAlpha2?: string` e `isoNumeric?: string` para vínculo determinístico com a geometria do mapa-múndi (evitando casamento frágil por nome em português/inglês).
2. **Ancoragem espacial explícita em acontecimentos, pessoas e obras:**
   - Aproveitar relações existentes (`born_in`, `located_in`, `occurred_in`, `originated_in`, `governs`, `participates_in`, `allied_with`, `opposes`) para projetar entidades ligadas ao país ou cidade correspondente.
   - Avaliar campo opcional `spatialRefs?: string[]` (IDs de entidades `place`) apenas quando o vínculo espacial primário precisar de desambiguação direta.
3. **Recorte temporal (`temporalExtent`) nas relações e regimes:**
   - Expor `startYear`, `endYear`, `precision` e `dateNote` na camada compilada de índice espacial gerado em `scripts/content/build-content.mjs` (`map-index.json` ou equivalente imutável no release do R2).
   - Regimes vinculados via `regimeProfile` permitem mostrar o enquadramento político atribuído de cada país em cada intervalo de tempo, preservando atribuição editorial e limites.

### 3.2 Base cartográfica estática e licenciamento

- Utilizar geometria **Natural Earth (110m / 50m, Domínio Público)** convertida para TopoJSON otimizado dentro de `public/` ou do pacote de conteúdo no R2, garantindo funcionamento offline/estático no Cloudflare Pages sem chamadas a APIs terceiras em runtime.
- Registrar a fonte Natural Earth e seu status de domínio público na área de atribuição editorial da própria página (`/mapa`), seguindo `docs/design/GUIA-DE-VOZ.md`.

---

## 4. Conexões geográficas e acessibilidade para daltônicos

As conexões entre territórios no mapa devem seguir as mesmas garantias visuais e acessíveis do `/grafos`:

- **Arcos geodésicos sem ambiguidade visual:**
  - Cada uma das famílias relacionais mantém **cor distinta + padrão de traço SVG `stroke-dasharray` exclusivo** + marcador direcional quando houver origem/destino assimétrico.
  - **Hover / foco na legenda esquerda:** passar o cursor ou focar qualquer família ou categoria ilumina imediatamente as linhas e países correspondentes (`opacity: 1`, espessura reforçada) e atenua o restante do mapa, sem depender exclusivamente da percepção de matiz.
- **Alternativa tabular e navegação por teclado:**
  - Toda informação visualizada em arcos e polígonos deve possuir representação navegável por teclado e leitores de tela:
    - Lista de países filtrada pelo período atual (`aria-label` com contagem de eventos/conexões).
    - Painel tabular "Conexões e eventos neste período" acessível via teclado (`Tab` / `Enter` / setas na linha do tempo).
- **Movimento reduzido:** respeitar `@media (prefers-reduced-motion: reduce)` desligando animações de trajetória/zoom contínuo.

---

## 5. Integração com o ecossistema ATLAS

| Destino | Integração prevista |
|---|---|
| `/acervo/paises` e `/acervo/regimes` | Botão "Ver no mapa" abre `/mapa?pais=<slug>` focado no território. |
| `/verbete/:slug` | Pessoas, países, acontecimentos e obras georreferenciados linkam para `/mapa?entidade=<slug>&ano=<ano>`. |
| `/grafos` | Seleção de um nó no mapa oferece atalho "Abrir rede no grafo" (`/grafos?no=<id>`); caminho inverso disponível em nós geográficos. |
| `/leituras` e `/itinerarios` | Leituras e paradas de itinerário podem sugerir recortes espaciais (`/mapa?periodo=...`). |
| Arquitetura feature-first | Nova feature isolada em `src/app/features/world-map/` respeitando `architecture/boundaries` (ESLint) e consumindo `ContentRepository` / consultas puras em `core/content/queries/`. |

---

## 6. Fases sugeridas de entrega

- **Fase 0 — Contrato e cobertura de dados:** validar via script quantos países (`countryProfile`), cidades (`place`) e relações já possuem `coordinates` / código ISO e `temporalExtent`; definir cobertura mínima honesta e metadados faltantes em `content/knowledge/`.
- **Fase 1 — Base cartográfica + `core/content`:** incorporar TopoJSON Natural Earth (domínio público), estender `content-schema.ts` de forma retrocompatível e gerar projeção/índice espacial no `build-content.mjs`.
- **Fase 2 — Prancha interativa `/mapa`:** componente `WorldMapComponent` com projeção SVG (`d3-geo` ou projeção pura em TypeScript sem overhead desnecessário), zoom/pan, legenda à esquerda com hover e `stroke-dasharray` distinto, e proteção de rótulos contra sobreposição aos painéis.
- **Fase 3 — Linha do tempo e Mesa de Estudo:** barra cronológica interativa ("o que acontecia em cada país no período X"), exibição de `regimeProfile`, acontecimentos e conexões com fontes e atalhos para `/verbete/:slug` e `/grafos`.
- **Fase 4 — Testes e E2E:** testes unitários das consultas geográficas/temporais, verificação de acessibilidade por teclado, `prerender` de `/mapa`, `npm run lint` (`architecture/boundaries`) e suíte Playwright E2E (desktop + mobile).

---

## 7. Critérios de aceite

- [ ] A rota `/mapa` é estática/prerenderizada e carrega sem dependências externas em runtime.
- [ ] Todos os países/lugares plotados têm coordenadas e códigos derivados de fontes verificadas e atribuição cartográfica visível (Natural Earth, domínio público).
- [ ] A linha do tempo filtra acontecimentos, regimes e conexões usando apenas `temporalExtent` documentadas, indicando explicitamente o que não possui datação estrita.
- [ ] Cada família de conexão possui padrão de traço exclusivo e efeito de destaque ao passar o mouse / focar a legenda esquerda.
- [ ] Rótulos e seleções no mapa nunca ficam cobertos pela legenda esquerda, linha do tempo ou painel de detalhes.
- [ ] A página integra botão **"Surpreenda-me"** coerente com `/leituras`, `/itinerarios`, `/acervo` e `/grafos`.
- [ ] Navegação completa por teclado (linha do tempo, busca, seleção de país e lista alternativa acessível) e compatibilidade com `prefers-reduced-motion`.
