// Conferência literal de citações dos rascunhos de enriquecimento contra o corpus local.

/** Accent-, case-, markdown- and whitespace-insensitive form used for literal matching. */
export function normalizeText(value) {
  return (
    String(value ?? '')
      .replace(/\[\[\d+\]\]\([^)]*\)/g, ' ')
      .replace(/\]\([^)]*\)/g, ']')
      .replace(/[[\]*_`]/g, ' ')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLocaleLowerCase('pt-BR')
      // Punctuation and quote styles vary between the model's copy and the markdown.
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
  );
}

/** A title counts when its full normalized form (minus a parenthetical) is in the quote. */
export function namesEntity(quote, title) {
  const bare = normalizeText(title.replace(/\s*\([^)]*\)\s*$/, ''));
  if (bare.length < 3) return false;
  const stem = bare.replace(/(s|es)$/, '');
  return quote.includes(bare) || (stem.length >= 6 && quote.includes(stem));
}
