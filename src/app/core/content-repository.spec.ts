import { ContentRepository } from './content-repository';

describe('ContentRepository', () => {
  it('loads the structured ATLAS methodology from the static content bundle', () => {
    const repository = new ContentRepository();

    expect(repository.atlas.title).toBe('Metodologia do ATLAS');
    expect(repository.findBySlug('metodologia-do-atlas')?.title).toBe('Metodologia do ATLAS');
  });

  it('returns no record for an unknown slug', () => {
    const repository = new ContentRepository();

    expect(repository.findBySlug('slug-inexistente')).toBeUndefined();
  });
});
