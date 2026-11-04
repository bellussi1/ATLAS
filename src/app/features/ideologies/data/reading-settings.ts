import type { MosaicPalette } from '@shared/ui/geometric-mosaic/mosaic-tiles';

/** Presentation that belongs to one reading: its mosaic palette and the reading it points to next. */
export interface ReadingSettings {
  palette: MosaicPalette;
  companion: { path: string; label: string };
}

/** Used by any reading without its own entry, so a new tradition never inherits another one's palette. */
export const defaultReadingSettings: ReadingSettings = {
  palette: 'atlas',
  companion: { path: '/conhecimento', label: 'Explorar o acervo' },
};

export const readingSettings: Readonly<Record<string, ReadingSettings | undefined>> = {
  marxismo: { palette: 'marx', companion: { path: '/liberalismo', label: 'Ler o Liberalismo' } },
  liberalismo: { palette: 'liberal', companion: { path: '/marxismo', label: 'Ler o Marxismo' } },
  'social-democracia': {
    palette: 'social',
    companion: { path: '/marxismo', label: 'Ler o Marxismo' },
  },
  anarquismo: { palette: 'anarco', companion: { path: '/marxismo', label: 'Ler o Marxismo' } },
};

export function readingSettingsFor(slug: string | undefined): ReadingSettings {
  return (slug && readingSettings[slug]) || defaultReadingSettings;
}
