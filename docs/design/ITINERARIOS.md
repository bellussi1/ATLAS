# Itinerários editoriais: plano

Status: **planejamento aprovado, implementação não iniciada**. Este documento fixa o produto, o contrato conceitual e a ordem das fases. Nenhuma rota, schema ou componente foi criado. Cada fase exige aprovação e commit próprios.

Data: 07/11/2026.

## 1. Decisão de produto

Um itinerário é uma **sequência editorial de paradas** ligadas por uma pergunta. A espinha é a entrada padrão, mas cada parada pode abrir **ramos explícitos** e **convergências**. O itinerário não é uma trilha linear obrigatória, nem um grafo livre.

Ele existe para responder a uma pergunta que atravessa conteúdos já publicados. Não substitui a leitura contínua, o verbete nem `/grafos`: organiza uma entrada para eles.

### O que ele não é

- Não é uma leitura contínua nova. Não exige capítulos próprios, mas exige **contexto editorial publicado** em cada parada.
- Não é um hub dominante. Aparece na home, nas leituras e nos verbetes como convite; o índice `/itinerarios` é um catálogo, não a nova página principal.
- Não é um grafo livre. Os ramos são declarados e justificados; não há pan, zoom ou exploração arbitrária.
- Não é uma trilha de exercícios. Não há feature de estudo ativa; o itinerário não a reativa.
- Não é um painel de progresso. Não há checkbox, percentual, sequência bloqueada ou dashboard na v1. Se houver uma marca no futuro, ela será local e opcional, depois de o percurso estar validado.

## 2. Tipos de itinerário

Um único renderer atende aos quatro tipos. O campo `kind` muda a pergunta editorial, os critérios de seleção e o texto de abertura, não a árvore de componentes.

| `kind`         | Pergunta editorial                                                              | Exemplo de recorte                                      |
| -------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `historico`    | Como um processo se desenrola, muda de escala e produz rupturas?                | Era Vargas, 1930–1954                                    |
| `comparativo`  | Como tradições diferentes respondem ao mesmo problema?                          | Liberalismo e socialismo: liberdade, propriedade e Estado |
| `conceitual`   | Como um conceito muda de sentido quando atravessa autores, obras e instituições? | Liberdade, cidadania, soberania                          |
| `institucional`| Como uma instituição funciona, se legitima e se transforma?                     | Estado Novo, CLT, regime militar                         |

O `kind` é um identificador estável, sem acento; o rótulo visível é traduzido na interface. O schema não cria quatro páginas nem quatro componentes.

## 3. Modelo editorial

### 3.1 Paradas centrais

O itinerário tem no mínimo **4 paradas centrais**. Cada parada declara:

- **título** curto, que nomeia o passo;
- **razão**: por que esta parada vem aqui, e não em outro lugar;
- **pergunta**: o que o leitor deve responder ao sair dela;
- **destino**: leitura, verbete, grafo, catálogo ou roteiro de leitura publicado;
- **contexto**: entidade ou trecho que abre a ficha contextual existente, quando houver.

O número máximo não fica no schema. É uma decisão editorial: um itinerário que precisa de dez paradas provavelmente são dois itinerários. O `itinerary:check` pode avisar acima de nove paradas e acima de três ramos, mas não reprova por si só.

### 3.2 Ramos

Um ramo é uma **alternativa declarada**, não uma bifurcação aleatória. Cada ramo declara:

- a parada de origem (`fromStop`);
- título, razão e pergunta;
- um destino publicado;
- **convergência** para uma parada posterior ou uma **saída explícita** (por que o ramo termina ali).

Na v1, cada ramo leva a **uma** parada alternativa. Se a alternativa precisa de uma sequência própria, ela vira outro itinerário. Isso mantém o modelo explícito e evita um grafo disfarçado.

### 3.3 Convergências e repetições

- Um ramo pode voltar para uma parada posterior; o retorno é visível no texto e no desenho.
- Nenhum destino pode se repetir sem uma justificativa editorial. A justificativa é um campo do conteúdo, não uma nota de rodapé.
- O percurso não pode formar ciclo. O schema rejeita `convergesAt` para a própria parada ou para uma parada anterior.
- Ramo sem convergência e sem saída explícita é inválido.

### 3.4 Gate qualitativo

Antes de publicar, o itinerário precisa cumprir:

1. pelo menos **4 paradas centrais**;
2. **razão e pergunta** em cada parada;
3. pelo menos **dois tipos de conteúdo** entre os destinos (leitura, verbete, grafo, catálogo, roteiro);
4. nenhum destino repetido sem justificativa;
5. todos os destinos **publicados e verificados** no release;
6. revisão humana registrada quando o estado for `verified`.

O gate é editorial. O schema valida o que é objetivo; o `itinerary:check` valida referências e cobertura; a revisão humana decide o que é suficiente.

## 4. Contrato conceitual

Proposta para `src/app/features/itineraries/models/itinerary.schema.ts`. O código abaixo é um esboço de contrato, não uma implementação.

```ts
type ItineraryKind = 'historico' | 'comparativo' | 'conceitual' | 'institucional';
type EditorialStatus = 'draft' | 'pending' | 'verified';
type Coverage = 'complete' | 'partial' | 'pending';

type Destination =
  | { type: 'leitura'; slug: string; anchor?: string }
  | { type: 'verbete'; slug: string; anchor?: string }
  | { type: 'grafo'; nodeId?: string }
  | { type: 'catalogo'; path: string; query?: string }
  | { type: 'roteiro'; slug: string };

type Stop = {
  id: string;
  title: string;
  reason: string;
  question: string;
  destination: Destination;
  contextEntityId?: string;
  sourceIds?: string[];
  coverage?: Coverage;
  gap?: string;
};

type Branch = {
  id: string;
  fromStop: string;
  title: string;
  reason: string;
  question: string;
  destination: Destination;
  convergesAt?: string;
  exit?: string;
};

type Itinerary = {
  schemaVersion: 1;
  id: string; // itinerary-<slug>
  slug: string;
  kind: ItineraryKind;
  title: string;
  question: string;
  deck: string;
  summary: string;
  status: EditorialStatus;
  coverage: Coverage;
  coverageNote?: string;
  review: {
    status: 'assistant' | 'human';
    reviewer?: string;
    reviewedAt?: string;
    notes?: string;
  };
  stops: Stop[]; // mínimo 4
  branches: Branch[];
  connections: Array<{ destination: Destination; reason: string }>; // até 3
  sources: Array<{ id: string; title: string; url?: string }>;
  updatedAt: string;
  version: string;
};
```

### 4.1 Regras de validação

O schema e o `itinerary:check` rejeitam:

- destino que não existe no grafo, nas leituras publicadas ou no catálogo;
- destino em rascunho ou capítulo `pending` em itinerário público;
- `status: 'verified'` sem `review.status: 'human'`, revisor e data;
- ramo sem convergência e sem saída explícita;
- `convergesAt` para a própria parada ou para uma parada anterior;
- ciclo entre paradas e ramos;
- destino repetido sem `justification`;
- parada sem razão ou sem pergunta;
- itinerário com menos de quatro paradas centrais;
- `coverage` diferente de `complete` sem `coverageNote`.

O schema **não** fixa o número máximo de paradas. O limite é editorial.

### 4.2 Estados editoriais

| Estado     | Significado                                                       | Build público |
| ---------- | ----------------------------------------------------------------- | ------------- |
| `draft`    | Estrutura em escrita; pode apontar para conteúdo em rascunho.      | Não           |
| `pending`  | Estrutura revisada por IA ou por editor, ainda sem revisão humana. | Não           |
| `verified` | Revisão humana registrada, destinos publicados e fontes conferidas. | Sim           |

`review.status: 'assistant'` nunca vira `verified`. O selo de IA, quando existir, é explícito e não usa a palavra "verificado". A decisão sobre publicar `pending` com selo de IA fica para depois do piloto (ver seção 11).

## 5. Publicação e release

O itinerário não cria um segundo sistema de publicação. Ele entra no release de conteúdo existente.

### 5.1 Fonte

- `content/itineraries/<slug>.json`: um arquivo por itinerário.
- `content/itineraries/examples/`: fixtures não publicadas, fora do build público.
- O índice não é escrito à mão: o build o gera a partir dos arquivos válidos.

### 5.2 Artefatos

O build gera:

- `itinerary-index.<sha256>.json`: lista pequena com slug, título, `kind`, estado, cobertura e o recurso de cada itinerário;
- `itinerary-<slug>.<sha256>.json`: um artefato por itinerário.

Os dois entram no `contentManifestSchema` como campos opcionais:

```ts
itineraries: z.array(resourceSchema.extend({ slug: id })).default([]);
itineraryIndex: resourceSchema.nullable().default(null);
```

O `contentPointerSchema` não muda: os artefatos continuam em `c/<sha256>.json`, e o release cobre os novos objetos pelo hash. Um release antigo, sem esses campos, continua válido; a aplicação trata a ausência como catálogo vazio.

### 5.3 Leitura no app

`ItineraryRepository`:

1. lê o `pointer.json` e o manifesto fixado;
2. lê o `itinerary-index` e, por slug, o artefato correspondente;
3. valida com Zod e verifica tamanho e SHA-256;
4. usa `TransferState` no SSR para não repetir a requisição na hidratação;
5. devolve `null` para slug desconhecido, sem cair no índice.

O repositório não consulta as leituras inteiras: os destinos já são URLs e IDs; a validação de existência acontece no build, contra o grafo e o registro de leituras.

### 5.4 Publicação

`npm run content:publish` continua manual e continua sendo decisão humana. O build verifica; a publicação publica o release inteiro. Não existe publicação automática de itinerário nem upload separado fora do release.

## 6. Rotas e experiência

### 6.1 Rotas

- `/itinerarios`: índice público com os itinerários `verified`. Estados vazios e de cobertura são explícitos.
- `/itinerario/:slug`: detalhe. Slugs `verified` são prerenderizados; slug desconhecido responde 404, sem fallback para o índice.
- `/itinerarios` e `/itinerario/:slug` entram no canonical e no sitemap quando publicados.

Camadas previstas: `features/itineraries/models` para o contrato, `services` para o `ItineraryRepository`, `pages` para índice e detalhe e `routes` para a composição lazy. `core/content` só recebe o que for global (manifesto e ponteiro), sem importar componentes.

### 6.2 Estrutura do detalhe

1. **Abertura:** título, `kind`, pergunta, resumo, selo editorial e aviso de cobertura.
2. **Como ler:** duas ou três linhas sobre a espinha e os ramos; sem tutorial longo.
3. **Espinha:** paradas numeradas, com razão, pergunta, prévia contextual e link para o destino.
4. **Ramos:** ligados à parada de origem, com rótulo textual e indicação de retorno ou saída.
5. **Continuar:** até três conexões curadas, com razão; não repetir destinos das paradas.
6. **Fontes e estado editorial:** bloco próprio, sem contaminar a prosa.

### 6.3 Prévia contextual

A prévia reutiliza `KnowledgeContextDirective` e a ficha existente em `shared/ui/knowledge-context`. Clicar em uma entidade da parada abre a ficha com fontes, relações e contexto, em vez de navegar às cegas. O link "Abrir" leva ao destino completo. Foco, Escape, retorno de foco e leitor de tela seguem o contrato já usado nas leituras.

Quando a parada não tiver entidade, a prévia é um cartão curto com a razão e a pergunta; não se inventa ficha.

### 6.4 Minimapa de dependências

A inspiração no `roadmap.sh` fica restrita a um **minimapa secundário e opcional** do percurso: paradas, ramos e convergências. Ele não é a tela principal, não duplica `/grafos`, não tem pan/zoom livre e não vira um grafo de conhecimento. A espinha editorial continua sendo o produto.

### 6.5 Acessibilidade e responsividade

- Teclado: todas as paradas, ramos e prévias alcançáveis; foco visível; `aria-current` na parada em leitura.
- 320 e 390 px: ramos empilhados com rótulo textual; sem rolagem horizontal; sem perda de hierarquia.
- `prefers-reduced-motion`: sem animação de entrada; transições de altura e opacidade respeitam a preferência.
- Sem dependência de cor para distinguir ramo, convergência ou estado editorial.
- Sem checkbox, percentual ou barra de progresso.

### 6.6 Entradas

O itinerário aparece como convite:

- na home, em uma linha ou card entre as leituras;
- no fim de uma leitura, quando ela participa do percurso;
- no verbete, quando a entidade é parada ou contexto;
- no índice `/itinerarios`, que reúne os percursos.

O header só ganha "Itinerários" depois do piloto, se o uso justificar. O índice não nasce como hub dominante.

## 7. Cobertura editorial

O aviso de cobertura é parte do produto, não um detalhe de rodapé.

- `coverage: 'complete'`: todos os destinos centrais publicados e verificados.
- `coverage: 'partial'`: há destino publicado, mas algum capítulo ou ramo está incompleto; exige `coverageNote`.
- `coverage: 'pending'`: falta conteúdo central; não publica como `verified`.

Exemplo: um itinerário de Era Vargas que dependa de Trabalhismo em rascunho e de um recorte vazio do grafo não pode ser `verified`. Ele fica em `draft`/`pending` e mostra a cobertura em teste local. A lista de verbetes não é um itinerário.

## 8. Pilotos

### 8.1 Primeiro piloto: comparativo

Título: **Liberalismo e socialismo: liberdade, propriedade e Estado**.

- 6 paradas centrais e 2 ramos.
- Usa as quatro leituras já publicadas (Liberalismo, Marxismo, Social-democracia e Anarquismo) e verbetes/conceitos publicados.
- Cada parada tem razão e pergunta; cada ramo tem retorno ou saída.
- Todos os destinos precisam estar publicados; a revisão humana é registrada antes do build público.

Mapa editorial proposto, ainda sem prosa final:

1. O problema: quem define liberdade, e para quem? — conceito ou abertura comparativa.
2. Liberalismo: liberdade, propriedade e limites do Estado — leitura Liberalismo.
3. Socialismo: trabalho, propriedade e emancipação — leitura Marxismo, com a distinção entre socialismo e social-democracia.
4. Social-democracia: mercado, proteção e compromisso — leitura Social-democracia.
5. Anarquismo: o Estado como problema — leitura Anarquismo.
6. Convergência: o que cada tradição chama de liberdade — grafo ou conceito comparativo.

Ramos propostos:

- século XIX: origens liberais e socialistas;
- Estado de bem-estar: a experiência social-democrata.

O piloto comparativo vem primeiro porque não depende de conteúdo novo e testa o contrato, a prévia contextual e o gate de cobertura com o acervo existente.

### 8.2 Segundo piloto: histórico

Título: **Era Vargas, 1930–1954**.

- 7 paradas centrais e 3 ramos.
- Só começa depois de **Trabalhismo** publicado e da leitura **Era Vargas** criada.
- Enquanto Trabalhismo estiver em rascunho ou o grafo específico estiver vazio, o itinerário fica em `draft`/`pending`, com aviso de cobertura. Não vira lista de verbetes.

Mapa editorial proposto:

1. 1930: ruptura, coalizões e nova ordem.
2. Governo Provisório e Constituição de 1934.
3. Estado Novo: centralização, repressão e legitimidade.
4. CLT e trabalhismo: direitos, tutela e disputa.
5. Industrialização e intervenção estatal.
6. 1945: redemocratização e retorno.
7. 1951–1954: segundo governo e crise.

Ramos: trabalhismo, Golpe de 1964 e Ditadura militar, ou economia e industrialização, conforme as leituras publicadas na fase 4. Nenhum ramo pode apontar para rascunho.

## 9. Fases

| Fase | Entrega                                                                 | Porta de saída                                                                 | Não fazer                                      |
| ---- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| 0    | `docs/design/ITINERARIOS.md`, schema Zod, fixtures e testes de validação | Rejeita destino inexistente, rascunho em ramo público e `verified` sem revisor; aceita o fixture comparativo | Não criar rota, componente ou conteúdo final   |
| 1    | Build gera índice e um artefato por itinerário; manifesto opcional; `ItineraryRepository` | Build antigo continua válido; release novo publica e o app lê; hash e 404 conferidos | Não publicar conteúdo; não criar segundo sistema de release |
| 2    | `/itinerarios`, `/itinerario/:slug`, prerender dos verificados, 404 para desconhecido | Teclado, 320/390, reduced motion, SEO/canonical, sem overflow                   | Não criar hub dominante; não reativar a antiga demonstração de estudo |
| 3    | Piloto comparativo, 6 paradas + 2 ramos                                  | Todas as paradas publicadas; razão/pergunta em cada; revisão humana registrada | Não começar Era Vargas; não inventar prosa histórica |
| 4    | Piloto histórico Era Vargas, 7 paradas + 3 ramos                         | Só depois de Trabalhismo publicado e leitura Era Vargas criada; cobertura limpa | Não publicar com rascunho em ramo              |
| 5    | `itinerary:check` no CI, mais 2–3 percursos, links na home/leituras/verbetes | Cobertura e links verificados automaticamente                                  | Não transformar o índice em dashboard          |

### Fase 0: contrato e documentação

Arquivos previstos:

- `docs/design/ITINERARIOS.md` (este documento);
- `src/app/features/itineraries/models/itinerary.schema.ts`;
- fixtures em `content/itineraries/examples/`;
- testes de schema em `itinerary.schema.spec.ts`.

Aceite: os testes falham para destino inexistente, ramo que aponta para rascunho em build público e `verified` sem revisor; o fixture comparativo passa.

### Fase 1: pipeline

O build lê `content/itineraries/*.json`, valida contra o grafo e as leituras publicadas, gera o índice e os artefatos e os inclui no manifesto. O `ContentRepository` e o `ItineraryRepository` compartilham cache, hash e `TransferState`.

Aceite: um release antigo, sem `itineraries`, continua renderizando o site; um release novo é lido; um artefato adulterado é rejeitado; um slug desconhecido não cai no índice.

### Fase 2: índice e detalhe

A rota `/itinerarios` mostra os verificados e um estado vazio honesto. `/itinerario/:slug` prerenderiza os verificados e responde 404 para o resto.

Aceite: navegação por teclado, 320/390 px, `prefers-reduced-motion`, canonical, sitemap, sem overflow, prévia contextual abrindo e devolvendo o foco.

### Fase 3: piloto comparativo

Aceite: 6 paradas e 2 ramos; todos os destinos publicados; razão e pergunta em cada parada; pelo menos dois tipos de conteúdo; revisão humana registrada; aviso de cobertura quando houver.

### Fase 4: piloto histórico

Aceite: Trabalhismo publicado e leitura Era Vargas criada; 7 paradas e 3 ramos; nenhum rascunho em ramo; cobertura `complete` ou `partial` justificada; revisão humana.

### Fase 5: escala

Aceite: `itinerary:check` no `verify` do CI; 2–3 percursos adicionais; links na home, nas leituras e nos verbetes; cobertura e links verificados automaticamente.

## 10. Testes e CI

- **Schema:** destino inexistente, rascunho em itinerário público, `verified` sem revisor, ramo sem convergência/saída, ciclo, destino repetido sem justificativa, menos de quatro paradas.
- **Build:** release antigo sem itinerários, release novo com índice e artefatos, hash/tamanho, slug desconhecido, prerender só de verificados.
- **Componente:** paradas, ramos, convergência, prévia contextual, foco, estado vazio e aviso de cobertura.
- **E2E:** teclado, 320/390, reduced motion, canonical, sitemap, 404, ausência de progresso.
- **CI:** `itinerary:check` no job `verify`; `content:publish` continua fora do CI.

## 11. Decisões confirmadas

- O primeiro piloto é o **comparativo**; Era Vargas fica para a fase 4.
- O modelo de publicação é **índice + um artefato por itinerário no release**, não um JSON único.
- O build público aceita apenas `verified` com revisão humana; `draft` fica em teste local.
- A antiga demonstração de estudo foi removida; o itinerário não a reativa.
- Progresso fica fora da v1.

## 12. Decisão pendente

**Revisão por IA no build público.** A recomendação é **não** nesta v1:

- `verified` continua exigindo revisor humano identificado;
- `pending` com `review.status: 'assistant'` pode existir em preview local, com selo explícito de IA;
- depois do piloto comparativo, decidir se um estado público `reviewed-ai` (nunca chamado de "verificado") passa a ser permitido.

Se a decisão for permitir, o selo precisa ser visível na abertura e no índice, e o `itinerary:check` deve distinguir `verified` de `reviewed-ai`. Não se deve usar a mesma palavra para os dois.

## 13. Fora de escopo

- Checkbox, percentual, dashboard, sequência bloqueada ou progresso salvo.
- Grafo livre, pan/zoom, exploração arbitrária ou duplicação de `/grafos`.
- Nova leitura contínua por itinerário.
- Quatro componentes por `kind`.
- Reativação da antiga demonstração de estudo.
- Publicação automática de conteúdo ou de itinerário.
- Promessa de cobertura futura: o que não está publicado aparece como lacuna.

## 14. Referências internas

- `docs/design/PAGE_STANDARD.md`: contrato das leituras contínuas.
- `docs/design/GUIA-DE-VOZ.md`: voz, atribuição e estado editorial.
- `docs/architecture/ARCHITECTURE.md`: camadas, rotas e repositórios.
- `docs/research/readings-map.md`: mapa de Trabalhismo, Era Vargas e 1964.
- `src/app/core/content/models/content-artifacts.ts`: manifesto de conteúdo.
- `src/app/core/content/models/content-pointer.ts`: ponteiro, hashes e artefatos.
- `src/app/shared/directives/knowledge-context/`: diretiva de prévia contextual.
- `src/app/shared/ui/knowledge-context/`: ficha contextual existente.
