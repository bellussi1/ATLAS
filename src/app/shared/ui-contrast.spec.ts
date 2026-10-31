import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/styles.scss'), 'utf8');
const tokens = Object.fromEntries(
  [...source.matchAll(/--([\w-]+):\s*(#[\da-fA-F]{6});/g)].map(([, name, value]) => [name, value]),
);

function luminance(color: string): number {
  const channels = color.match(/[\da-f]{2}/gi)!.map((value) => parseInt(value, 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string): number {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('semantic design token contrast', () => {
  it.each([
    ['color-ink', 'color-canvas', 4.5],
    ['color-ink-muted', 'color-canvas', 4.5],
    ['color-accent', 'color-canvas', 4.5],
    ['color-focus', 'color-surface', 3],
    ['color-info', 'color-info-surface', 4.5],
    ['color-success', 'color-success-surface', 4.5],
    ['color-warning', 'color-warning-surface', 4.5],
    ['color-danger', 'color-danger-surface', 4.5],
    ['color-on-strong-surface', 'color-accent', 4.5],
    ['color-on-strong-surface', 'color-accent-hover', 4.5],
    ['color-on-strong-surface', 'color-cartographic', 4.5],
    ['color-on-strong-surface', 'color-archive', 4.5],
  ])('%s on %s meets its documented contrast minimum', (foreground, background, minimum) => {
    expect(tokens[foreground]).toBeDefined();
    expect(tokens[background]).toBeDefined();
    expect(contrast(tokens[foreground], tokens[background])).toBeGreaterThanOrEqual(minimum);
  });
});
