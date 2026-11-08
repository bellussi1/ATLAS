import {
  LABEL_HEIGHT,
  labelBudget,
  type LabelCandidate,
  labelTierFor,
  labelWidth,
  placeLabels,
  shortenLabel,
  spreadCandidates,
  stableLabelTier,
} from './network-labels';

const candidate = (id: string, x: number, y: number, priority = 0): LabelCandidate => ({
  id,
  text: `Nó ${id}`,
  x,
  y,
  radius: 8,
  priority,
});

describe('placeLabels', () => {
  it('puts a lone label to the right of its node', () => {
    const [label] = placeLabels(
      [candidate('a', 100, 100)],
      [{ id: 'a', x: 100, y: 100, radius: 8 }],
    );
    expect(label.anchor).toBe('start');
    expect(label.dx).toBeGreaterThan(8);
  });

  it('finds obstacles that straddle cell boundaries', () => {
    const [label] = placeLabels(
      [candidate('a', 100, 100)],
      [{ id: 'b', x: 140, y: 100, radius: 20 }],
    );
    expect(label.anchor).not.toBe('start');
  });

  it('never overlaps two labels or a label and another node', () => {
    const nodes = Array.from({ length: 40 }, (_, i) => ({
      id: `n${i}`,
      x: 40 + (i % 8) * 38,
      y: 40 + Math.floor(i / 8) * 30,
      radius: 8,
    }));
    const placed = placeLabels(
      nodes.map((n, i) => ({ ...candidate(n.id, n.x, n.y, i), text: `Verbete ${i}` })),
      nodes,
    );
    expect(placed.length).toBeGreaterThan(0);
    const boxes = placed.map((label) => {
      const node = nodes.find((n) => n.id === label.id)!;
      const width = labelWidth(label.text);
      const x = node.x + label.dx;
      const left =
        label.anchor === 'start' ? x : label.anchor === 'end' ? x - width : x - width / 2;
      return {
        id: label.id,
        left,
        right: left + width,
        top: node.y + label.dy - LABEL_HEIGHT / 2,
        bottom: node.y + label.dy + LABEL_HEIGHT / 2,
      };
    });
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        expect(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top).toBe(
          false,
        );
      }
    for (const box of boxes)
      for (const node of nodes.filter((n) => n.id !== box.id)) {
        const nx = Math.max(box.left, Math.min(node.x, box.right));
        const ny = Math.max(box.top, Math.min(node.y, box.bottom));
        expect(Math.hypot(node.x - nx, node.y - ny)).toBeGreaterThanOrEqual(node.radius);
      }
  });

  it('drops a label that fits nowhere unless it is forced', () => {
    const crowd = [
      { id: 'a', x: 50, y: 50, radius: 40 },
      { id: 'b', x: 50, y: 50, radius: 40 },
    ];
    expect(placeLabels([candidate('a', 50, 50)], crowd)).toEqual([]);
    expect(placeLabels([{ ...candidate('a', 50, 50), forced: true }], crowd)).toHaveLength(1);
  });

  it('gives higher priority the spot when two labels compete', () => {
    const nodes = [
      { id: 'a', x: 100, y: 100, radius: 8 },
      { id: 'b', x: 100, y: 108, radius: 8 },
    ];
    const placed = placeLabels([candidate('b', 100, 108, 2), candidate('a', 100, 100, 1)], nodes);
    expect(placed[0].id).toBe('a');
  });

  it('uses a diagonal spot when the four sides are blocked', () => {
    const nodes = [
      { id: 'a', x: 100, y: 100, radius: 8 },
      { id: 'b', x: 150, y: 110, radius: 8 },
      { id: 'c', x: 150, y: 130, radius: 8 },
      { id: 'd', x: 100, y: 125, radius: 8 },
      { id: 'e', x: 100, y: 75, radius: 8 },
      { id: 'f', x: 50, y: 100, radius: 8 },
      { id: 'g', x: 50, y: 120, radius: 8 },
      { id: 'h', x: 50, y: 80, radius: 8 },
    ];
    const [label] = placeLabels([{ ...candidate('a', 100, 100), text: 'Diagonal' }], nodes);
    expect(label.anchor).toBe('start');
    expect(label.dy).toBeLessThan(0);
  });

  it('keeps labels inside the visible bounds by choosing another side', () => {
    const nodes = [{ id: 'a', x: 280, y: 100, radius: 8 }];
    const bounds = { left: 0, top: 0, right: 310, bottom: 200 };
    const [label] = placeLabels([candidate('a', 280, 100)], nodes, Infinity, bounds);
    expect(label.anchor).not.toBe('start');
    const tiny = { left: 0, top: 0, right: 250, bottom: 110 };
    expect(placeLabels([candidate('a', 280, 100)], nodes, Infinity, tiny)).toEqual([]);
  });
});

describe('semantic zoom labels', () => {
  it('keeps the tier stable around the thresholds', () => {
    expect(labelTierFor(1)).toBe('global');
    expect(labelTierFor(2)).toBe('middle');
    expect(labelTierFor(4)).toBe('local');
    expect(stableLabelTier(1.7, 'global')).toBe('global');
    expect(stableLabelTier(1.8, 'global')).toBe('middle');
    expect(stableLabelTier(1.5, 'middle')).toBe('middle');
    expect(stableLabelTier(1.4, 'middle')).toBe('global');
    expect(stableLabelTier(3.3, 'middle')).toBe('middle');
    expect(stableLabelTier(3.6, 'middle')).toBe('local');
    expect(stableLabelTier(3.1, 'local')).toBe('local');
    expect(stableLabelTier(2.9, 'local')).toBe('middle');
  });

  it('names fewer references globally and more when close', () => {
    expect(labelBudget('global')).toBeLessThan(labelBudget('middle'));
    expect(labelBudget('middle')).toBeLessThan(labelBudget('local'));
  });

  it('shortens on a word boundary and never cuts a word', () => {
    expect(shortenLabel('Revolução de 1930', 30)).toBe('Revolução de 1930');
    expect(shortenLabel('Revolução de 1930 no Brasil', 20)).toBe('Revolução de 1930…');
    expect(shortenLabel('Palavra', 4)).toBe('Pal…');
  });

  it('spreads labels across areas before filling the best community', () => {
    const many = Array.from({ length: 20 }, (_, index) => ({
      ...candidate(`dense-${index}`, 60, 60, index),
      text: `Denso ${index}`,
    }));
    const sparse = [
      { ...candidate('left', 20, 240, 2), text: 'Esquerda' },
      { ...candidate('left-2', 20, 200, 10), text: 'Esquerda 2' },
      { ...candidate('right', 360, 240, 3), text: 'Direita' },
      { ...candidate('centre', 200, 280, 4), text: 'Centro' },
    ];
    const chosen = spreadCandidates([...many, ...sparse], 6, { width: 400, height: 300 });
    expect(chosen).toHaveLength(6);
    expect(chosen[0].id).toBe('dense-0');
    expect(chosen.map((item) => item.id)).toEqual(
      expect.arrayContaining(['left', 'right', 'centre']),
    );
    // At most three labels share the crowded cell (cap = ceil(6 / 12) + 1).
    const dense = chosen.filter((item) => item.id.startsWith('dense-'));
    expect(dense.length).toBeLessThanOrEqual(3);
    expect(spreadCandidates([...many, ...sparse], 6, { width: 400, height: 300 })).toEqual(chosen);
  });
});
