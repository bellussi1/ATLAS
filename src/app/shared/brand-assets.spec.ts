import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

describe('brand assets', () => {
  it('provides self-contained vector signatures and root-relative page icons', () => {
    const index = new DOMParser().parseFromString(readFileSync(resolve('src/index.html'), 'utf8'), 'text/html');
    const icons = index.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]');
    expect(icons.length).toBeGreaterThan(1);
    for (const icon of icons) {
      const href = icon.getAttribute('href')!;
      expect(href.startsWith('/')).toBe(true);
      expect(existsSync(resolve('public', href.slice(1)))).toBe(true);
    }
    for (const filename of readdirSync(resolve('public/brand')).filter((name) => name.endsWith('.svg'))) {
      const source = readFileSync(resolve('public/brand', filename), 'utf8');
      const svg = new DOMParser().parseFromString(source, 'image/svg+xml');
      expect(svg.querySelector('parsererror')).toBeNull();
      expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
      expect(svg.querySelector('script, image, text')).toBeNull();
    }
  });

  it('includes valid ICO directory entries with PNG data at small icon sizes', () => {
    const ico = readFileSync(resolve('public/favicon.ico'));
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);
    for (let index = 0; index < ico.readUInt16LE(4); index++) {
      const entry = 6 + index * 16;
      const size = ico[entry];
      expect([16, 32, 48]).toContain(size);
      expect(ico[entry + 1]).toBe(size);
      const bytes = ico.readUInt32LE(entry + 8);
      const offset = ico.readUInt32LE(entry + 12);
      expect(offset + bytes).toBeLessThanOrEqual(ico.length);
      const png = ico.subarray(offset, offset + bytes);
      expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect(png.readUInt32BE(16)).toBe(size);
      expect(png.readUInt32BE(20)).toBe(size);
    }
  });
});
