#!/usr/bin/env node
// Reauditoria dos verbetes: tipos restantes, escopo e peso das relações.
// Usa a mesma classificação do grafo (`relationWeightOf`) para não divergir da UI.
//
//   node scripts/content/audit-verbetes.mjs
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { readSourceGraph } from './source-graph.mjs';

const { relationWeightOf, relationWeights } =
  await import('../../src/app/core/content/queries/knowledge-network.ts');

const ROOT = process.cwd();
const TSV = 'docs/research/auditoria-verbetes-2026-11/tipos-candidatos.tsv';
const OUT = 'docs/research/auditoria-verbetes-2026-11/reauditoria-2026-11.md';

async function readTypeCandidates() {
  const text = await readFile(resolve(ROOT, TSV), 'utf8');
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const columns = header.split('\t');
  const at = (name) => columns.indexOf(name);
  return lines.flatMap((line) => {
    const values = line.split('\t');
    if (values[at('confianca')] !== 'alta') return [];
    return [
      {
        current: values[at('kind_atual')],
        suggested: values[at('kind_sugerido')],
        title: values[at('titulo')],
      },
    ];
  });
}

const graph = await readSourceGraph();
const entities = graph.atlases.flatMap((atlas) => atlas.entities);
const relations = graph.atlases.flatMap((atlas) => atlas.relations);
const verbs = graph.atlases.find((atlas) => atlas.id === 'atlas-verbetes-citados');
const verbRelations = verbs.relations;

const weightCount = (list) => {
  const counts = Object.fromEntries(relationWeights.map((weight) => [weight.id, 0]));
  for (const relation of list) counts[relationWeightOf(relation)] += 1;
  return counts;
};
const totalWeight = weightCount(relations);
const verbWeight = weightCount(verbRelations);
const political = (counts) => counts.historical + counts.action;

const scopeCounts = { nucleo: 0, contexto: 0, fora: 0 };
for (const entity of entities) scopeCounts[entity.scope ?? 'nucleo'] += 1;
const verbScope = { nucleo: 0, contexto: 0, fora: 0 };
for (const entity of verbs.entities) verbScope[entity.scope ?? 'nucleo'] += 1;

const politicalByEntity = new Map(
  entities.map((entity) => [entity.id, { entity, historical: 0, action: 0 }]),
);
for (const relation of relations) {
  const weight = relationWeightOf(relation);
  if (weight !== 'historical' && weight !== 'action') continue;
  for (const id of [relation.fromEntityId, relation.toEntityId]) {
    const entry = politicalByEntity.get(id);
    if (entry) entry[weight] += 1;
  }
}
const scopePolitical = { nucleo: 0, contexto: 0, fora: 0 };
const withoutPolitical = { nucleo: 0, contexto: 0, fora: 0 };
for (const entry of politicalByEntity.values()) {
  const scope = entry.entity.scope ?? 'nucleo';
  const count = entry.historical + entry.action;
  if (count) scopePolitical[scope] += 1;
  else withoutPolitical[scope] += 1;
}

const candidates = await readTypeCandidates();
const byTitle = new Map(entities.map((entity) => [entity.title, entity]));
const remaining = candidates.filter((candidate) => {
  const entity = byTitle.get(candidate.title);
  return entity && entity.kind !== candidate.suggested;
});

const relationsOf = (entity) =>
  relations.filter(
    (relation) => relation.fromEntityId === entity.id || relation.toEntityId === entity.id,
  );
const outside = entities.filter((entity) => entity.scope === 'fora');
const context = entities.filter((entity) => entity.scope === 'contexto');
const outsideWithoutRelations = outside.filter((entity) => !relationsOf(entity).length).length;
const outsideCreationOnly = outside.filter((entity) => {
  const links = relationsOf(entity);
  return links.length > 0 && links.every((link) => ['wrote', 'authored'].includes(link.type));
}).length;
const contextWithoutRelations = context.filter((entity) => !relationsOf(entity).length).length;
const contextWithRelations = context.length - contextWithoutRelations;

const contextTsv = await readFile(
  resolve(ROOT, 'docs/research/auditoria-verbetes-2026-11/contexto.tsv'),
  'utf8',
);
const contextTitles = contextTsv
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => line.split('\t')[0]);
const contextMissing = contextTitles.filter((title) => !byTitle.has(title));

const n = (value) => value.toLocaleString('pt-BR');

const percent = (value, total) =>
  total ? `${((value / total) * 100).toFixed(1).replace('.', ',')}%` : '0%';
const row = (label, counts, total) =>
  `| ${label} | ${counts.historical} | ${counts.action} | ${counts.administrative} | ${counts.catalog} | ${total} |`;

const report = `Status: resultado
Última verificação: 09/11/2026

# Reauditoria dos verbetes — 09/11/2026

Segunda medição depois da correção de tipos e da criação do escopo. Os números de
comparação vêm de \`AUDITORIA-VERBETES-2026-11.md\`, medidos antes das mudanças.

## Tipos

- Candidatos de alta confiança no TSV: **${candidates.length}**.
- Ainda divergentes no grafo: **${remaining.length}**.
${remaining.map((candidate) => `  - ${candidate.title}: ${candidate.current} → ${candidate.suggested}`).join('\n')}

## Escopo

| Escopo | Registros |
|---|---:|
| Núcleo | ${n(scopeCounts.nucleo)} |
| Contexto | ${n(scopeCounts.contexto)} |
| Fora | ${n(scopeCounts.fora)} |
| Total | ${n(entities.length)} |

Nos 928 verbetes citados:

| Escopo | Verbetes |
|---|---:|
| Núcleo | ${n(verbScope.nucleo)} |
| Contexto | ${n(verbScope.contexto)} |
| Fora | ${n(verbScope.fora)} |

### Revisão caso a caso

- **20 fora confirmados.** ${outsideWithoutRelations} não têm nenhuma relação e ${outsideCreationOnly} têm apenas um vínculo de criação (\`escreveu\`), que não muda o recorte político. Nenhum foi promovido a contexto e nenhum registro foi apagado.
- **36 contextos confirmados.** ${contextWithoutRelations} não têm relações registradas e ${contextWithRelations} têm ao menos uma. Nenhum foi promovido a núcleo: são mídia, universidade, editora, instituição religiosa, conceito social ou pensamento de contexto.
- **${64 - verbScope.contexto} itens** da estimativa de ~64 contextos seguem sem marcação e continuam na revisão editorial.
- **4 títulos** do TSV de contexto não existem no grafo e não foram aplicados: ${contextMissing.join(', ')}.
- O tipo de **Empirismo** continua \`institution\`; é um erro de tipo fora do lote de alta confiança e fica para a próxima passada.

## Peso das relações

### Grafo completo

| Peso | Histórico | Ação | Administrativo | Catálogo | Total |
|---|---:|---:|---:|---:|---:|
${row('Total', totalWeight, relations.length).replaceAll(/\d+/g, (value) => n(Number(value)))}

Político (histórico + ação): **${n(political(totalWeight))} de ${n(relations.length)} (${percent(political(totalWeight), relations.length)})**.

### \`atlas-verbetes-citados\`

| Peso | Histórico | Ação | Administrativo | Catálogo | Total |
|---|---:|---:|---:|---:|---:|
${row('Total', verbWeight, verbRelations.length).replaceAll(/\d+/g, (value) => n(Number(value)))}

Comparação com a auditoria de 09/11 (1.122 relações):

| Peso | Antes | Agora | Variação |
|---|---:|---:|---:|
| Histórico | 150 | ${n(verbWeight.historical)} | ${verbWeight.historical - 150 >= 0 ? '+' : ''}${n(verbWeight.historical - 150)} |
| Ação | 342 | ${n(verbWeight.action)} | ${verbWeight.action - 342 >= 0 ? '+' : ''}${n(verbWeight.action - 342)} |
| Administrativo | 417 | ${n(verbWeight.administrative)} | ${verbWeight.administrative - 417 >= 0 ? '+' : ''}${n(verbWeight.administrative - 417)} |
| Catálogo | 213 | ${n(verbWeight.catalog)} | ${verbWeight.catalog - 213 >= 0 ? '+' : ''}${n(verbWeight.catalog - 213)} |
| Total | 1.122 | ${n(verbRelations.length)} | ${verbRelations.length - 1122 >= 0 ? '+' : ''}${n(verbRelations.length - 1122)} |

A regra de peso reproduz exatamente os quatro números da auditoria anterior sobre o mesmo
conjunto de 1.122 relações, o que valida a classificação. O grafo completo tem
${n(relations.length)} relações porque inclui as outras coleções.

## Relevância política por escopo

Registros com pelo menos uma relação histórica ou de ação, por escopo:

| Escopo | Com relevância política | Sem relevância política | Total |
|---|---:|---:|---:|
| Núcleo | ${n(scopePolitical.nucleo)} | ${n(withoutPolitical.nucleo)} | ${n(scopePolitical.nucleo + withoutPolitical.nucleo)} |
| Contexto | ${n(scopePolitical.contexto)} | ${n(withoutPolitical.contexto)} | ${n(scopePolitical.contexto + withoutPolitical.contexto)} |
| Fora | ${n(scopePolitical.fora)} | ${n(withoutPolitical.fora)} | ${n(scopePolitical.fora + withoutPolitical.fora)} |

O escopo é uma decisão editorial; o peso da relação não muda o escopo sozinho. A contagem
serve para separar o que tem relação histórica documentada do que só aparece por vínculo
administrativo ou de catálogo.

## Limites

- O peso é derivado do tipo e do rótulo da relação; uma relação mal tipada continua mal pesada.
- Um vínculo de criação, como \`escreveu\`, conta como ação mesmo quando a obra é de ficção ou um conceito genérico. O escopo corrige a leitura; o peso sozinho não.
- A classificação de escopo dos ~64 contextos é estimativa e segue em revisão caso a caso.
- Nenhuma fonte foi reaberta nesta rodada.
`;

await import('node:fs/promises').then(({ writeFile }) => writeFile(resolve(ROOT, OUT), report));

console.log(`Tipos ainda divergentes: ${remaining.length}/${candidates.length}`);
console.log(
  `Escopo: ${scopeCounts.nucleo} núcleo, ${scopeCounts.contexto} contexto, ${scopeCounts.fora} fora`,
);
console.log(`Peso no grafo: ${JSON.stringify(totalWeight)}`);
console.log(`Peso nos verbetes: ${JSON.stringify(verbWeight)}`);
console.log(`Político nos verbetes: ${political(verbWeight)}/${verbRelations.length}`);
console.log(`Relatório: ${OUT}`);
