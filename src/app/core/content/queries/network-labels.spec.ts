import { LABEL_HEIGHT, type LabelCandidate, labelWidth, placeLabels } from './network-labels';

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

  it('keeps labels inside the visible bounds by choosing another side', () => {
    const nodes = [{ id: 'a', x: 280, y: 100, radius: 8 }];
    const bounds = { left: 0, top: 0, right: 310, bottom: 200 };
    const [label] = placeLabels([candidate('a', 280, 100)], nodes, Infinity, bounds);
    expect(label.anchor).not.toBe('start');
    const tiny = { left: 0, top: 0, right: 250, bottom: 110 };
    expect(placeLabels([candidate('a', 280, 100)], nodes, Infinity, tiny)).toEqual([]);
  });
});
