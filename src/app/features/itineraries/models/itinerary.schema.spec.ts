import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { KnowledgeGraph } from '@core/content/models/content-schema';

import {
  type Itinerary,
  type ItineraryValidationContext,
  validateItinerary,
} from './itinerary.schema';

const fixture: Itinerary = JSON.parse(
  readFileSync(
    join(process.cwd(), 'content/itineraries/examples/comparativo-liberdade.json'),
    'utf8',
  ),
);

const context: ItineraryValidationContext = {
  graph: {
    atlases: [
      {
        id: 'atlas-test',
        title: 'Teste',
        version: '1.0.0',
        updatedAt: '2026-11-15',
        sources: [],
        assetLicenses: [],
        relations: [],
        claims: [],
        entities: [
          {
            id: 'ideology-liberalism',
            slug: 'liberalism',
            title: 'Liberalismo',
            kind: 'ideology',
            scope: 'nucleo',
            summary: 'Tradição política.',
            editorialStatus: 'verified',
            aliases: [],
            temporalExtent: null,
          },
          {
            id: 'adam-smith',
            slug: 'adam-smith',
            title: 'Adam Smith',
            kind: 'person',
            scope: 'nucleo',
            summary: 'Economista e filósofo.',
            editorialStatus: 'verified',
            aliases: [],
            temporalExtent: null,
          },
          {
            id: 'draft-entry',
            slug: 'rascunho-teste',
            title: 'Rascunho',
            kind: 'concept',
            scope: 'nucleo',
            summary: 'Rascunho.',
            editorialStatus: 'draft',
            aliases: [],
            temporalExtent: null,
          },
        ],
      },
    ],
  } as unknown as KnowledgeGraph,
  readings: new Map([
    ['liberalismo', { listed: true }],
    ['marxismo', { listed: true }],
    ['social-democracia', { listed: true }],
    ['anarquismo', { listed: true }],
    ['trabalhismo', { listed: false }],
  ]),
};

describe('itinerarySchema and validateItinerary', () => {
  it('accepts the comparative fixture from Phase 0', () => {
    const result = validateItinerary(fixture, context);
    expect(result.ok).toBe(true);
  });

  it('rejects verified status without human reviewer and date', () => {
    const result = validateItinerary({ ...fixture, status: 'verified' }, context);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('revisão humana');
  });

  it('rejects non-existent destinations', () => {
    const broken = structuredClone(fixture);
    broken.stops[1].destination = { type: 'leitura', slug: 'inexistente' };
    const result = validateItinerary(broken, context);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('leitura inexistente');
  });

  it('rejects draft or unlisted destinations in a verified itinerary', () => {
    const verified = structuredClone(fixture);
    verified.status = 'verified';
    verified.review = { status: 'human', reviewer: 'Mantenedor', reviewedAt: '2026-11-15' };
    verified.branches[0].destination = { type: 'leitura', slug: 'trabalhismo' };
    const result = validateItinerary(verified, context);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('rascunho/não listada');
  });

  it('rejects branches without convergence or exit, and rejects cycles', () => {
    const noExit = structuredClone(fixture);
    delete noExit.branches[0].convergesAt;
    expect(validateItinerary(noExit, context).ok).toBe(false);

    const cycle = structuredClone(fixture);
    cycle.branches[0].convergesAt = cycle.branches[0].fromStop;
    const cycleResult = validateItinerary(cycle, context);
    expect(cycleResult.ok).toBe(false);
    if (!cycleResult.ok) expect(cycleResult.errors.join(' ')).toContain('evita ciclo');
  });

  it('rejects fewer than 4 stops, duplicate destinations without justification, and partial coverage without note', () => {
    const short = structuredClone(fixture);
    short.stops = short.stops.slice(0, 3);
    expect(validateItinerary(short, context).ok).toBe(false);

    const dup = structuredClone(fixture);
    dup.stops[2].destination = dup.stops[1].destination;
    expect(validateItinerary(dup, context).ok).toBe(false);

    const partial = structuredClone(fixture);
    partial.coverage = 'partial';
    expect(validateItinerary(partial, context).ok).toBe(false);
  });
});
