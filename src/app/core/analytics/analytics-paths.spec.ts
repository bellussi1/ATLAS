import { describe, expect, it } from 'vitest';

import { clickPath, trackedPath } from './analytics-paths';

describe('analytics paths', () => {
  it('normalizes trailing slashes and keeps the query string', () => {
    expect(trackedPath('/leitura/marxismo/')).toBe('/leitura/marxismo');
    expect(trackedPath('/leitura/marxismo/', '?x=1')).toBe('/leitura/marxismo?x=1');
    expect(trackedPath('/')).toBe('/');
  });

  it('classifies internal, external and custom clicks without page text', () => {
    expect(clickPath('https://atlas.test/leitura/marxismo/', 'https://atlas.test')).toBe(
      'click:/leitura/marxismo',
    );
    expect(clickPath('https://github.com/bellussi1/ATLAS', 'https://atlas.test')).toBe(
      'click:github.com',
    );
    expect(clickPath('https://atlas.test/acervo', 'https://atlas.test', 'abrir-acervo')).toBe(
      'click:abrir-acervo',
    );
    expect(clickPath('mailto:a@b.test', 'https://atlas.test')).toBeNull();
  });
});
