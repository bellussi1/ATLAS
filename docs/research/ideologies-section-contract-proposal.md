# Proposta: contrato de 12 seções das ideologias (Prompt 00)

Status: **proposta**, ainda não implementada. Base: [ideologies-baseline.md](ideologies-baseline.md).

## Modelo: contrato semântico, composição livre

Fixo em toda ideologia: `id`, ordem, rótulo, pergunta didática, heading `h2`, presença no índice e regra de estado vazio. Variável: os blocos dentro de cada seção (`entities`, `explorations`, `chronology`, `graph`, `debate`, `atlas`…). O schema valida o conjunto e a ordem dos IDs, não os blocos.

## As 12 seções

| # | `id` | Rótulo | Pergunta do iniciante | Objetivo pedagógico | Blocos sugeridos | Origem atual |
|---|---|---|---|---|---|---|
| 01 | `introducao` | O que é? | Do que estamos falando? | Definição, recorte e classificação | abertura, identidade | `introducao` |
| 02 | `origens` | Origens e formação | Onde e por que surgiu? | Contexto e antecedentes documentados | entities, documento | `origens` |
| 03 | `principios` | Pilares e princípios | No que acredita? | Pressupostos e valores atribuídos, com divergências | explorations, argument | parte de `conceitos` |
| 04 | `conceitos` | Conceitos e palavras-chave | Que palavras preciso entender? | Vocabulário com definições progressivas | explorations, glossário | parte de `conceitos` |
| 05 | `epocas` | História e épocas | Como mudou no tempo? | Períodos, eventos, simultaneidade | chronology (+ timeline integrada) | `epocas` + `historia` |
| 06 | `pensadores` | Pensadores e obras | Quem formulou? | Autores em contexto e obras | entities | `pensadores` |
| 07 | `vertentes` | Correntes e vertentes | Todos concordam? | Diferenças internas e relações | graph, explorations | `correntes` |
| 08 | `experiencias` | Experiências históricas | Onde foi tentado ou disputado? | Lugares e casos com limites | explorations | `lugares` |
| 09 | `debates` | Argumentos, críticas e respostas | Quais as objeções? | Defesa → crítica → resposta → limites, sempre atribuídos | debate, explorations | `criticas` |
| 10 | `conexoes` | Conexões com outras tradições | Com o que dialoga? | Relações tipadas com outras tradições e o acervo | atlas sem abas, graph | `acervo` (só Liberalismo) |
| 11 | `leituras` | Roteiro de leitura | O que ler depois? | Progressão de leituras | reading-path | `leituras` |
| 12 | `fontes` | Fontes e metodologia | Como sei que é verdade? | Evidências, licenças, método | sources | `fontes` |

### Mapeamento por rota

- **Marxismo:** dividir `conceitos` em `principios` e `conceitos`. Fundir `historia` em `epocas`, com a timeline como camada da cronologia, sem dois capítulos. Renomear `correntes` → `vertentes`, `lugares` → `experiencias` e `criticas` → `debates`. Criar `conexoes`: os dados do grafo atual permitem relações com Liberalismo e Social-democracia; onde não houver, vale a regra de estado vazio.
- **Liberalismo:** dividir `conceitos` em `principios` e `conceitos`. Renomear como no Marxismo. `acervo` passa a ser `conexoes`, e as abas do `view-switch` viram subseções em sequência no scroll. `debates` precisa de um bloco `debate` estruturado (Prompt 02); até lá, vale a regra de estado vazio, sem preenchimento.
- **Âncoras antigas:** manter redirecionamento de hash (`#correntes` → `#vertentes` etc.) para não quebrar links existentes.

### Regra de estado vazio

Seção sem conteúdo verificado renderiza heading, pergunta e nota de "cobertura pendente" com o motivo editorial (ex.: "debate estruturado aguardando fontes atribuídas"). Nunca cards genéricos nem texto de preenchimento. O schema exige `pending.reason` quando `blocks` estiver vazio.

### Carga cognitiva do índice

Doze itens planos pesam. Proposta: agrupar visualmente no índice, sem esconder nada do scroll.

- **Entender:** 01–04
- **Situar:** 05–08
- **Avaliar e continuar:** 09–12

Rótulos de grupo no índice desktop e como `optgroup` no seletor móvel.

## Navegação final

```
┌──────────────┬──────────────────────────────────────┐
│ SIDEBAR      │ DOCUMENTO (scroll nativo único)      │
│ marca ATLAS  │  01 O que é?                         │
│ ideologias ▸ │  02 Origens e formação               │
│ ───────────  │  ...                                 │
│ Entender     │  12 Fontes e metodologia             │
│  01–04       │                                      │
│ Situar       │  painéis contextuais: inline,        │
│  05–08       │  tamanho reservado, sem trilho       │
│ Avaliar      │  à direita                           │
│  09–12       │                                      │
│ progresso ▮▮▯│                                      │
└──────────────┴──────────────────────────────────────┘
Mobile: a mesma sidebar vira drawer lateral (botão único).
Sem select sticky extra; filtros locais não são sticky.
```

Hoje há cabeçalho, breadcrumb, índice, `view-switch` e `context-panel`. Integrar marca e entradas na sidebar é decisão do Prompt 01, que deve preservar o logo do cabeçalho conforme a regra do projeto. Em caso de conflito, o logo fica onde está e a sidebar recebe só a entrada de ideologias e o índice.

## Cobertura atual × desejada

| Seção | Marxismo | Liberalismo |
|---|---|---|
| 01 introducao | existe | existe |
| 02 origens | existe | existe |
| 03 principios | dentro de `conceitos` | dentro de `conceitos` |
| 04 conceitos | existe | existe |
| 05 epocas | duplicado (`historia` + `epocas`) | existe |
| 06 pensadores | existe | existe |
| 07 vertentes | existe | existe |
| 08 experiencias | parcial (`lugares`) | parcial (`lugares`) |
| 09 debates | estruturado | sem bloco `debate`: pendente |
| 10 conexoes | ausente: pendente | parcial, em abas (`acervo`) |
| 11 leituras | existe | existe |
| 12 fontes | existe | existe |

Nenhuma lacuna deve ser preenchida com conteúdo histórico novo no Prompt 01; isso é tarefa do Prompt 02, com fontes.

## Dependências dos prompts

| Prompt | Depende de | Entrega para |
|---|---|---|
| 01 seções e navegação | 00 | todos |
| 02 conteúdo editorial | 01 (IDs fixos) | 05, 08 |
| 03 imagens e cards | 01 | 06, 08 |
| 04 épocas e grafos | 01 (fusão `historia`/`epocas`, `conexoes`) | 08 |
| 05 roteiro de leitura | 01, 02 | 08 |
| 06 motion, perf e a11y | 01, 03, 04 | 08 |
| 07 skill de criação | 01 (contrato estável), 02 | — |
| 08 validação cruzada | 01–07 | 09 |
| 09 issues | 00 e 08 (relatórios) | — |
