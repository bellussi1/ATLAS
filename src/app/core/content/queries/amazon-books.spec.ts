import { amazonBookLink } from './amazon-books';

describe('amazonBookLink', () => {
  it('ignores records that are not books', () => {
    expect(amazonBookLink('futebol', 'Futebol')).toBeNull();
    expect(amazonBookLink('ciencia-politica', 'Ciência política')).toBeNull();
  });

  it('searches the record title and author in the books department', () => {
    const link = amazonBookLink('o-capital', 'O Capital', '');
    expect(link).not.toBeNull();
    const query = new URL(link!.url).searchParams;
    expect(link!.url.startsWith('https://www.amazon.com.br/s?')).toBe(true);
    expect(query.get('k')).toBe('O Capital Karl Marx');
    expect(query.get('i')).toBe('stripbooks');
    expect(query.get('tag')).toBeNull();
    expect(link!.affiliate).toBe(false);
  });

  it('uses the record title instead of a hard-coded one', () => {
    const link = amazonBookLink('o-principe', 'O Príncipe', '');
    expect(new URL(link!.url).searchParams.get('k')).toBe('O Príncipe Nicolau Maquiavel');
  });

  it('only marks and tags the link when a tag is configured', () => {
    const link = amazonBookLink('o-capital', 'O Capital', 'atlas-20');
    expect(link!.affiliate).toBe(true);
    expect(new URL(link!.url).searchParams.get('tag')).toBe('atlas-20');
  });
});
