/** Original decorative tiles for the ATLAS poster language. They never encode data. */
export type MosaicPalette = 'atlas' | 'marx' | 'liberal' | 'tissi' | 'social' | 'anarco';

export type MosaicMotif =
  | 'quarter'
  | 'half'
  | 'disc'
  | 'ring'
  | 'triangle'
  | 'stripes'
  | 'dots'
  | 'arcs'
  | 'leaf'
  | 'checker'
  | 'burst'
  | 'eye';

export interface MosaicTile {
  readonly x: number;
  readonly y: number;
  readonly ground: string;
  readonly figure: string;
  readonly detail: string;
  readonly motif: MosaicMotif;
  readonly rotation: 0 | 90 | 180 | 270;
}

const colors = {
  red: 'var(--color-accent)',
  ink: 'var(--color-ink)',
  paper: 'var(--color-canvas)',
  ochre: 'var(--color-ochre-paper)',
  orange: 'var(--color-orange-paper)',
  rose: 'var(--color-rose-paper)',
  teal: 'var(--color-teal-paper)',
  indigo: 'var(--color-indigo)',
};

const palettes: Record<MosaicPalette, readonly string[]> = {
  atlas: [
    colors.red,
    colors.ink,
    colors.ochre,
    colors.paper,
    colors.teal,
    colors.rose,
    colors.indigo,
  ],
  marx: [colors.red, colors.ink, colors.ochre, colors.paper, colors.orange, colors.rose],
  liberal: [colors.indigo, colors.teal, colors.ochre, colors.paper, colors.rose, colors.ink],
  tissi: [colors.ink, colors.paper, colors.red, colors.paper],
  social: [colors.teal, colors.ochre, colors.paper, colors.orange, colors.ink],
  anarco: [colors.red, colors.ink, colors.paper, colors.rose, colors.ink, colors.red],
};

const motifs: readonly MosaicMotif[] = [
  'quarter',
  'half',
  'disc',
  'ring',
  'triangle',
  'stripes',
  'dots',
  'arcs',
  'leaf',
  'checker',
  'burst',
  'eye',
];

/** Small deterministic generator, so prerendered and hydrated markup match. */
function generator(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function composeMosaic(
  columns: number,
  rows: number,
  palette: MosaicPalette,
  seed: number,
): MosaicTile[] {
  const random = generator(seed);
  const swatches = palettes[palette];
  const pick = (avoid?: string) => {
    const options = avoid ? swatches.filter((color) => color !== avoid) : swatches;
    return options[Math.floor(random() * options.length)];
  };
  const tiles: MosaicTile[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const ground = pick();
      const figure = pick(ground);
      tiles.push({
        x,
        y,
        ground,
        figure,
        detail: pick(figure),
        motif: motifs[Math.floor(random() * motifs.length)],
        rotation: ([0, 90, 180, 270] as const)[Math.floor(random() * 4)],
      });
    }
  }
  return tiles;
}
