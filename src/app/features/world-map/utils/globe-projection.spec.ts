import {
  clipRingToHorizon,
  createGlobeCamera,
  hitTestCountry,
  type HitTestCountryPolygon,
  placeGlobeLabels,
  projectGeodesicArc,
  projectPoint,
  slerpLonLat,
  toUnitVector,
  unprojectScreen,
} from './globe-projection';

function packRing(points: readonly (readonly [number, number])[]): Float32Array {
  const out = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    const v = toUnitVector(points[i][1], points[i][0]);
    out[i * 3] = v.x;
    out[i * 3 + 1] = v.y;
    out[i * 3 + 2] = v.z;
  }
  return out;
}

describe('globe projection engine', () => {
  it('round-trips orthographic projectPoint and unprojectScreen for front-hemisphere points', () => {
    const cam = createGlobeCamera(-20, 12, 500, 350, 260);
    const samples = [
      { lat: -14.235, lon: -51.925 },
      { lat: 51.165, lon: 10.451 },
      { lat: -33.924, lon: 18.424 },
      { lat: 12, lon: -20 },
    ];

    for (const sample of samples) {
      const pt = projectPoint(toUnitVector(sample.lat, sample.lon), cam);
      expect(pt.visible).toBe(true);
      const back = unprojectScreen(pt.x, pt.y, cam);
      expect(back).not.toBeNull();
      expect(back!.lat).toBeCloseTo(sample.lat, 5);
      expect(back!.lon).toBeCloseTo(sample.lon, 5);
    }

    expect(unprojectScreen(500 + 265, 350, cam)).toBeNull();
    expect(projectPoint(toUnitVector(0, 160), cam).visible).toBe(false);
  });

  it('clips horizon-crossing polygons smoothly along the limb radius without interior chords', () => {
    const cam = createGlobeCamera(0, 0, 400, 300, 200);
    // Ring straddling the +/-90 deg horizon limb
    const ring: [number, number][] = [
      [70, 25],
      [110, 25],
      [110, -25],
      [70, -25],
    ];
    const clipped = clipRingToHorizon(packRing(ring), cam);
    expect(clipped.length).toBeGreaterThan(6);

    for (const pt of clipped) {
      const normDist = Math.hypot((pt.x - cam.cx) / cam.radius, (pt.y - cam.cy) / cam.radius);
      expect(normDist).toBeLessThanOrEqual(1.001);
    }

    const backRing: [number, number][] = [
      [150, 15],
      [170, 15],
      [170, -15],
      [150, -15],
    ];
    expect(clipRingToHorizon(packRing(backRing), cam)).toEqual([]);
  });

  it('projects elevated 3D geodesic arcs with hemisphere occlusion behind the globe', () => {
    const cam = createGlobeCamera(-30, 10, 500, 400, 250);
    const shortArc = projectGeodesicArc(toUnitVector(-15, -47), toUnitVector(48, 2), cam);
    expect(shortArc.elevatedSegments.length).toBe(1);
    expect(shortArc.endArrow).not.toBeNull();

    const hiddenArc = projectGeodesicArc(toUnitVector(10, 145), toUnitVector(12, 155), cam);
    expect(hiddenArc.elevatedSegments).toEqual([]);
    expect(hiddenArc.shadowSegments).toEqual([]);
    expect(hiddenArc.endArrow).toBeNull();
  });

  it('performs bbox + ray-cast hit testing including unwrapped antimeridian rings and enclaves', () => {
    const countries: HitTestCountryPolygon[] = [
      {
        isoNumeric: '076',
        bbox: [-74, -34, -34, 5],
        rings: [
          [
            [-74, 5],
            [-34, 5],
            [-34, -34],
            [-74, -34],
          ],
        ],
      },
      {
        isoNumeric: '426',
        bbox: [27, -30.7, 29.5, -28.5],
        rings: [
          [
            [27, -28.5],
            [29.5, -28.5],
            [29.5, -30.7],
            [27, -30.7],
          ],
        ],
      },
      {
        isoNumeric: '710',
        bbox: [16, -35, 33, -22],
        rings: [
          [
            [16, -22],
            [33, -22],
            [33, -35],
            [16, -35],
          ],
        ],
      },
      {
        isoNumeric: '643',
        bbox: [27, 41, 191, 78],
        rings: [
          [
            [27, 78],
            [191, 78],
            [191, 41],
            [27, 41],
          ],
        ],
      },
    ];

    expect(hitTestCountry(-50, -15, countries)).toBe('076');
    expect(hitTestCountry(28, -29.5, countries)).toBe('426');
    expect(hitTestCountry(-175, 65, countries)).toBe('643');
    expect(hitTestCountry(-160, 0, countries)).toBeNull();
  });

  it('places non-overlapping labels avoiding floating panel rectangles and interpolates SLERP routes', () => {
    const placed = placeGlobeLabels(
      [
        {
          territoryId: 'country-brazil',
          title: 'Brasil',
          screenX: 480,
          screenY: 360,
          z: 0.9,
          priority: 'selected',
          score: 100000,
        },
        {
          territoryId: 'country-blocked',
          title: 'Bloqueado pela legenda',
          screenX: 120,
          screenY: 300,
          z: 0.85,
          priority: 'active',
          score: 500,
        },
      ],
      { left: 0, top: 0, right: 1280, bottom: 800 },
      [{ left: 12, top: 80, right: 320, bottom: 520 }],
      18,
    );

    expect(placed.map((p) => p.territoryId)).toEqual(['country-brazil']);

    const mid = slerpLonLat(-50, -15, 10, 50, 0.5);
    expect(mid.lon).toBeGreaterThan(-50);
    expect(mid.lon).toBeLessThan(10);
    expect(mid.lat).toBeGreaterThan(-15);
    expect(mid.lat).toBeLessThan(50);
  });
});
