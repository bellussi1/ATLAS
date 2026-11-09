#!/usr/bin/env node
// Classifica os lugares do grafo em países, estados, cidades, regiões, continentes e locais.
// Corrige também tipos óbvios: cidade cadastrada como conceito, país como instituição.
// Não cria nem apaga entidades; só ajusta `kind`, `placeCategory` e remove perfis incompatíveis.
//
//   node scripts/content/classify-places.mjs --dry-run
//   node scripts/content/classify-places.mjs
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { readSourceGraph, writeSourceGraph } from './source-graph.mjs';

const TODAY = '2026-11-09';

const country = new Set([
  'Afeganistão',
  'África do Sul',
  'Alemanha',
  'Alemanha Ocidental',
  'Alemanha Oriental',
  'Angola',
  'Arábia Saudita',
  'Argélia',
  'Argentina',
  'Austrália',
  'Áustria',
  'Bélgica',
  'Bolívia',
  'Brasil',
  'Checoslováquia',
  'Chéquia',
  'Chile',
  'China',
  'Coreia do Norte',
  'Coreia do Sul',
  'Costa Rica',
  'Cuba',
  'Dinamarca',
  'Egito',
  'El Salvador',
  'Equador',
  'Espanha',
  'Estados Unidos',
  'Estónia',
  'Etiópia',
  'Filipinas',
  'Finlândia',
  'França',
  'Grécia',
  'Guatemala',
  'Haiti',
  'Hungria',
  'Índia',
  'Indonésia',
  'Irã',
  'Iraque',
  'Irlanda',
  'Islândia',
  'Israel',
  'Itália',
  'Japão',
  'Jugoslávia',
  'Laos',
  'Letónia',
  'Lituânia',
  'Malásia',
  'México',
  'Moçambique',
  'Myanmar',
  'Nicarágua',
  'Nigéria',
  'Noruega',
  'Nova Zelândia',
  'Países Baixos',
  'Panamá',
  'Paquistão',
  'Paraguai',
  'Peru',
  'Polónia',
  'Portugal',
  'Reino Unido',
  'República Dominicana',
  'Romênia',
  'Rússia',
  'Singapura',
  'Síria',
  'Suécia',
  'Suíça',
  'Tailândia',
  'Taiwan',
  'Turquia',
  'Ucrânia',
  'União Soviética',
  'Uruguai',
  'Vaticano',
  'Venezuela',
  'Vietnã',
]);

const state = new Set([
  'Áustria-Hungria',
  'Califórnia',
  'Escócia',
  'Império Alemão',
  'Império Britânico',
  'Império do Brasil',
  'Império do Japão',
  'Império Espanhol',
  'Império Romano',
  'Império Russo',
  'Inglaterra',
  'Itália Fascista',
  'Ohio',
  'Prússia',
  'República de Weimar',
  'República Socialista Federativa Soviética da Rússia',
  'Roma Antiga',
  'Sacro Império Romano-Germânico',
  'Terceira República Francesa',
]);

const city = new Set([
  'Barcelona',
  'Berlim',
  'Brasília',
  'Budapeste',
  'Buenos Aires',
  'Genebra',
  'Havana',
  'Londres',
  'Manágua',
  'Moscovo',
  'Nova Iorque',
  'Paris',
  'Pequim',
  'Rio de Janeiro',
  'Roma',
  'São Paulo',
  'São Petersburgo',
  'Viena',
  'Vitemberga',
  'Washington, D.C.',
]);

const region = new Set([
  'América espanhola',
  'América Latina',
  'Caribe',
  'Escandinávia',
  'Europa Ocidental',
  'Grã-Bretanha',
  'Leste Europeu',
  'Médio Oriente',
  'Mundo islâmico',
  'Mundo ocidental',
  'Norte de África',
  'Rio da Prata',
  'Sibéria',
]);

const continent = new Set([
  'África',
  'América',
  'América do Norte',
  'América do Sul',
  'Ásia',
  'Europa',
]);

const site = new Set([
  'Aeroporto Internacional Luis Muñoz Marin',
  'Casa Branca',
  'Colônia Cecília',
  'Colônia de Plymouth',
  'Muro de Berlim',
  'Plenário da Câmara dos Deputados',
  'Westminster',
]);

const concept = new Set([
  'Colónia',
  'Estado-nação',
  'País desenvolvido',
  'País em desenvolvimento',
]);

const categoryFor = (title) => {
  if (country.has(title)) return 'country';
  if (state.has(title)) return 'state';
  if (city.has(title)) return 'city';
  if (region.has(title)) return 'region';
  if (continent.has(title)) return 'continent';
  if (site.has(title)) return 'site';
  if (concept.has(title)) return 'concept';
  return null;
};

const skipped = new Set(['wiki-topic-brasil', 'wiki-topic-portugal']);

export function classifyPlaces(graph) {
  const changes = [];
  for (const atlas of graph.atlases) {
    for (const entity of atlas.entities) {
      if (skipped.has(entity.id)) continue;
      if (entity.placeType === 'regime') continue;
      const category = categoryFor(entity.title);
      if (category === 'concept') {
        if (entity.kind !== 'concept') {
          changes.push({ id: entity.id, title: entity.title, from: entity.kind, to: 'concept' });
          entity.kind = 'concept';
        }
        delete entity.placeCategory;
        continue;
      }
      if (!category) {
        if (entity.kind === 'place') {
          entity.placeCategory ??= 'other';
          changes.push({
            id: entity.id,
            title: entity.title,
            from: 'place',
            to: 'place:other',
          });
        }
        continue;
      }
      if (entity.kind !== 'place' || entity.placeCategory !== category) {
        changes.push({
          id: entity.id,
          title: entity.title,
          from: entity.kind,
          to: `place:${category}`,
        });
        entity.kind = 'place';
        entity.placeCategory = category;
      }
    }
  }
  if (changes.length) graph.updatedAt = TODAY;
  return changes;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const graph = await readSourceGraph();
  const changes = classifyPlaces(graph);
  if (!dryRun && changes.length) await writeSourceGraph(graph);
  for (const change of changes)
    console.log(`${change.from} -> ${change.to}\t${change.title}\t${change.id}`);
  console.log(`${changes.length} mudanças${dryRun ? ' (dry-run)' : ''}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
