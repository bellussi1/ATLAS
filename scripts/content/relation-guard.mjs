// Travas determinísticas aplicadas às respostas do modelo local sobre relações.

const AGENTS = new Set(['person', 'party', 'institution', 'ideology']);
const IDEAS = new Set(['ideology', 'concept']);
/** Pontas que dão peso histórico próprio a uma relação. */
const SUBSTANTIVE = new Set(['person', 'party', 'ideology', 'event', 'work']);
/**
 * Trava determinística sobre a resposta do modelo: a categoria precisa ser coerente com os
 * tipos das pontas, e a seta é orientada pelos tipos quando eles a determinam.
 */
export function guardDecision(decision, fromKind, toKind, from = null, to = null) {
  if (decision === 'omit') return 'omit';
  if (from && to && from.title.trim() === to.title.trim()) return 'omit';
  // Termos genéricos de uma palavra ("Poder", "Família", "Universidade") não qualificam ninguém.
  const generic = (entity) =>
    entity &&
    !['ideology', 'person', 'place', 'party'].includes(entity.kind) &&
    !/\s/.test(entity.title.trim());
  if (generic(from) || generic(to)) return 'omit';
  const [family, flag] = decision.split(':');
  let reverse = flag === 'reverse';
  const kinds = [fromKind, toKind];
  const hasPlace = kinds.includes('place');
  // Pares só de conceitos, instituições ou lugares raramente explicam um vínculo histórico.
  if (
    family !== 'location' &&
    family !== 'continuity' &&
    !kinds.some((kind) => SUBSTANTIVE.has(kind))
  )
    return 'omit';
  const orient = (wantTarget) => {
    if (wantTarget(toKind) && !wantTarget(fromKind)) return false;
    if (wantTarget(fromKind) && !wantTarget(toKind)) return true;
    return reverse;
  };
  switch (family) {
    case 'location':
      if (!hasPlace) return 'omit';
      reverse =
        fromKind === 'place' && toKind === 'place' ? false : orient((kind) => kind === 'place');
      break;
    case 'rupture':
    case 'influenced':
      if (hasPlace) return 'omit';
      break;
    case 'participation':
      if (IDEAS.has(toKind) || IDEAS.has(fromKind))
        return guardDecision('affiliation', fromKind, toKind, from, to);
      if (generic(from) || generic(to)) return 'omit';
      reverse = orient(
        (kind) =>
          kind === 'institution' || kind === 'party' || kind === 'event' || kind === 'place',
      );
      if (
        !kinds.some(
          (kind) =>
            kind === 'person' || kind === 'party' || kind === 'institution' || kind === 'place',
        )
      )
        return 'omit';
      break;
    case 'creation':
      if (hasPlace) return guardDecision('location', fromKind, toKind, from, to);
      if (!kinds.some((kind) => AGENTS.has(kind))) return 'omit';
      reverse = orient(
        (kind) =>
          kind === 'work' || kind === 'institution' || kind === 'party' || kind === 'concept',
      );
      break;
    case 'affiliation':
      if (fromKind === 'place' && toKind === 'place') return 'omit';
      if (generic(from) || generic(to)) return 'omit';
      if (kinds.includes('person') && kinds.includes('concept')) return 'omit';
      reverse = orient((kind) => IDEAS.has(kind) || kind === 'party');
      break;
    case 'continuity':
      if (hasPlace && fromKind !== toKind) return 'omit';
      break;
    default:
      return 'omit';
  }
  return reverse ? `${family}:reverse` : family;
}
