import { centuryLabel, romanNumeral } from './timeline-periods';

describe('timeline periods', () => {
  it('writes centuries in roman numerals', () => {
    expect(romanNumeral(1)).toBe('I');
    expect(romanNumeral(19)).toBe('XIX');
    expect(romanNumeral(21)).toBe('XXI');
  });

  it('groups years by century, closing each century on its hundredth year', () => {
    expect(centuryLabel(1818)).toBe('Século XIX');
    expect(centuryLabel(1800)).toBe('Século XVIII');
    expect(centuryLabel(1801)).toBe('Século XIX');
    expect(centuryLabel(1)).toBe('Século I');
  });

  it('keeps years before the common era in their own group', () => {
    expect(centuryLabel(-44)).toBe('Antes da era cristã');
  });
});
