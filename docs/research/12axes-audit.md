# Auditoria da referência 12axes

Data: 01/11/2026. Repositório público inspecionado no commit `e1c7adeb67c100f13fdbe16f226f5ca21c09801c`, confirmado por `git ls-remote` e checkout raso temporário. Este documento distingue observação de código, execução de navegador e recomendações para implementação independente no ATLAS.

## Limites e direitos

A [licença desse commit](https://github.com/RomanCypherpunk/12axes/blob/e1c7adeb67c100f13fdbe16f226f5ca21c09801c/LICENSE) declara o projeto proprietário, com direitos reservados: estar disponível publicamente não o torna código aberto. Ela restringe reprodução/reutilização de código, dados, textos, imagens e modelo, além de proibir clientes externos da API sem autorização. A investigação não transfere nenhum desses ativos para o produto ATLAS. As propostas abaixo tratam de técnicas gerais de engenharia e experiência; sua implementação deve ser independente, usando os contratos e registros próprios do ATLAS.

As páginas foram acessadas pelo navegador somente depois de instalar uma interceptação de rede que aborta qualquer requisição fora de `12axes.vercel.app` e qualquer caminho `/api/`. Os testes não enviaram respostas de quiz, não chamaram os comparadores remotos e não acessaram a API. CDN e analytics externos foram bloqueados. O fallback dos assets para a própria origem permitiu observar as teias mesmo com esse bloqueio.

## Matriz de funcionalidades e responsabilidades

| Área | Evidência no repositório 12axes | Achado verificável | Aplicação independente no ATLAS |
| --- | --- | --- | --- |
| Catálogos | `backend/src/main/resources/data/{ideologies,personalities,countries,parties,books}.json` | Metadados separados por categoria; perfis numéricos em arquivos próprios; referências como `countryId` e `personalityId` | Preservar IDs internos próprios e Zod; separar payloads por necessidade de leitura após medir tamanho e cache |
| Identificadores | Arquivos acima; `*-profiles.json` | Catálogos principais usam `id` textual também aproveitado em URLs; perfis usam chaves como `ideologyId`; livros não têm ID próprio nessa estrutura | Separar identidade estável de slug e título; obras precisam de identidade própria; reconciliação de IDs externos não deve depender do nome exibido |
| Páginas estáticas | `frontend/package.json`; `frontend/scripts/generate-pages.mjs` | Build executa TypeScript, Vite e gerador de páginas HTML por catálogo/entidade/idioma | Continuar usando Router + prerender Angular; não introduzir outro gerador HTML paralelo |
| Teia | `frontend/src/tree/TreePage.tsx`; `frontend/src/main.tsx` | Visão em canvas com busca, seleção, pan, zoom, pinch, painel de perfil, vizinhos e link para página específica | Compartilhar seleção/ficha com a leitura editorial; oferecer alternativa semântica em lista e interação por teclado |
| Layout antecipado | `frontend/scripts/tree-data.mjs`; `tree-layout.mjs` | Build calcula coordenadas determinísticas, arestas, graus e vizinhos, exportando um JSON por catálogo/idioma | Pré-calcular layouts a partir de relações explícitas do ATLAS; registrar versão do algoritmo e hash da entrada |
| Natureza das conexões | Mesmos scripts | Arestas resultam de similaridade entre perfis numéricos, com filtros e ancoragem no espectro político | Não apresentar proximidade numérica como influência histórica; similaridade analítica deve ter classificação, metodologia e limites próprios |
| Dados da teia | `frontend/src/tree/data.ts` | Fetch de snapshot estático; cache de dados e promessas em voo; fallback CDN→origem; prefetch de outros catálogos no tempo ocioso | HttpClient/TransferState e cache existente; cancelamento/erros explícitos; prefetch somente após medir impacto em redes móveis |
| Hipertexto | `frontend/src/components/GlossaryText.tsx`; `backend/.../GlossaryResolver.java`; `glossary.json` | Segmentos com offsets e definições; validação de sobreposição; mouse, foco, toque, Escape e fechamento externo | Reaproveitar o hipertexto e CDK Dialog já presentes no ATLAS; termos resolvem IDs do grafo, não texto solto sem proveniência |
| Navegação entre catálogos | `TreePage.tsx`; `scripts/site-header.mjs` | Links de catálogo e lista; troca entre teias usa History API e cache; página específica permanece disponível | Usar Angular Router e URLs reais, preservando o limite atual de três rotas; catálogos futuros entram por fase autorizada |
| Comparadores | `frontend/src/components/compare/{ComparePage,ComparePeoplePage,PairDetail}.tsx`; `services/quizApi.ts` | Seleção de 2–3 perfis; query serializa seleção; catálogo é carregado sob demanda; cálculo/resultados dependem também da API | Comparador histórico futuro deve usar atributos documentados e recortes temporais; pode ser estático e não exige backend permanente |
| Lazy loading | `frontend/src/main.tsx`; `App.tsx`; `i18n/index.ts` | Imports dinâmicos de teia, comparadores, resultados, exportação e dicionário de idioma | Preservar `loadComponent`; avaliar `@defer` para visualizações pesadas sem ocultar conteúdo editorial essencial no prerender |
| Internacionalização | `frontend/src/i18n/{index,pt,en}.ts`; gerador estático; `scripts/check_i18n.py` | Dicionários PT/EN, overlays por ID e fallback PT; verificador compara cobertura de catálogos/glossário | IDs independentes do idioma; tradução editorial deve ter estado de revisão; não adicionar i18n completo nesta fatia |
| Separação de responsabilidades | `frontend/scripts`, `src/tree`, `src/utils`, `backend/.../{model,service,controller}` | Geração, consumo de snapshots, renderização e serviços de quiz têm áreas distintas | Conservar fronteiras `core`/`shared`/features e scripts offline do ATLAS; não importar Spring, React nem persistência externa |
| Testes e CI | `.github/workflows/ci.yml`; `frontend/test`; `src/tree/layout.test.ts`; testes Java | CI tem jobs Maven/Java 21 e frontend Node 22; executa checagem i18n, testes e build estático | Manter ferramentas atuais Angular/Vitest/Playwright; testar contratos, referências, foco e retorno, não apenas algoritmos visuais |
| Licenciamento de mídia | Metadados `imageSource*`, `flagSource*`, `logoSource*`; README e LICENSE | Há campos de origem de mídia; isso, isoladamente, não demonstra direito de republicar cada arquivo | Preservar `MediaAsset`, licença individual, créditos e bloqueio de reprodução de ativos não autorizados |

Os caminhos acima são relativos ao [snapshot auditado](https://github.com/RomanCypherpunk/12axes/tree/e1c7adeb67c100f13fdbe16f226f5ca21c09801c). O README pode descrever um inventário anterior: para contagem e comportamento prevalecem os arquivos e a execução observados.

## Inventário observado

Contagem feita com parse JSON, sem importar registros para o ATLAS:

| Catálogo | Registros | Tamanho do arquivo bruto |
| --- | ---: | ---: |
| Ideologias | 274 | 182.706 bytes |
| Personalidades | 675 | 510.561 bytes |
| Países e regimes | 320 | 238.936 bytes |
| Partidos e organizações | 203 | 167.685 bytes |
| Livros | 334 | 78.496 bytes |
| Glossário | 83 | 18.960 bytes |

Não foram encontrados IDs duplicados nos quatro catálogos principais nem no glossário. Isso não é uma auditoria completa de integridade referencial. Os perfis usam chaves específicas de entidade; o catálogo de livros referencia o autor por `personalityId`. A separação de países atuais e regimes históricos por um booleano serve ao produto de referência, mas é insuficiente para a distinção temporal/documental pretendida pelo ATLAS.

## Teias: interpretação do mecanismo

O [pipeline de dados](https://github.com/RomanCypherpunk/12axes/blob/e1c7adeb67c100f13fdbe16f226f5ca21c09801c/frontend/scripts/tree-data.mjs) monta matrizes de compatibilidade, listas de vizinhos e snapshots por categoria/idioma. O [layout](https://github.com/RomanCypherpunk/12axes/blob/e1c7adeb67c100f13fdbe16f226f5ca21c09801c/frontend/scripts/tree-layout.mjs) é determinístico e executado no build. Coordenadas, arestas e grau chegam prontos ao navegador; a renderização não precisa repetir o posicionamento completo. Há custo quadrático em partes do processamento antecipado; mover trabalho para o build não elimina o custo nem garante escalabilidade irrestrita.

A ideia aproveitável é publicar geometria estável e cacheável, com dados versionados. O ATLAS deve obter arestas de suas relações tipadas e evidenciadas. Uma representação de influência, divergência ou associação precisa preservar direção, natureza e fonte. Uma eventual visualização de similaridade deve ser separada e explicada como analítica. Nenhum vínculo da Wikipedia ou ponto próximo na tela autoriza inferência causal.

## Funcionamento real observado

Foram feitas requisições HTTP somente ao HTML das cinco URLs e, separadamente, execução real com Chromium headless via `@playwright/test` já instalado no ATLAS. As cinco páginas retornaram HTTP 200. O HTML inicial das teias tem o título da Home; após JavaScript o título muda para a teia correspondente. Isso confirma a distinção entre as páginas de catálogo geradas e a visão alternativa em canvas. O código da teia define `noindex, follow`.

| Superfície/ação | Resultado observado |
| --- | --- |
| `/` | Home renderizada com apresentação do quiz, eixos e acesso aos catálogos; não foi iniciado o quiz |
| `/tree/parties` | Título de Partidos, um canvas e uma busca renderizados |
| `/tree/countries` | Título de Países, um canvas e uma busca renderizados |
| `/tree/personalities` | Título de Personalidades, um canvas e uma busca renderizados |
| `/tree/ideologies` | Título de Ideologias, um canvas e uma busca renderizados |
| Desktop 1440×1000 | Buscar termo, selecionar sugestão, abrir ficha e selecionar vizinho funcionaram; link de aprofundamento presente; Escape fechou o painel |
| Troca desktop + Voltar | Clique em Países mudou a URL sem navegação documental completa; Voltar restaurou URL da teia de Ideologias |
| Mobile com toque 390×844 | Busca, sugestão, ficha, vizinho e botão Fechar funcionaram; não houve overflow horizontal do documento |
| Proteção de rede | Bloqueio instalado antes de cada navegação; nenhuma requisição de API observada nos fluxos concluídos |

Os termos de busca e entidades utilizados serviram somente para acionar a interface de referência. Não foram reaproveitados textos, vetores ou descrições. Os comparadores e o hipertexto do quiz foram inspecionados no código; sua execução conectada não foi validada, pois exigiria ampliar o acesso de rede/API.

### Problemas e limites encontrados na referência

- No viewport 390×844, a navegação entre os quatro catálogos não aparece entre os links acessíveis: restam logo, idioma e início. Uma tentativa Playwright de clicar no link Países terminou em timeout. O ATLAS deve preservar uma navegação equivalente no mobile.
- A ficha móvel apresentou caixa `x=-9`, largura `390`, em viewport de largura `390`. Isso indica deslocamento de 9 px para fora da viewport, embora o documento não tenha overflow horizontal. A captura foi inspecionada: a borda esquerda da ficha está fora da área visível, mas os rótulos da lista de conexões continuam legíveis; não se constatou corte de texto específico nessa captura.
- O canvas tem um nome acessível, mas os nós não aparecem como controles individuais no DOM; a implementação precisa de busca/lista equivalente e não deve usar o canvas como único acesso ao conhecimento.
- Escape fecha a seleção; isso não demonstra navegação integral dos nós por teclado nem retorno de foco correto. Não foi feita auditoria WCAG completa da referência.
- O browser tool de pesquisa retornou 403/inacessível para as URLs. Essa limitação foi superada pela execução local do Chromium, sem remover o bloqueio de API. Uma tentativa do MCP Playwright falhou porque seu perfil estava em uso; os resultados acima vêm do pacote local, em contexto isolado.
- Não foram instaladas dependências, executados testes unitários, Maven ou build do 12axes. Existência dos testes e passos de CI foi verificada no código; resultados de execução de CI não foram atestados.

Capturas diagnósticas, fora do produto e sem uso como ativos editoriais:

- `C:/Users/Bellussi/AppData/Local/Temp/12axes-audit-live-desktop.png`: visão geral da teia.
- `C:/Users/Bellussi/AppData/Local/Temp/12axes-audit-live-1440.png`: ficha e conexões em desktop.
- `C:/Users/Bellussi/AppData/Local/Temp/12axes-audit-live-mobile-touch.png`: ficha em viewport móvel com toque.

As capturas temporárias não são persistência garantida do projeto. O registro verificável das ações e medidas está neste relatório; nenhum screenshot foi incorporado à aplicação.

## Decisões propostas ao ATLAS

1. Preservar sua base Angular, infraestrutura estática e grafo validado. O ganho imediato vem de completar o contrato de exploração contextual existente, mantendo proveniência e tipos de vínculo.
2. Publicar primeiro o ciclo hipertexto → ficha → relação explícita → outra ficha → retorno. Abrir catálogos, comparadores e grandes redes só depois da validação desse ciclo nas duas páginas editoriais.
3. Construir índices reversos, de busca e geometria em etapa reproduzível, com ordem estável, versão e checagem de referências; não adotar o modelo numérico proprietário da referência.
4. Compartilhar seleção e ficha entre os dois modos de produto, sem duplicar páginas Angular ou introduzir gerador HTML concorrente ao prerender.
5. Manter permalinks somente para páginas publicadas. Até a ampliação deliberada do roteamento, uma entidade sem página própria deve informar isso e continuar explorável em contexto.
6. Tratar acessibilidade e proveniência como parte do contrato: controles reais, histórico local previsível, Escape, foco restaurado, origem/direção do vínculo e evidência consultável; validar mobile com toque e teclado em vez de extrapolar do desktop.
