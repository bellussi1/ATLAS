import { companionOf, ideologyReadings, paletteOf } from '@ideologies/data/ideology-readings';
import { publishedIdeologies } from '@ideologies/data/published-ideologies';
import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';
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
});
