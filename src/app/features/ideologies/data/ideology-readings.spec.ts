import {
  companionOf,
  connectionsOf,
  ideologyReadings,
  paletteOf,
} from '@ideologies/data/ideology-readings';
import { publishedIdeologies } from '@ideologies/data/published-ideologies';
import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';
import { ideologyPageSchema } from '@ideologies/models/ideology-page.schema';
import { ideologyDraft } from '@ideologies/utils/ideology-draft';

const draft = (slug: string, palette?: IdeologyPage['identity']['palette']) =>
  ideologyDraft({
    slug,
    title: slug,
    kind: 'tradicao',
    classificationNote: 'n',
    atlasId: 'a',
    palette,
  });

describe('ideology readings', () => {
  it('lists exactly the published sources, so a route never lacks content', () => {
    expect(ideologyReadings.map((r) => r.slug).sort()).toEqual(
      Object.keys(publishedIdeologies).sort(),
    );
  });

  it('prefers the page palette, keeps released ones and falls back to atlas', () => {
    expect(paletteOf(draft('anarquismo', 'anarquismo'))).toBe('anarquismo');
    expect(paletteOf(draft('liberalismo'))).toBe('liberal');
    expect(paletteOf(draft('desconhecida'))).toBe('atlas');
  });

  it('links each reading to the next one, wrapping around', () => {
    expect(companionOf('marxismo')?.slug).toBe('liberalismo');
    expect(companionOf('liberalismo')?.slug).toBe('social-democracia');
    expect(companionOf('anarquismo')?.slug).toBe('marxismo');
  });

  it('keeps at most five published, distinct connections and never links a reading to itself', () => {
    const published = new Set(ideologyReadings.map((reading) => reading.slug));
    for (const reading of ideologyReadings) {
      expect(reading.connections.length).toBeLessThanOrEqual(5);
      const targets = reading.connections.map((connection) => connection.slug);
      expect(new Set(targets).size).toBe(targets.length);
      expect(targets).not.toContain(reading.slug);
      expect(targets.every((slug) => published.has(slug))).toBe(true);
      expect(connectionsOf(reading.slug)).toHaveLength(reading.connections.length);
    }
  });

  it('accepts the same chapter contract for people, events, institutions, periods and concepts', () => {
    for (const kind of ['pessoa', 'acontecimento', 'instituicao', 'periodo', 'conceito'] as const) {
      const page = ideologyDraft({
        slug: `leitura-${kind}`,
        title: kind,
        kind,
        classificationNote: 'n',
        atlasId: 'a',
      });
      expect(ideologyPageSchema.safeParse(page).success).toBe(true);
    }
  });

  it('drops unpublished targets instead of rendering a broken route', () => {
    expect(connectionsOf('inexistente')).toEqual([]);
  });
});
