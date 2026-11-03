import { panelInset, readingEdge } from './panel-inset';

describe('panelInset', () => {
  it('asks for nothing when the free margin already holds the panel', () => {
    expect(panelInset(460, 1425, 900)).toBe(0);
  });

  it('asks only for what the free margin cannot hold', () => {
    // 1425 - 1100 = 325 free; 460 + 16 needed.
    expect(panelInset(460, 1425, 1100)).toBe(151);
  });

  it('falls back to the whole panel when the text reaches the edge', () => {
    expect(panelInset(410, 1000, 1000)).toBe(426);
    expect(panelInset(410, 1000, 1200)).toBe(426);
  });
});

describe('readingEdge', () => {
  afterEach(() => (document.body.innerHTML = ''));

  it('is null without a marked reading column', () => {
    document.body.innerHTML = '<main><p>Texto</p></main>';
    expect(readingEdge(document)).toBeNull();
  });

  it('ignores paragraphs outside the reading column and hidden ones', () => {
    document.body.innerHTML =
      '<div data-reading-column><p style="display:none">oculto</p></div><p>fora</p>';
    expect(readingEdge(document)).toBeNull();
  });

  function lay(rights: number[]): void {
    document.body.innerHTML = `<div data-reading-column>${rights.map(() => '<p>t</p>').join('')}</div>`;
    document.querySelectorAll('p').forEach((paragraph, index) => {
      vi.spyOn(paragraph, 'getBoundingClientRect').mockReturnValue({
        right: rights[index],
        width: 100,
      } as DOMRect);
    });
  }

  it('measures marked paragraphs', () => {
    lay([640]);
    expect(readingEdge(document)).toBe(640);
  });

  it('uses the typical paragraph, not a single wider one', () => {
    lay([900, 640, 640]);
    expect(readingEdge(document)).toBe(640);
  });
});
