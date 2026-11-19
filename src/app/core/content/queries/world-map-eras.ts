/** Historical windows offered by the world map timeline and linked from the home page. */
export interface WorldMapEraPreset {
  readonly id: string;
  readonly label: string;
  readonly yearFrom: number | null;
  readonly yearTo: number | null;
  readonly note: string;
}

export const WORLD_MAP_ERA_PRESETS: readonly WorldMapEraPreset[] = [
  {
    id: 'all',
    label: 'Todo o acervo',
    yearFrom: null,
    yearTo: null,
    note: 'Exibe todos os territórios, regimes e vínculos georreferenciados.',
  },
  {
    id: '1789-1914',
    label: '1789–1914',
    yearFrom: 1789,
    yearTo: 1914,
    note: 'Revoluções liberais, industrialização, impérios e movimentos operários.',
  },
  {
    id: '1914-1945',
    label: '1914–1945',
    yearFrom: 1914,
    yearTo: 1945,
    note: 'Entreguerras, ascensão totalitária, Era Vargas e Guerras Mundiais.',
  },
  {
    id: '1945-1991',
    label: '1945–1991',
    yearFrom: 1945,
    yearTo: 1991,
    note: 'Guerra Fria, descolonização, ditaduras latino-americanas e Estado social.',
  },
  {
    id: '1988-2026',
    label: '1988–2026',
    yearFrom: 1988,
    yearTo: 2026,
    note: 'Pós-Guerra Fria, redemocratização brasileira e ordem contemporânea.',
  },
];
