import { mirrorIndexSchema, mirrorSlot } from './mirror-index';

describe('mirror index', () => {
  it('derives a stable slot per address', () => {
    const address =
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b4/Chapel.jpg/960px-Chapel.jpg';
    expect(mirrorSlot(address)).toBe(mirrorSlot(address));
    expect(mirrorSlot(address)).not.toBe(mirrorSlot(`${address}?x=1`));
    expect(mirrorSlot(address)).toMatch(/^[a-z0-9]+$/);
  });

  it('accepts a well-formed index and rejects a malformed object name', () => {
    const entry = `${'a'.repeat(64)}.jpg`;
    expect(mirrorIndexSchema.parse({ schemaVersion: 1, entries: { abc: entry } })).toBeTruthy();
    expect(() =>
      mirrorIndexSchema.parse({ schemaVersion: 1, entries: { abc: 'not-a-hash.jpg' } }),
    ).toThrow();
  });
});
