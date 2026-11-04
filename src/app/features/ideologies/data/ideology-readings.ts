import type { IdeologyPage } from '@ideologies/models/ideology-page.schema';
import type { MosaicPalette } from '@shared/ui/geometric-mosaic/mosaic-tiles';

export interface IdeologyReading {
  slug: string;
  label: string;
  metaDescription: string;
}

/**
 * Public readings, in reading order: routes and the "next reading" link derive from this list.
 * Publishing a reading adds one entry here and one in `published-ideologies.ts`.
 */
export const ideologyReadings: readonly IdeologyReading[] = [
  {
    slug: 'marxismo',
    label: 'Marxismo',
    metaDescription: 'Conceitos, pensadores, cronologia, divergências e fontes do marxismo.',
  },
  {
    slug: 'liberalismo',
    label: 'Liberalismo',
    metaDescription:
      'Conceitos, pensadores, épocas, lugares, vertentes, críticas e fontes do liberalismo.',
  },
];

/** Palette of snapshots released before `identity.palette` existed. */
const releasedPalettes: Readonly<Record<string, MosaicPalette | undefined>> = {
  marxismo: 'marx',
  liberalismo: 'liberal',
};

export function paletteOf(page: IdeologyPage): MosaicPalette {
  return page.identity.palette ?? releasedPalettes[page.slug] ?? 'atlas';
}

/** The reading after this one, wrapping around; none when it is the only one published. */
export function companionOf(slug: string): IdeologyReading | null {
  const index = ideologyReadings.findIndex((reading) => reading.slug === slug);
  const next = ideologyReadings[(index + 1) % ideologyReadings.length];
  return next && next.slug !== slug ? next : null;
}
