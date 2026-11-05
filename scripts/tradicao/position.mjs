/**
 * Posição política segundo o verbete: lida por regra na abertura do artigo, com a frase literal.
 * Não é rótulo do projeto nem opinião: é o que a fonte diz de si mesma, e só quando diz. Sem
 * modelo e sem custo; o que a regra não encontra fica sem posição (a maioria dos conceitos
 * históricos, que não se situam no eixo).
 */

/** Lista fechada. Ordem importa: as formas compostas saem do texto antes das simples. */
export const positions = [
  {
    value: 'extrema-direita',
    label: 'extrema direita',
    pattern: /extrema[- ]direita|ultradireita|direita radical/g,
  },
  {
    value: 'extrema-esquerda',
    label: 'extrema esquerda',
    pattern: /extrema[- ]esquerda|ultraesquerda|esquerda radical/g,
  },
  { value: 'centro-esquerda', label: 'centro-esquerda', pattern: /centro[- ]esquerda/g },
  { value: 'centro-direita', label: 'centro-direita', pattern: /centro[- ]direita/g },
  {
    value: 'esquerda',
    label: 'esquerda',
    pattern: /(?<!\p{L})(?:de|da|à|a) esquerda(?!\p{L})|esquerdista|esquerda pol[ií]tica/gu,
  },
  {
    value: 'direita',
    label: 'direita',
    pattern: /(?<!\p{L})(?:de|da|à|a) direita(?!\p{L})|direitista|direita pol[ií]tica/gu,
  },
  {
    value: 'centro',
    label: 'centro',
    pattern: /centrista|(?<!\p{L})(?:de|do) centro(?!\p{L})|centrismo/gu,
  },
];

/** Frases do texto, sem partir em abreviações comuns. */
export const sentences = (text) =>
  text
    .split(/\n+/)
    .flatMap((paragraph) => paragraph.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);

/** Valores citados em uma frase, depois de tirar as formas compostas do caminho das simples. */
export function valuesIn(sentence) {
  let rest = sentence.toLowerCase();
  const found = [];
  for (const { value, pattern } of positions) {
    const matches = rest.match(pattern);
    if (!matches) continue;
    found.push(value);
    rest = rest.replace(pattern, ' ');
  }
  return found;
}

/**
 * Posição que o verbete atribui ao tema, ou `null`. Vale a primeira frase da abertura (seção 0)
 * que cita o eixo; se ela cita mais de um valor ("de esquerda e de direita") o resultado é
 * `variavel`, para não escolher por conta própria.
 */
export function positionFromArticle(article, { leadSentences = 4 } = {}) {
  const lead = article.sections?.find((section) => section.index === 0) ?? article.sections?.[0];
  if (!lead?.text) return null;
  for (const sentence of sentences(lead.text).slice(0, leadSentences)) {
    const values = valuesIn(sentence);
    if (!values.length) continue;
    return {
      value: values.length === 1 ? values[0] : 'variavel',
      candidates: values,
      quote: sentence.slice(0, 300),
      url: article.url,
    };
  }
  return null;
}
