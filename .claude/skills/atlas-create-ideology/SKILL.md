---
name: atlas-create-ideology
description: Iniciar ou ampliar a leitura de uma nova ideologia/tradição no ATLAS (Social-democracia, Anarquismo, Fascismo, Libertarianismo etc.) com o contrato de 12 capítulos, por pesquisa e dados tipados, sem nova página Angular e sem conteúdo inventado. Usar ao criar ou planejar uma nova página de ideologia.
---

# Criar uma leitura de ideologia no ATLAS

Uma nova tradição é **pesquisa + dados**, não código. O renderer (`IdeologyPageComponent`, `IdeologyBlockComponent`, índice, cards, timeline, grafo, roteiro, debates) já existe. Nunca copie TS/HTML/SCSS de Marxismo ou Liberalismo.

Fontes de verdade, leia sob demanda:

- Contrato dos capítulos: `src/app/features/ideologies/models/ideology-chapters.ts`.
- Schema e blocos: `src/app/features/ideologies/models/ideology-page.schema.ts`.
- Padrão editorial: `docs/design/PAGE_STANDARD.md`.
- Identidade visual: skill `atlas-editorial-geometrico` em `.agents/skills/`. Não duplicar aqui.
- Checklist por etapa: [references/checklist.md](references/checklist.md).
- Mapa de blocos por capítulo: [references/chapter-blocks.md](references/chapter-blocks.md).

## Fluxo

1. **Entrada.** Nome, slug, recorte histórico-geográfico, classificação (`kind`: ideologia, corrente, tradição, movimento ou programa), público e status pretendido. Infira o que puder; pergunte só o que mudar a classificação ou o recorte.
2. **Pesquisa inicial.** QIDs no Wikidata, Wikipedia, arquivos no Commons (licença **por arquivo**), enciclopédias acadêmicas (SEP, IEP), obras primárias e historiografia. Produza um plano **por capítulo** com fontes, localizadores e lacunas. Não redija textos completos sem fonte.
3. **Reconciliar.** Antes de criar uma entidade, procure-a nos snapshots (`src/content/knowledge/collections`, `src/content/graph`). Reutilize `person-karl-marx` e afins; nunca crie `person-marx-2`. A ingestão Wikimedia passa por `scripts/ingestion/wikimedia` (`--media remote`).
4. **Esqueleto.** Gere o rascunho com `ideologyDraft()` (`src/app/features/ideologies/utils/ideology-draft.ts`): 12 capítulos `pending`, `published: false`, sem blocos. Salve como `src/content/ideologies/<slug>/page.json` e o grafo em `src/content/graph/<slug>.json`.
5. **Preencher por capítulo.** Para cada capítulo com fontes verificadas, escreva a pergunta do iniciante, a narrativa atribuída e os blocos adequados ([mapa](references/chapter-blocks.md)). Depois passe `coverage` para `partial` (com `gap`) ou remova-o. Capítulo sem evidência continua `pending` com motivo.
6. **Verificar.** `npm run content:build`, `npm test`, `npm run lint`, `npm run typecheck`. Preview local só com `published: false`: nada entra em `published-ideologies.ts`, rotas ou prerender antes de aprovação explícita do usuário.
7. **Relatório.** Liste o que foi criado, o que está `pending` ou `partial` e por quê, as fontes não lidas diretamente e o que precisa de revisão humana. Revisão `assistant` é IA, nunca "revisado".

## Regras que não se negociam

- Não inventar fonte, data, citação, imagem, mapa, genealogia nem revisão humana.
- Diferenciar fato documentado, interpretação, hipótese e controvérsia (`classification` dos itens).
- Debates seguem defesa → crítica → resposta → limites, todos atribuídos. Falsa equivalência não.
- Uma imagem aparece uma vez na narrativa (`planPageMedia`); retratos ficam em `pensadores`.
- Publicar uma terceira leitura exige generalizar `palette`/`companion` em `IdeologyPageComponent`, hoje fixos por slug. Proponha isso ao usuário antes de publicar.
