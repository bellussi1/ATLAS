import type { ContentRepository } from '@core/content/repositories/content-repository.service';
import { methodologyKnowledgeGraph } from '@testing/content-fixture';

import { entityContext } from './entity-context';

const repository = { knowledgeGraph: methodologyKnowledgeGraph } as ContentRepository;

describe('Entity context projection', () => {
  it('does not repeat the summary or identical editorial paragraphs', () => {
    const record = entityContext(repository, 'person-karl-marx');
    expect(new Set(record.paragraphs).size).toBe(record.paragraphs.length);
    expect(record.paragraphs).not.toContain(record.summary);
  });
  it('keeps Wikidata P737 subject influenced BY object in both directions', () => {
    const outgoing = entityContext(repository, 'person-friedrich-engels').connections.find(
      (c) => c.id === 'marxism-statement-person-friedrich-engels-p737-person-karl-marx',
    );
    expect(outgoing?.relation?.label).toBe('é listado no Wikidata como influenciado por');
    const incoming = entityContext(repository, 'person-karl-marx').connections.find(
      (c) => c.id === outgoing?.id,
    );
    expect(incoming?.relation?.label).toBe('é listado no Wikidata como influência para');
  });
  it('preserves oriented relation, evidence and locator when following an incoming link', () => {
    const record = entityContext(repository, 'work-capital-volume-i');
    expect(record.connections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'relation-marx-capital',
          entityId: 'person-karl-marx',
          label: 'Karl Marx',
          relation: expect.objectContaining({
            label: 'foi escrito por',
            direction: 'incoming',
            type: 'documented-association',
            references: expect.arrayContaining([
              expect.objectContaining({ locator: expect.any(String), source: expect.any(Object) }),
            ]),
          }),
        }),
      ]),
    );
  });

  it('keeps separate relations to the same entity and does not hide connections after eight', () => {
    const graph = structuredClone(methodologyKnowledgeGraph);
    const atlas = graph.atlases.find((a) => a.id === 'atlas-marx-valor')!;
    const relation = atlas.relations.find((r) => r.id === 'relation-marx-capital')!;
    atlas.relations.push({
      ...relation,
      id: 'relation-another-perspective',
      label: 'outra leitura',
    });
    const record = entityContext(
      { knowledgeGraph: graph } as ContentRepository,
      'person-karl-marx',
    );
    const expected = graph.atlases
      .flatMap((a) => a.relations)
      .filter((r) => r.fromEntityId === 'person-karl-marx' || r.toEntityId === 'person-karl-marx');
    expect(record.connections).toHaveLength(expected.length);
    expect(record.connections.filter((c) => c.entityId === 'work-capital-volume-i')).toHaveLength(
      2,
    );
  });

  it('exposes imported provenance without upgrading a Wikipedia link to evidence', () => {
    expect(entityContext(repository, 'person-john-locke').connections[0]).toMatchObject({
      entityId: 'person-adam-smith',
      relation: {
        type: 'encyclopedic-link',
        editorialStatus: 'pending',
        references: [],
        provenance: { source: 'wikipedia', url: 'https://pt.wikipedia.org/wiki/John_Locke' },
      },
    });
  });

  it('handles missing entities and records without connections explicitly', () => {
    expect(entityContext(repository, 'missing')).toMatchObject({
      title: 'Registro indisponível',
      sources: [],
      connections: [],
    });
    expect(entityContext(repository, 'person-john-locke').sources.length).toBeGreaterThan(0);
  });
});
