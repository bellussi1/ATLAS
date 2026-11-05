import { entityMedia } from '@core/content/media/asset-license';
import type { Atlas, KnowledgeGraph } from '@core/content/models/content-schema';
import { type IconKind, iconKind } from '@shared/ui/kind-icon/kind-icon.component';

import {
  composeMosaic,
  type MosaicMotif,
  type MosaicPalette,
  type MosaicTile,
} from '../geometric-mosaic/mosaic-tiles';

/** Side of the generated composition, in tiles. */
export const ILLUSTRATION_SIZE = 3;

/** Motif at the centre of the composition: it signals the kind of record, never its content. */
const centreByKind: Record<IconKind, MosaicMotif> = {
  person: 'disc',
  activist: 'disc',
  politician: 'disc',
  work: 'stripes',
  thesis: 'stripes',
  concept: 'ring',
  event: 'burst',
  place: 'arcs',
  ideology: 'quarter',
  party: 'triangle',
  institution: 'checker',
  polity: 'half',
  record: 'eye',
};

const palettes: Record<string, MosaicPalette> = {
  marx: 'marx',
  marxismo: 'marx',
  liberal: 'liberal',
  liberalismo: 'liberal',
  liberalism: 'liberal',
  anarquismo: 'anarquismo',
  'social-democracia': 'social-democracia',
  conservadorismo: 'conservadorismo',
  fascismo: 'fascismo',
  libertarianismo: 'libertarianismo',
  nacionalismo: 'nacionalismo',
  ecologismo: 'ecologismo',
  feminismo: 'feminismo',
};

/** Stable 32-bit hash (FNV-1a), so the same record always gets the same drawing. */
export function illustrationSeed(id: string, kind: string): number {
  let hash = 0x811c9dc5;
  for (const char of `${kind}:${id}`) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** Palette of the tradition an atlas belongs to, from its id; the neutral atlas palette otherwise. */
export function illustrationPalette(atlasId: string | null | undefined): MosaicPalette {
  const id = (atlasId ?? '').replace(/^atlas-/, '');
  const key = Object.keys(palettes).find((name) => id === name || id.startsWith(`${name}-`));
  return key ? palettes[key] : 'atlas';
}

/**
 * Deterministic geometric composition for a record without a free picture: same id, kind and
 * palette give the same tiles. Pure; no licence to credit.
 */
export function composeIllustration(
  id: string,
  kind: string,
  palette: MosaicPalette = 'atlas',
): MosaicTile[] {
  const tiles = composeMosaic(
    ILLUSTRATION_SIZE,
    ILLUSTRATION_SIZE,
    palette,
    illustrationSeed(id, iconKind(kind)),
  );
  const centre = Math.floor((ILLUSTRATION_SIZE * ILLUSTRATION_SIZE) / 2);
  return tiles.map((tile, index) =>
    index === centre ? { ...tile, motif: centreByKind[iconKind(kind)] } : tile,
  );
}

/** An illustration is the fallback only: it never replaces a licensed picture. */
export function needsIllustration(graph: KnowledgeGraph, id: string): boolean {
  return !entityMedia(graph, { id });
}

/** Atlas in which the entity is declared, for choosing its palette. */
export function atlasOf(graph: KnowledgeGraph, id: string): Atlas | undefined {
  return graph.atlases.find((atlas) => atlas.entities.some((entity) => entity.id === id));
}
