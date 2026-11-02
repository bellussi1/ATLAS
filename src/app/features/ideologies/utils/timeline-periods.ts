const numerals: readonly (readonly [number, string])[] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function romanNumeral(value: number): string {
  let rest = value;
  let text = '';
  for (const [amount, symbol] of numerals) {
    while (rest >= amount) {
      text += symbol;
      rest -= amount;
    }
  }
  return text;
}

/** Centuries group dates that are often approximate; exact years stay in each record. */
export function centuryLabel(year: number): string {
  if (year < 1) return 'Antes da era cristã';
  return `Século ${romanNumeral(Math.ceil(year / 100))}`;
}
