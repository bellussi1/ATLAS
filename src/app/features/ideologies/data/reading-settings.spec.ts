import { defaultReadingSettings, readingSettingsFor } from './reading-settings';

describe('reading settings', () => {
  it('keeps the published palettes and companions of marxismo and liberalismo', () => {
    expect(readingSettingsFor('marxismo')).toEqual({
      palette: 'marx',
      companion: { path: '/liberalismo', label: 'Ler o Liberalismo' },
    });
    expect(readingSettingsFor('liberalismo')).toEqual({
      palette: 'liberal',
      companion: { path: '/marxismo', label: 'Ler o Marxismo' },
    });
  });

  it('gives each drafted reading its own palette', () => {
    expect(readingSettingsFor('social-democracia').palette).toBe('social');
    expect(readingSettingsFor('anarquismo').palette).toBe('anarco');
    expect(new Set(['marx', 'liberal', 'social', 'anarco']).size).toBe(4);
  });

  it('gives a reading without its own entry the house palette, never another tradition’s', () => {
    expect(readingSettingsFor('fascismo')).toBe(defaultReadingSettings);
    expect(defaultReadingSettings.palette).toBe('atlas');
    expect(readingSettingsFor(undefined)).toBe(defaultReadingSettings);
  });
});
