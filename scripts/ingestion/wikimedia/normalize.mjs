export function titleKey(value) {
  return value
    .normalize('NFKC')
    .replaceAll('_', ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en');
}
export function claimItem(claim) {
  return claim?.mainsnak?.datavalue?.value?.id;
}
export function claimYear(claim) {
  const time = claim?.mainsnak?.datavalue?.value?.time;
  const match = time?.match(/[+-](\d{4,})-/);
  return match ? Number(match[1]) : null;
}

export function statementReferences(statement) {
  return (statement.references ?? [])
    .flatMap((reference) =>
      Object.entries(reference.snaks ?? {}).flatMap(([property, snaks]) =>
        snaks.flatMap((snak) => {
          const value = snak.datavalue?.value;
          if (typeof value === 'string') return [`${property}: ${value}`];
          if (value?.id) return [`${property}: ${value.id}`];
          if (value?.time) return [`${property}: ${value.time}`];
          if (value?.text) return [`${property}: ${value.text}`];
          return [];
        }),
      ),
    )
    .join('; ');
}

export function datesFor(item, kind) {
  const claims = item.claims ?? {};
  const starts =
    kind === 'person' ? claims.P569 : (claims.P580 ?? claims.P571 ?? claims.P577 ?? claims.P585);
  const ends = kind === 'person' ? claims.P570 : claims.P582;
  const startYear = starts?.map(claimYear).find((value) => value !== null) ?? null;
  const endYear = ends?.map(claimYear).find((value) => value !== null) ?? null;
  if (startYear === null && endYear === null) return null;
  return {
    startYear,
    endYear,
    precision: startYear !== null && endYear !== null ? 'range' : 'year',
    label: null,
  };
}

export function entityType(kind) {
  return kind;
}
