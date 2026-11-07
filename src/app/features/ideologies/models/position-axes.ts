/**
 * Analytic axes of the positions layer. They are working definitions for comparing
 * how a tradition's thinkers and currents are read, not a verdict on anyone. Each
 * value runs from -1 (first pole) to +1 (second pole); 0 is mixed or undetermined.
 */
export const positionAxes = [
  {
    id: 'propriedade',
    label: 'Propriedade dos meios de produção',
    short: 'Propriedade',
    low: 'coletiva ou pública',
    high: 'privada',
  },
  {
    id: 'mercado',
    label: 'Coordenação da economia',
    short: 'Coordenação',
    low: 'planejamento central',
    high: 'mercado',
  },
  {
    id: 'igualdade',
    label: 'Prioridade entre igualdade e liberdade individual',
    short: 'Igualdade e liberdade',
    low: 'igualdade material',
    high: 'liberdade individual',
  },
  {
    id: 'poder',
    label: 'Limites ao poder do Estado',
    short: 'Limites do Estado',
    low: 'poder estatal ampliado',
    high: 'limites institucionais',
  },
  {
    id: 'escala',
    label: 'Escala da comunidade política',
    short: 'Escala política',
    low: 'internacionalismo',
    high: 'soberania nacional',
  },
  {
    id: 'revolucao',
    label: 'Método de mudança social',
    short: 'Mudança social',
    low: 'ruptura revolucionária',
    high: 'reforma gradual',
  },
] as const;

export type PositionAxisId = (typeof positionAxes)[number]['id'];

export const positionAxisIds = positionAxes.map((axis) => axis.id) as [
  PositionAxisId,
  ...PositionAxisId[],
];

export function positionAxis(id: PositionAxisId) {
  return positionAxes.find((axis) => axis.id === id)!;
}
