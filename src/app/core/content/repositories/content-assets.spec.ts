import { contentBaseHref } from './content-assets';

describe('contentBaseHref', () => {
  it('keeps an absolute base and adds the trailing slash', () => {
    expect(contentBaseHref('https://cdn.example/atlas', 'http://127.0.0.1:4305/')).toBe(
      'https://cdn.example/atlas/',
    );
  });

  it('resolves the path-only local preview base against the page origin', () => {
    const base = contentBaseHref('/content', 'http://127.0.0.1:4305/itinerario/x/');
    expect(base).toBe('http://127.0.0.1:4305/content/');
    expect(new URL('pointer.json', base).href).toBe('http://127.0.0.1:4305/content/pointer.json');
  });
});
