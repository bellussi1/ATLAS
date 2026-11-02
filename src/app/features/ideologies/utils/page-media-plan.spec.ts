import type { KnowledgeGraph } from '@core/content/models/content-schema';
import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';

import { planPageMedia } from './page-media-plan';

const asset = (entityId: string, extra: Record<string, unknown> = {}) => ({
  entityId,
  assetPath: `https://upload.wikimedia.org/${entityId}.jpg`,
  status: 'known',
  reproduction: 'allowed',
  license: 'Public domain',
  licenseUrl: 'https://commons.wikimedia.org/',
  attribution: 'Autor',
  filePageUrl: 'https://commons.wikimedia.org/wiki/File:x.jpg',
  ...extra,
});
const graph = {
  atlases: [
    {
      id: 'atlas-test',
      entities: [
        { id: 'person-locke', kind: 'person', title: 'Locke' },
        { id: 'person-mill', kind: 'person', title: 'Mill' },
        { id: 'event-revolution', kind: 'event', title: 'Revolução' },
        { id: 'person-unlicensed', kind: 'person', title: 'Sem licença' },
      ],
      assetLicenses: [
        asset('person-locke'),
        asset('person-mill'),
        asset('event-revolution'),
        asset('person-unlicensed', { reproduction: 'unknown' }),
      ],
    },
  ],
} as unknown as KnowledgeGraph;

const item = (id: string, entityIds: string[]) => ({ id, entityIds });
const page = {
  chapters: [
    {
      id: 'origens',
      blocks: [{ type: 'entities', mode: 'documents', entityIds: ['person-locke'], notes: {} }],
    },
    {
      id: 'principios',
      blocks: [
        {
          type: 'explorations',
          mode: 'principles',
          items: [
            item('consent', ['person-locke']),
            item('harm', ['person-mill', 'event-revolution']),
            item('again', ['event-revolution']),
            item('none', ['person-unlicensed']),
          ],
        },
      ],
    },
    {
      id: 'pensadores',
      blocks: [{ type: 'entities', mode: 'thinkers', entityIds: ['person-locke'], notes: {} }],
    },
  ],
} as unknown as IdeologyPage;

describe('planPageMedia', () => {
  const plan = planPageMedia(page, graph);

  it('keeps a portrait on the thinkers card even when an earlier block names the person', () => {
    expect(plan.get('pensadores-0/person-locke')?.entityId).toBe('person-locke');
    expect(plan.has('origens-0/person-locke')).toBe(false);
  });

  it('gives exploration cards only pictures nobody else shows, preferring events over people', () => {
    expect(plan.has('principios-0/consent')).toBe(false);
    expect(plan.get('principios-0/harm')?.entityId).toBe('event-revolution');
    expect(plan.has('principios-0/again')).toBe(false);
  });

  it('never plans an image without reproduction rights and never repeats a path', () => {
    expect(plan.has('principios-0/none')).toBe(false);
    const paths = [...plan.values()].map((m) => m.assetPath);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
