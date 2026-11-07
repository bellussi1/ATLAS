---
name: atlas-create-reading
description: Criar ou ampliar uma leitura contínua do ATLAS para qualquer assunto com contexto próprio — ideologia, pessoa, acontecimento, instituição, período ou conceito — decidindo antes se ele merece uma leitura ou apenas um verbete, com o contrato de 12 capítulos, fontes acadêmicas, caso brasileiro e até cinco conexões curadas. Usar ao planejar ou escrever páginas como Governo Vargas, Golpe de 1964, Ditadura militar ou Trabalhismo.
---

# Criar uma leitura contínua no ATLAS

Uma leitura contínua não é um verbete maior. É uma página longa para um assunto que precisa de **contexto, disputa e conexão**: um recorte que organiza origens, mudanças, posições e consequências. O verbete responde "o que é"; a leitura responde "como isso se formou, por que importa e com o que se conecta".

O renderer atual é `IdeologyPageComponent` e o contrato de dados é `ideology-page.schema.ts`. A página é servida em `/<slug>`. O nome "ideology" é histórico; o conteúdo pode ser uma pessoa, um acontecimento, uma instituição, um período ou um conceito, desde que o recorte e as fontes sustentem os 12 capítulos.

Fontes de verdade, leia sob demanda:

- Contrato dos capítulos: `src/app/features/ideologies/models/ideology-chapters.ts`.
- Schema e blocos: `src/app/features/ideologies/models/ideology-page.schema.ts`.
- Padrão editorial e visual: `docs/design/PAGE_STANDARD.md`.
- Identidade visual: skill `atlas-editorial-geometrico`.
- Mapa de conexões publicadas: `src/app/features/ideologies/data/ideology-readings.ts`.
- Pesquisa que originou o recorte: esta skill, `references/`.

## 0. Decidir antes de escrever

Uma leitura só se justifica quando o assunto tem **extensão histórica, interpretações em disputa e conexões que mudam a compreensão**. O verbete continua sendo o lugar de tudo o que é pontual, biográfico curto ou enciclopédico.

Antes de criar, responda no plano:

1. Qual pergunta o verbete não consegue responder?
2. Quais são as 3 a 5 conexões que tornam a leitura necessária?
3. Há fontes acadêmicas suficientes para os capítulos "Situar" e "Avaliar"?
4. Existe caso brasileiro documentado que acrescente contexto, sem forçar o enquadramento?
5. O recorte cabe em uma página, ou são duas leituras (por exemplo, "Golpe de 1964" e "Ditadura militar")?

Se a resposta for "não" em 1, 3 ou 5, não crie a leitura. Detalhe em [references/selection.md](references/selection.md).

## 1. Classificar o assunto

Escolha um tipo e ajuste os capítulos a ele:

| Tipo            | Exemplos                           | Capítulo "Pensadores" vira | Ênfase adicional                |
| --------------- | ---------------------------------- | -------------------------- | ------------------------------- |
| `ideologia`     | Marxismo, Liberalismo, Trabalhismo | Pensadores e obras         | Vertentes e debates             |
| `pessoa`        | Getúlio Vargas, Leonel Brizola     | Trajetória e obras         | Decisões, redes e legado        |
| `acontecimento` | Golpe de 1964, Greve de 1917       | Protagonistas e relatos    | Cronologia, causas e leituras   |
| `instituição`   | Ditadura militar, PCB, PDT         | Dirigentes e documentos    | Funcionamento e transformação   |
| `período`       | Era Vargas, Primeira República     | Intérpretes e obras        | Periodização e rupturas         |
| `conceito`      | Trabalhismo, Populismo             | Formuladores e usos        | Usos disputados e historicidade |

Regras:

- O tipo é editorial, não uma categoria do Wikidata.
- Um mesmo assunto pode ter verbete **e** leitura; a leitura não duplica o verbete, ela o cita e o conecta.
- Não transforme toda pessoa ou evento em leitura. O critério é contexto, não notoriedade.

Detalhe em [references/subject-types.md](references/subject-types.md).

## 2. Pesquisar com fontes acadêmicas

Para cada capítulo, produza um plano com:

- pergunta do iniciante;
- 2 a 5 afirmações que serão feitas;
- fonte de cada afirmação, com localizador (capítulo, seção, página ou URL);
- natureza (`fato documentado`, `tese atribuída`, `interpretação`, `hipótese`);
- lacuna explícita quando não houver fonte.

Prioridade de fontes:

1. obra primária ou documento oficial;
2. estudo acadêmico revisado (livro universitário, artigo em periódico, verbete de enciclopédia acadêmica);
3. imprensa ou fonte institucional apenas para cronologia e atribuição, nunca como única base de interpretação.

Não use uma fonte para afirmar o que ela não diz. Não invente página, data ou citação. Se não leu a obra diretamente, declare "fonte secundária" e não copie trechos.

## 3. Situar e avaliar

Os capítulos "Situar" (05–08) e "Avaliar e continuar" (09–12) não podem ser resumo de datas. Cada um precisa de uma tese de leitura:

- `epocas`: periodização justificada, com rupturas e continuidades; datas aproximadas continuam aproximadas.
- `pensadores`: seleção com critério, não panteão; contexto, obra, posição e crítica.
- `vertentes`: diferenças reais, sem genealogia inventada; comparar quando a fonte não permitir descendência.
- `experiencias`: casos concretos, com lugar, período e consequência; incluir o Brasil quando houver documentação.
- `debates`: defesa → crítica → resposta → limites, todos atribuídos; se não houver resposta documentada, dizer isso.
- `conexoes`: relações tipadas com outras leituras e tradições, com natureza e fonte.
- `leituras`: roteiro com obra primária, introdução, estudo e crítica, indicando nível e motivo.
- `fontes`: método, lacunas e estado de revisão.

## 4. Caso brasileiro

Incluir o Brasil não é inserir um parágrafo patriótico no fim. É mostrar como o assunto foi apropriado, disputado ou transformado no país, com fonte acadêmica.

- Use o caso brasileiro quando ele **explica** algo do recorte, não para cumprir cota.
- Nomeie o período, os atores e o documento ou instituição.
- Distinga influência, adaptação, ruptura e coincidência.
- Não use "populismo" como rótulo automático; atribua o uso a quem o formulou.
- Se o caso brasileiro for uma lacuna, registre `coverage: partial` e o `gap`; não preencha com senso comum.

Detalhe em [references/brazilian-case.md](references/brazilian-case.md).

## 5. Conexões: até cinco nós

Cada leitura publicada declara **3 a 5 conexões curadas** em `ideologyReadings[].connections`, cada uma com `slug` e `reason`. Não é uma lista de "veja também": é um caminho argumentativo.

- A razão deve dizer o que muda ao ler o outro: contraste, continuidade, disputa ou consequência.
- No máximo cinco; no mínimo três quando houver outras leituras publicadas.
- Só aponte para leitura publicada; o resolvedor descarta rascunhos, mas o dado deve ser limpo.
- A conexão não substitui a fonte. Se a razão afirmar uma relação histórica, ela precisa de fonte no capítulo `conexoes` ou no grafo.
- Evite simetria artificial: se A critica B e B não responde, a conexão diz isso.

Detalhe em [references/connections.md](references/connections.md).

## 6. Criar o rascunho

1. Rode `npm run ideology:new -- --slug <slug> --title <título> --kind <kind> --atlas <atlas-id> --palette <paleta> --note "<recorte>"`.
2. Preencha só os capítulos com fonte verificada.
3. Use `coverage: pending` + `gap` para o que não tem base; `partial` + `gap` para recorte incompleto.
4. Adicione as conexões em `ideologyReadings`, mas não registre a leitura como publicada.
5. Rode `npm run content:build`, `npm test`, `npm run lint`, `npm run typecheck`.
6. Relate fontes lidas, fontes secundárias, lacunas e o que precisa de revisão humana.

## 7. Promover

Só promova com aprovação explícita:

- `published: true` no `page.json`;
- entrada em `data/ideology-readings.ts`;
- entrada em `data/published-ideologies.ts`;
- rota e prerender conferidos;
- revisão humana registrada com pessoa e data, ou estado `com-fontes`/`rascunho` visível.

Nunca marque `revisado` sem pessoa identificada. Revisão `assistant` é IA.

## Regras que não se negociam

- Não inventar fonte, data, citação, imagem, mapa, genealogia, conexão ou revisão humana.
- Não publicar rascunho, não fazer push e não alterar `master` sem pedido explícito.
- Não transformar verbete em leitura por vaidade de página: o critério é contexto e fonte.
- Não usar o caso brasileiro como ornamento.
- Não deixar uma conexão sem razão ou uma razão sem fonte quando ela é histórica.

## Referências

- [Seleção: leitura ou verbete](references/selection.md)
- [Tipos de assunto e adaptação dos capítulos](references/subject-types.md)
- [Conexões e o limite de cinco nós](references/connections.md)
- [Caso brasileiro com fontes](references/brazilian-case.md)
- [Checklist de criação e promoção](references/checklist.md)
