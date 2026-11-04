# Auditoria da referência 12axes

Data: 01/11/2026. Commit auditado: `e1c7adeb67c100f13fdbe16f226f5ca21c09801c` (confirmado por `git ls-remote` e checkout raso temporário). Distingue observação de código, execução de navegador e recomendações para implementação independente no ATLAS.

## Limites e direitos

A [licença do commit](https://github.com/RomanCypherpunk/12axes/blob/e1c7adeb67c100f13fdbe16f226f5ca21c09801c/LICENSE) declara o projeto proprietário, com direitos reservados: estar público não o torna código aberto. Restringe reprodução e reutilização de código, dados, textos, imagens e modelo, e proíbe clientes externos da API sem autorização. Nenhum ativo é transferido ao ATLAS. As propostas tratam de técnicas gerais de engenharia e experiência, com implementação independente e contratos próprios.

**Método de acesso:** navegador com interceptação que aborta qualquer requisição fora de `12axes.vercel.app` e qualquer `/api/`. Nenhuma resposta de quiz enviada, nenhum comparador remoto chamado, nenhum acesso à API. CDN e analytics bloqueados; o fallback de assets para a origem permitiu observar as teias.

## Matriz de funcionalidades

| Área | Evidência na referência | Achado | Aplicação independente no ATLAS |
|---|---|---|---|
| Catálogos | `backend/src/main/resources/data/{ideologies,personalities,countries,parties,books}.json` | Metadados por categoria; perfis numéricos em arquivos próprios; referências por `countryId` e `personalityId` | Preservar IDs próprios e Zod; separar payloads por necessidade de leitura após medir tamanho e cache |
| Identificadores | Arquivos acima; `*-profiles.json` | `id` textual usado em URLs; perfis com chaves como `ideologyId`; livros sem ID próprio | Separar identidade estável de slug e título; obras com identidade própria; reconciliação de IDs externos não depende do nome exibido |
| Páginas estáticas | `frontend/package.json`; `frontend/scripts/generate-pages.mjs` | Build com TypeScript, Vite e gerador de HTML por catálogo/entidade/idioma | Manter Router + prerender Angular; sem gerador HTML paralelo |
| Teia | `frontend/src/tree/TreePage.tsx`; `frontend/src/main.tsx` | Canvas com busca, seleção, pan, zoom, pinch, ficha, vizinhos e link para página | Compartilhar seleção e ficha com a leitura editorial; alternativa semântica em lista e teclado |
| Layout antecipado | `frontend/scripts/tree-data.mjs`; `tree-layout.mjs` | Coordenadas determinísticas, arestas, graus e vizinhos exportados por catálogo/idioma no build | Pré-calcular a partir de relações explícitas; registrar versão do algoritmo e hash da entrada |
| Natureza das conexões | Mesmos scripts | Arestas por similaridade entre perfis numéricos, com filtros e ancoragem no espectro político | Proximidade numérica nunca apresentada como influência histórica; similaridade analítica com classificação, método e limites próprios |
| Dados da teia | `frontend/src/tree/data.ts` | Fetch de snapshot; cache e promessas em voo; fallback CDN→origem; prefetch no tempo ocioso | HttpClient/TransferState existentes; cancelamento e erros explícitos; prefetch só após medir impacto em rede móvel |
| Hipertexto | `GlossaryText.tsx`; `GlossaryResolver.java`; `glossary.json` | Segmentos com offsets; validação de sobreposição; mouse, foco, toque, Escape, fechamento externo | Reaproveitar hipertexto e CDK Dialog do ATLAS; termos resolvem IDs do grafo, não texto solto sem proveniência |
| Navegação entre catálogos | `TreePage.tsx`; `scripts/site-header.mjs` | Links de catálogo; troca via History API e cache; página específica disponível | Angular Router e URLs reais, respeitando o limite atual de três rotas; novos catálogos por fase autorizada |
| Comparadores | `frontend/src/components/compare/{ComparePage,ComparePeoplePage,PairDetail}.tsx`; `services/quizApi.ts` | Seleção de 2–3 perfis serializada na query; catálogo sob demanda; resultados dependem também da API | Comparador histórico futuro com atributos documentados e recortes temporais; pode ser estático |
| Lazy loading | `main.tsx`; `App.tsx`; `i18n/index.ts` | Imports dinâmicos de teia, comparadores, resultados, exportação e dicionário | Preservar `loadComponent`; avaliar `@defer` em visualizações pesadas sem ocultar conteúdo essencial do prerender |
| Internacionalização | `frontend/src/i18n/{index,pt,en}.ts`; `scripts/check_i18n.py` | Dicionários PT/EN com overlays por ID e fallback PT; verificador de cobertura | IDs independentes do idioma; tradução com estado de revisão; sem i18n completo nesta fatia |
| Responsabilidades | `frontend/scripts`, `src/tree`, `src/utils`, `backend/.../{model,service,controller}` | Geração, snapshots, renderização e serviços de quiz em áreas distintas | Manter `core`/`shared`/features e scripts offline; sem Spring, React ou persistência externa |
| Testes e CI | `.github/workflows/ci.yml`; `frontend/test`; `src/tree/layout.test.ts`; testes Java | Jobs Maven/Java 21 e Node 22; checagem i18n, testes e build estático | Manter Angular/Vitest/Playwright; testar contratos, referências, foco e retorno, não só algoritmos visuais |
| Licenciamento de mídia | Metadados `imageSource*`, `flagSource*`, `logoSource*`; README; LICENSE | Campos de origem existem; isso não demonstra direito de republicar cada arquivo | Manter `MediaAsset`, licença individual, créditos e bloqueio de ativos não autorizados |

Caminhos relativos ao [snapshot auditado](https://github.com/RomanCypherpunk/12axes/tree/e1c7adeb67c100f13fdbe16f226f5ca21c09801c). O README pode descrever inventário anterior; prevalecem os arquivos e a execução observados.

## Inventário observado

Contagem por parse JSON, sem importar registros:

| Catálogo | Registros | Bytes brutos |
|---|--:|--:|
| Ideologias | 274 | 182.706 |
| Personalidades | 675 | 510.561 |
| Países e regimes | 320 | 238.936 |
| Partidos e organizações | 203 | 167.685 |
| Livros | 334 | 78.496 |
| Glossário | 83 | 18.960 |

Sem IDs duplicados nos quatro catálogos principais nem no glossário (não é auditoria completa de integridade referencial). O catálogo de livros referencia o autor por `personalityId`. Países atuais e regimes históricos separados por booleano servem ao produto de referência, mas são insuficientes para a distinção temporal e documental do ATLAS.

## Teias: mecanismo

O [pipeline](https://github.com/RomanCypherpunk/12axes/blob/e1c7adeb67c100f13fdbe16f226f5ca21c09801c/frontend/scripts/tree-data.mjs) monta matrizes de compatibilidade, vizinhos e snapshots por categoria/idioma. O [layout](https://github.com/RomanCypherpunk/12axes/blob/e1c7adeb67c100f13fdbe16f226f5ca21c09801c/frontend/scripts/tree-layout.mjs) é determinístico e roda no build; o navegador recebe coordenadas, arestas e grau prontos. Há custo quadrático no processamento antecipado; mover trabalho para o build não elimina o custo nem garante escala ilimitada.

Aproveitável: publicar geometria estável e cacheável, com dados versionados. Para o ATLAS, as arestas devem vir de relações tipadas e evidenciadas. Influência, divergência ou associação precisam de direção, natureza e fonte. Similaridade, se visualizada, é separada e explicada como analítica. Nenhum vínculo da Wikipedia nem proximidade na tela autoriza inferência causal.

## Funcionamento observado

HTTP ao HTML das cinco URLs e execução com Chromium headless via `@playwright/test` (já instalado no ATLAS). As cinco páginas retornaram 200. O HTML inicial das teias tem o título da Home; após JavaScript, muda para o da teia. Confirma a distinção entre páginas de catálogo geradas e a visão em canvas. A teia define `noindex, follow`.

| Superfície/ação | Resultado |
|---|---|
| `/` | Home com apresentação do quiz, eixos e acesso aos catálogos; quiz não iniciado |
| `/tree/parties`, `/tree/countries`, `/tree/personalities`, `/tree/ideologies` | Título correspondente, um canvas e uma busca |
| Desktop 1440×1000 | Busca, sugestão, ficha e vizinho funcionaram; link de aprofundamento presente; Escape fechou o painel |
| Troca + Voltar (desktop) | Clique em Países mudou a URL sem navegação documental completa; Voltar restaurou a teia de Ideologias |
| Mobile com toque 390×844 | Busca, sugestão, ficha, vizinho e Fechar funcionaram; sem overflow horizontal |
| Proteção de rede | Bloqueio antes de cada navegação; nenhuma requisição de API nos fluxos concluídos |

Termos e entidades usados só acionaram a interface; nenhum texto, vetor ou descrição foi reaproveitado. Comparadores e hipertexto do quiz foram inspecionados no código, sem execução conectada (exigiria ampliar acesso de rede e API).

### Problemas e limites da referência

- Em 390×844, a navegação entre os quatro catálogos não aparece entre os links acessíveis (restam logo, idioma e início); clicar em Países deu timeout. O ATLAS deve manter navegação equivalente no mobile.
- Ficha móvel com caixa em `x=-9` e largura 390 (deslocamento de 9 px, sem overflow do documento); os rótulos continuam legíveis.
- O canvas tem nome acessível, mas os nós não são controles individuais no DOM; é preciso busca ou lista equivalente, e o canvas não pode ser o único acesso.
- Escape fecha a seleção, mas não demonstra navegação integral por teclado nem retorno de foco. Sem auditoria WCAG completa.
- A ferramenta de pesquisa retornou 403 para as URLs; o Chromium local contornou isso sem remover o bloqueio de API. Uma tentativa com o MCP Playwright falhou por perfil em uso; os resultados acima vêm do pacote local, em contexto isolado.
- Não foram instalados dependências nem executados testes, Maven ou build da referência. A existência de testes e passos de CI foi verificada no código; a execução de CI não foi atestada.

Capturas diagnósticas (fora do produto, sem uso editorial), em `C:/Users/Bellussi/AppData/Local/Temp/`: `12axes-audit-live-desktop.png`, `12axes-audit-live-1440.png`, `12axes-audit-live-mobile-touch.png`. São temporárias e não são persistência do projeto; o registro verificável está neste relatório.

## Decisões propostas ao ATLAS

1. Preservar a base Angular, a infraestrutura estática e o grafo validado. O ganho vem de completar o contrato de exploração contextual, com proveniência e tipos de vínculo.
2. Publicar primeiro o ciclo hipertexto → ficha → relação explícita → outra ficha → retorno. Catálogos, comparadores e redes grandes só depois de validar esse ciclo nas páginas editoriais.
3. Construir índices reversos, de busca e de geometria em etapa reproduzível, com ordem estável, versão e checagem de referências. Não adotar o modelo numérico proprietário.
4. Compartilhar seleção e ficha entre os modos de produto, sem páginas Angular duplicadas nem gerador HTML concorrente ao prerender.
5. Permalinks só para páginas publicadas. Entidade sem página própria informa isso e continua explorável em contexto.
6. Acessibilidade e proveniência como contrato: controles reais, histórico local previsível, Escape, foco restaurado, origem e direção do vínculo, evidência consultável. Validar mobile com toque e teclado.

## Origem dos dados e cruzamentos (aprofundamento)

Leitura adicional do mesmo commit, para entender o método. Nada foi copiado; os números vêm de nomes e estruturas de arquivos.

### 1. Origem dos dados

- **Metadados** (nome, categoria, descrição curta, país e personalidade, religiões): escritos por quem mantém o projeto, com apoio de IA, em `ideologies.json`, `personalities.json`, `countries.json`, `parties.json` e `i18n/en/`. Descrições de cerca de 30 palavras, sem fonte por afirmação.
- **Vetores de 12 eixos** (o centro do método): não vêm de base alguma. Cada perfil é "auditado" por subagente de IA que responde às 240 perguntas do quiz mais as de arquétipo, após pesquisa sobre o perfil (`profile-audit/README.md`, `NEW_PROFILE.md`): lotes de 15, paralelismo, `validate.py`, respostas em `profile-audit/answers/` (~1.540 arquivos), progresso em `STATE.json`. O próprio documento admite que respostas copiadas entre perfis parecidos e modelos fracos geraram vetores ruins, e que duas sessões independentes geraram vetores diferentes para a mesma pessoa viva.
- **Imagens:** Wikimedia Commons, com `imageSourceName`, `imageSourceUrl` e `imageNote`.
- **Livros** (334): `personalityId`, `title`, `year` e `url` (link de loja com afiliado). Sem editora, edição ou ISBN.
- **Valores políticos** (`political-values.json`): categorias definidas pelo projeto, com perfil nos eixos.

Conclusão: a base não é histórica no sentido de citação por fato. Os vetores são estimativas de modelo calibrado, e o projeto assume isso no aviso metodológico.

### 2. Como um perfil vira vetor

Mesma fórmula do quiz: cada resposta vira 0 a 1 pelo polo esquerdo (`DT=0`, `D=0.25`, `N=0.5`, `C=0.75`, `CT=1`, invertido quando a concordância é do polo direito). Cada eixo é a média ponderada de suas perguntas; as alternativas de arquétipo entram como respostas extras. Implementação em `profile-audit/profile_vector.py`, espelhando `ScoringService.java`.

### 3. Cruzamentos com o resultado do usuário

- Um único escorador, `ProfileMatchScorer`, atende ideologias, personalidades, países e partidos, em três implementações sincronizadas: Java (backend), JavaScript (`frontend/scripts/profile-match.mjs`) e Python (`profile-audit/compatibility.py`).
- Pontuação em quatro partes: similaridade por eixo com penalidade para lados opostos (0,42); direção por cosseno aumentado perto do centro (0,33); intensidade (0,18); divergência máxima em um eixo (0,07).
- Cada catálogo é comparado isoladamente ao vetor do usuário; não há cruzamento entre catálogos durante o quiz.
- Percentis calculados contra o catálogo inteiro. Filtro de religião remove perfis do ranking sem mudar a nota.

### 4. Conexões entre perfis (a teia)

`tree-data.mjs`, no build:
- **Matriz de similaridade:** a mesma pontuação, média nos dois sentidos, zero se as religiões forem incompatíveis.
- **Vizinhos:** cada perfil liga-se aos 3 mais parecidos (`tree-layout.mjs`), união nos dois sentidos; a lista "similares" usa `SIMILAR_COUNT`.
- **Posição:** âncoras combinam o posto na bússola (economia, controle, poder, representação, estrutura) com o centro de uma região temática. Ideologias usam a categoria; os demais, o espectro mais próximo entre referências. Determinístico, gerado no build.

Uma conexão significa "vetores parecidos", não influência, origem ou relação histórica. O projeto não rotula como histórico, mas a interface mostra os nós como rede de relações.

### 5. Outras camadas

| Camada | Como funciona | Limite |
|---|---|---|
| Tensão entre eixos (`AxisTensionService`) | Compara a combinação do usuário com a correlação típica entre eixos no catálogo de ideologias; aparece se pender além de `MIN_LEAN` nos dois eixos | Depende da correlação do próprio catálogo |
| Divergência (`DisagreementService`) | Eixos em que o usuário mais se afasta da ideologia, personalidade e país mais compatíveis | Mesma base de vetores |
| Valores políticos (`PoliticalValuesService`) | Distância do usuário a perfis fixos por categoria | Categorias e perfis são escolhas do projeto |
| Livros (`BookRecommendationService`) | Livros das personalidades mais compatíveis, com link de afiliado | Sem edição nem fonte do livro |
| Referências entre catálogos | Partido tem `countryId`; ideologia tem `countryId` e `personalityId` escolhidos entre perfis existentes; livro tem `personalityId` | Ligações manuais de metadado, não cálculo |

### 6. O que isso significa para o ATLAS

- **Não adotar** a camada de vetores como dado histórico. O ATLAS exige fonte por afirmação e separa fato, interpretação, hipótese e controvérsia; doze números estimados por modelo não atendem a isso.
- **Separar** qualquer análise de posicionamento do acervo histórico, com rótulo de estimativa e método publicado.
- **Aproveitar as técnicas gerais:** validação que recusa sequências de respostas copiadas, avaliação isolada de cada perfil, filtro explícito por religião, layout determinístico no build.
- **Manter relações com tipo e proveniência**, como já faz em `relation-types.ts`. Similaridade analítica não vira influência documentada.

### 7. Observações sobre a referência

- O README cita "+230 ideologias, +170 países e regimes, +390 figuras". Os arquivos têm 271 ideologias, 321 países e regimes e 667 personalidades auditadas em `STATE.json`. Prevalecem os arquivos.
- A auditoria depende de subagentes de IA de alta qualidade: custo e reprodutibilidade limitados, e refazer um perfil pode gerar outro vetor, como o próprio documento registra.
- Descrições e vetores são protegidos por licença própria; o ATLAS não reaproveita nenhum dos dois.
