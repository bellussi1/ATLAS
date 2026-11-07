import type { KnowledgeGraph } from '@core/content/models/content-schema';
import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';

import { curatedOpeningAssets, resolveOpeningFigures } from './opening-media';

const asset = (id: string, entityId: string, extra: Record<string, unknown> = {}) => ({
  id,
  entityId,
  assetPath: `https://upload.wikimedia.org/${id}.jpg`,
  status: 'known',
  reproduction: 'allowed',
  license: 'Public domain',
  licenseUrl: 'https://creativecommons.org/publicdomain/',
  attribution: 'Autor',
  filePageUrl: 'https://commons.wikimedia.org/wiki/File:x.jpg',
  creator: 'Autor',
  ...extra,
});
const entity = (id: string, kind: string, title: string) => ({ id, kind, title, slug: id });
const graph = {
  atlases: [
    {
      id: 'atlas-test',
      entities: [
        entity('person-a', 'person', 'Pessoa A'),
        entity('person-b', 'person', 'Pessoa B'),
        entity('person-c', 'person', 'Pessoa C'),
        entity('work-d', 'work', 'Obra D'),
        entity('event-e', 'event', 'Evento E'),
      ],
      assetLicenses: [
        asset('asset-a', 'person-a'),
        asset('asset-b', 'person-b'),
        asset('asset-c', 'person-c'),
        asset('asset-d', 'work-d'),
        asset('asset-e', 'event-e'),
      ],
      relations: [
        { fromEntityId: 'person-a', toEntityId: 'work-d' },
        { fromEntityId: 'person-a', toEntityId: 'event-e' },
      ],
    },
  ],
} as unknown as KnowledgeGraph;

const page = (extra: Record<string, unknown> = {}) =>
  ({
    atlasId: 'atlas-test',
    portrait: null,
    poster: { figures: [] },
    chapters: [{ blocks: [{ type: 'entities', mode: 'thinkers', entityIds: [], notes: {} }] }],
    ...extra,
  }) as unknown as IdeologyPage;

describe('resolveOpeningFigures', () => {
  it('keeps the curated order, labels, notes and frames', () => {
    const figures = resolveOpeningFigures(
      page({
        poster: {
          figures: [
            { entityId: 'person-a', assetId: 'asset-a', note: 'Razão A', frame: 'disc' },
            {
              entityId: 'work-d',
              assetId: 'asset-d',
              label: 'Obra D, 1900',
              note: 'Razão D',
              frame: 'square',
            },
          ],
        },
      }),
      graph,
    );
    expect(figures.map((figure) => figure.entity.id)).toEqual(['person-a', 'work-d']);
    expect(figures.map((figure) => figure.label)).toEqual(['Pessoa A', 'Obra D, 1900']);
    expect(figures.map((figure) => figure.note)).toEqual(['Razão A', 'Razão D']);
    expect(figures.map((figure) => figure.frame)).toEqual(['disc', 'square']);
    expect(figures.every((figure) => figure.curated)).toBe(true);
    expect(figures[0].atlas.id).toBe('atlas-test');
  });

  it('keeps a single curated figure instead of filling the other slots', () => {
    const figures = resolveOpeningFigures(
      page({
        poster: {
          figures: [{ entityId: 'person-a', assetId: 'asset-a', note: 'Razão A' }],
        },
      }),
      graph,
    );
    expect(figures).toHaveLength(1);
    expect(figures[0].curated).toBe(true);
  });

  it('drops a curated figure without a reproducible licence and falls back safely', () => {
    const unlicensed = {
      ...graph,
      atlases: [
        {
          ...graph.atlases[0],
          assetLicenses: [
            ...graph.atlases[0].assetLicenses,
            asset('asset-bad', 'person-c', { reproduction: 'unknown' }),
          ],
        },
      ],
    } as KnowledgeGraph;
    const figures = resolveOpeningFigures(
      page({
        poster: {
          figures: [{ entityId: 'person-c', assetId: 'asset-bad', note: 'Sem licença' }],
        },
      }),
      unlicensed,
    );
    expect(figures.every((figure) => figure.curated)).toBe(false);
    expect(figures.some((figure) => figure.asset.id === 'asset-bad')).toBe(false);
  });

  it('falls back to cited records, not the first four people, and never repeats an asset', () => {
    const figures = resolveOpeningFigures(
      page({
        chapters: [
          {
            blocks: [
              {
                type: 'entities',
                mode: 'thinkers',
                entityIds: ['person-c', 'person-b', 'person-a', 'work-d', 'event-e'],
                notes: {},
              },
            ],
          },
        ],
      }),
      graph,
    );
    const kinds = figures.map((figure) => figure.entity.kind);
    expect(figures.length).toBeGreaterThan(0);
    expect(figures.length).toBeLessThanOrEqual(4);
    expect(kinds.filter((kind) => kind === 'person').length).toBeLessThanOrEqual(2);
    expect(kinds).toContain('work');
    expect(kinds).toContain('event');
    expect(new Set(figures.map((figure) => figure.asset.assetPath)).size).toBe(figures.length);
    expect(figures.every((figure) => figure.curated === false)).toBe(true);
  });

  it('reserves only the curated opening assets for the chapter plan', () => {
    const assets = curatedOpeningAssets(
      page({
        poster: {
          figures: [{ entityId: 'person-a', assetId: 'asset-a', note: 'Razão A' }],
        },
      }),
      graph,
    );
    expect([...assets]).toEqual([graph.atlases[0].assetLicenses[0].assetPath]);
  });
});
