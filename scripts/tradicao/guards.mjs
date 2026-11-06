/**
 * Travas de código da extração. Nada aqui chama o modelo: toda resposta passa por estas regras
 * antes de virar rascunho, e cada item descartado sai com motivo, para a avaliação medir e para a
 * pessoa conferir. A trava existe para o modelo barato ser suficiente: citação é literal ou some,
 * relação tem tipo de lista fechada, direção e alvo nomeado no próprio trecho.
 */
import {
  normalizeText,
  relationDirections,
  relationNatures,
  richExtractionSchema,
  sectionKinds,
  verdicts,
} from './rich.mjs';

export const limits = {
  oneLine: 140,
  summary: 600,
  section: 500,
  quote: 300,
  sentence: 240,
  sections: 10,
  glossary: 20,
  relations: 12,
  dates: 12,
  claims: 12,
  /** Trecho curto demais é literal por acaso ("Karl Marx") e não sustenta nada. */
  minQuoteChars: 20,
  minQuoteWords: 3,
};

export { normalizeText };

export const stripAccents = (value) => value.normalize('NFD').replace(/\p{M}/gu, '');
const folded = (value) => stripAccents(normalizeText(value));

/** `null` when the quote holds; otherwise why it does not. */
export function quoteProblem(quote, normalizedSource) {
  const candidate = normalizeText(quote ?? '');
  if (candidate.length < limits.minQuoteChars) return 'citacao-curta';
  if (candidate.split(' ').length < limits.minQuoteWords) return 'citacao-curta';
  if (candidate.length > limits.quote) return 'citacao-longa';
  return normalizedSource.includes(candidate) ? null : 'citacao-nao-literal';
}

/** Palavras que precisam aparecer no trecho para o tipo ser aceito. Sobre texto sem acentos. */
const natureCues = {
  influenciou:
    /influen|inspir|discipul|seguidor|partidari|mentor|follower|disciple|adept|baseou|baseado em|based on|draw[ns]? on/,
  'participou-de':
    /particip|tomou parte|took part|integr|lider|led\b|led the|combat|lutou|fought|delegad|attend|compareceu|envolv|involved/,
  'membro-de':
    /membro|member|filiad|ingress|incorpor|associad|joined|integr|militant|presid|lider|leader|secretar|cofund|fund/,
  fundou:
    /fund[oa]|fundad|fundador|cofund|found|criou|criad|created|establish|estabelec|organiz|instituiu/,
  escreveu:
    /escrev|escrit|wrote|written|autor|autoria|author|publicou|publicad|published|obra|livro|book|redig/,
  'desenvolveu-se-em':
    /desenvolv|origin|deriv|evolu|emerg|develop|transform|surgiu|grew|tornou-se|became|deu origem|gave rise/,
  'reagiu-contra':
    /contra\b|opos|opoe|opus|opun|critic|conden|against|oppos|rejeit|reject|combat|denunci|polemi|rompeu|broke with|em resposta a|in response to/,
  sucedeu: /suced|succeed|substitu|replac|successor|sucessor/,
  governou:
    /govern|presid|primeiro-ministro|prime minister|chancel|ruled|reign|reinou|ditador|dictator|chefe de estado|head of state/,
  'ocorreu-em': /ocorr|aconte|realiz|took place|occurred|held|\bem\b|\bin\b/,
};

/** Voz passiva: "fundado por X" diz que X é o agente, logo a direção é alvo-para-entidade. */
const passiveCues = {
  influenciou:
    /influenciad[oa]s? (?:por|pel[oa]s?)|influenced by|inspirad[oa]s? (?:por|em|pel[oa]s?)|inspired by/,
  fundou: /fundad[oa]s? (?:por|pel[oa]s?)|founded by|criad[oa]s? (?:por|pel[oa]s?)|created by/,
  escreveu: /escrit[oa]s? (?:por|pel[oa]s?)|written by/,
  sucedeu: /sucedid[oa]s? (?:por|pel[oa]s?)|succeeded by/,
  governou: /governad[oa]s? (?:por|pel[oa]s?)|ruled by/,
};

/** Seção que lista obras da própria entidade: ali o título, sem verbo, já afirma a autoria. */
const worksHeading =
  /^(obras|principais obras|publica|escritos|livros|works|selected works|publications|writings)/i;

function listedWork(relation, article) {
  if (relation.nature !== 'escreveu' || relation.direction !== 'entidade-para-alvo') return null;
  const title = folded(relation.target ?? '');
  const quote = folded(relation.quote ?? '');
  for (const section of article?.sections ?? []) {
    if (!worksHeading.test(section.heading ?? '')) continue;
    const found = section.text
      .split('\n')
      .some((line) => folded(line).startsWith(title) && folded(line).includes(quote));
    if (found) return section.heading;
  }
  return null;
}

/** Every name a link target is known by in this article, folded, longest first when matched. */
function targetIndex(article) {
  const index = new Map();
  const add = (name, target) => {
    if (name) index.set(folded(name), target);
  };
  for (const target of article?.targets ?? []) {
    if (target.missing) continue;
    add(target.title, target);
    for (const written of target.redirectedFrom ?? []) add(written, target);
  }
  const byTitle = new Map((article?.targets ?? []).map((target) => [target.title, target]));
  for (const link of article?.links ?? []) {
    const target = byTitle.get(link.target);
    if (target && !target.missing) add(link.text, target);
  }
  return index;
}

/** A name without its role in the article: the last word of a person's name also identifies it. */
function nameForms(name) {
  const clean = folded(name).replace(/\s*\(.*\)$/, '');
  const words = clean.split(' ').filter(Boolean);
  const last = words.at(-1);
  return last && last.length >= 4 ? [clean, last] : [clean];
}

const mentions = (haystack, name) => nameForms(name).some((form) => haystack.includes(form));

const wholeWords = (outer, inner) => ` ${outer} `.includes(` ${inner} `);

/**
 * Target of a name as the model wrote it: exact, or the only link whose name contains it or is
 * contained in it, in whole words ("Hegel", "Georg Wilhelm Friedrich Hegel"). Two candidates mean
 * no answer: a QID is identity, and a guess here would draw a wrong edge.
 */
export function resolveTarget(name, index) {
  const wanted = folded(name);
  const exact = index.get(wanted);
  if (exact) return exact;
  if (wanted.length < 4) return null;
  const found = new Set();
  for (const [key, target] of index)
    if (key.length >= 4 && (wholeWords(key, wanted) || wholeWords(wanted, key))) found.add(target);
  return found.size === 1 ? [...found][0] : null;
}

/** Identity of a relation across runs of the guards, to reuse a verdict already paid for. */
export const relationKey = (relation) =>
  [relation.nature, relation.direction, folded(relation.target ?? ''), relation.quote].join('|');

/** Paragraph holding the quote: what the second pass reads. Falls back to the quote itself. */
export function passageFor(quote, text, maxChars = 1200) {
  const wanted = normalizeText(quote);
  const paragraph = text.split('\n').find((line) => normalizeText(line).includes(wanted));
  if (!paragraph) return quote;
  if (paragraph.length <= maxChars) return paragraph;
  const at = normalizeText(paragraph).indexOf(wanted);
  const start = Math.max(0, at - Math.floor((maxChars - wanted.length) / 2));
  return paragraph.slice(start, start + maxChars);
}

/**
 * Code check of one relation. Returns `{ problem }` or `{ relation }` with the target resolved
 * against the links of the article (QID when known; `null` means it cannot become an edge yet).
 */
export function checkRelation(relation, { entity, article, normalizedSource, index }) {
  if (!relationNatures.includes(relation.nature)) return { problem: 'tipo-fora-da-lista' };
  if (!relationDirections.includes(relation.direction)) return { problem: 'direcao-invalida' };
  const literal = quoteProblem(relation.quote, normalizedSource);
  if (literal) return { problem: literal };
  const target = relation.target?.trim();
  if (!target) return { problem: 'alvo-ausente' };
  const quote = folded(relation.quote);
  // "Membro fundador" names a founding member, not the person who founded the organisation.
  if (
    relation.nature === 'fundou' &&
    /membro\s+fundador|membro\s+fundadora|founding member|membro-fundador/i.test(quote)
  )
    return { problem: 'membro-fundador-nao-e-fundador' };
  const resolved = resolveTarget(target, index);
  // Sem link e em minúscula: é descrição de um grupo ("os críticos"), não um nó do grafo.
  if (!resolved && target[0] === target[0].toLowerCase() && target[0] !== target[0].toUpperCase())
    return { problem: 'alvo-generico' };
  const names = [
    target,
    ...(resolved ? [...index].filter(([, known]) => known === resolved).map(([key]) => key) : []),
  ];
  if (!names.some((name) => mentions(quote, name))) return { problem: 'alvo-fora-da-citacao' };
  if (
    folded(target) === folded(entity.label) ||
    (resolved?.qid && resolved.qid === (entity.qid ?? article?.qid))
  )
    return { problem: 'alvo-igual-a-entidade' };
  const listedIn = natureCues[relation.nature].test(quote) ? null : listedWork(relation, article);
  if (!natureCues[relation.nature].test(quote) && !listedIn)
    return { problem: 'sem-verbo-do-tipo' };
  const passive = passiveCues[relation.nature]?.exec(quote);
  if (passive && relation.direction === 'entidade-para-alvo') {
    const after = quote.slice(
      passive.index + passive[0].length,
      passive.index + passive[0].length + 80,
    );
    if (names.some((name) => mentions(after, name))) return { problem: 'direcao-contraditoria' };
  }
  const { sentence } = relation;
  if (!sentence?.trim()) return { problem: 'frase-ausente' };
  if (sentence.length > limits.sentence) return { problem: 'frase-longa' };
  return {
    relation: {
      target,
      targetQid: resolved?.qid ?? null,
      ...(resolved ? { targetTitle: resolved.title, targetType: resolved.type } : {}),
      nature: relation.nature,
      direction: relation.direction,
      sentence: sentence.trim(),
      quote: relation.quote,
      ...(listedIn ? { listedIn } : {}),
      verified: false,
    },
  };
}

const dropped = (list, reason, item) => ({ list, reason, item });

/** The sentences that fit, whole; nothing is rewritten, and an empty result means none fits. */
function wholeSentences(value, max) {
  let kept = '';
  for (const sentence of value.match(/[^.!?]+[.!?]+(?:\s+|$)/g) ?? []) {
    if ((kept + sentence).trim().length > max) break;
    kept += sentence;
  }
  return kept.trim();
}

/**
 * Applies every guard to a parsed model response. `text` is exactly what the model read. Items that
 * fail go to `rejected` with a reason; the contract of what remains is checked at the end.
 */
export function guardExtraction(output, { text, entity, article }) {
  const normalizedSource = normalizeText(text);
  const rejected = [];
  const index = targetIndex(article);
  const counts = { quotes: 0, relations: 0 };
  const keepQuoted = (list, items, maxItems, extra = () => null) => {
    const kept = [];
    for (const item of items ?? []) {
      counts.quotes += 1;
      const problem =
        quoteProblem(item.quote, normalizedSource) ??
        extra(item) ??
        (kept.length >= maxItems ? 'excede-limite' : null);
      if (problem) rejected.push(dropped(list, problem, item));
      else kept.push(item);
    }
    return kept;
  };
  const relations = [];
  const seen = new Set();
  for (const relation of output.relations ?? []) {
    counts.relations += 1;
    counts.quotes += 1;
    const checked = checkRelation(relation, { entity, article, normalizedSource, index });
    const problem =
      checked.problem ??
      (relations.length >= limits.relations ? 'excede-limite' : null) ??
      (seen.has(
        `${checked.relation.nature}|${checked.relation.direction}|${folded(relation.target)}`,
      )
        ? 'duplicada'
        : null);
    if (problem) {
      rejected.push(dropped('relations', problem, relation));
      continue;
    }
    seen.add(`${relation.nature}|${relation.direction}|${folded(relation.target)}`);
    relations.push(checked.relation);
  }
  const field = (name, max) => {
    const value = output[name]?.trim() ?? '';
    if (value && value.length <= max) return value;
    if (name === 'summary') {
      const cut = wholeSentences(value, max);
      if (cut) {
        rejected.push(dropped(name, 'campo-cortado-na-frase', { [name]: value }));
        return cut;
      }
    }
    rejected.push(dropped(name, value ? 'campo-longo' : 'campo-vazio', { [name]: value }));
    return null;
  };
  const extraction = {
    oneLine: field('oneLine', limits.oneLine),
    summary: field('summary', limits.summary),
    sections: keepQuoted('sections', output.sections, limits.sections, (item) =>
      !sectionKinds.includes(item.kind)
        ? 'secao-fora-da-lista'
        : !item.text?.trim() || item.text.length > limits.section
          ? 'campo-longo'
          : null,
    ),
    glossary: (output.glossary ?? []).slice(0, limits.glossary),
    relations,
    dates: keepQuoted('dates', output.dates, limits.dates, (item) =>
      !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(item.date)
        ? 'data-invalida'
        : !item.quote.includes(item.date.slice(0, 4))
          ? 'ano-fora-da-citacao'
          : null,
    ),
    claims: keepQuoted('claims', output.claims, limits.claims, (item) =>
      !['fact', 'interpretation', 'controversy'].includes(item.kind) ? 'tipo-fora-da-lista' : null,
    ),
  };
  return { extraction, rejected, counts };
}

/**
 * Second pass: only relations the model confirms against their passage stay `verified`; the rest
 * leave the draft with the verdict as the reason. A missing verdict is a rejection, never a pass.
 */
export function applyVerdicts(relations, output, { model }) {
  const byIndex = new Map((output.verdicts ?? []).map((item) => [item.index, item]));
  const kept = [];
  const rejected = [];
  relations.forEach((relation, position) => {
    const verdict = byIndex.get(position);
    if (verdict?.verdict === 'confirma') {
      kept.push({ ...relation, verified: true, verifiedBy: model });
      return;
    }
    const reason = verdicts.includes(verdict?.verdict) ? verdict.verdict : 'sem-veredito';
    rejected.push(
      dropped('relations', `segunda-passada:${reason}`, { ...relation, motivo: verdict?.reason }),
    );
  });
  return { relations: kept, rejected };
}

/**
 * Second pass on text: an item stays only if the model confirms that its quote and paragraph hold
 * everything it says. Same rule as relations: silence is a rejection.
 */
export function applyTextVerdicts(items, output) {
  const byIndex = new Map((output.verdicts ?? []).map((verdict) => [verdict.index, verdict]));
  const kept = { sections: [], dates: [], claims: [] };
  const rejected = [];
  items.forEach(({ list, item }, position) => {
    const verdict = byIndex.get(position);
    if (verdict?.verdict === 'confirma') kept[list].push(item);
    else
      rejected.push(
        dropped(list, `segunda-passada-texto:${verdict?.verdict ?? 'sem-veredito'}`, {
          ...item,
          motivo: verdict?.reason,
        }),
      );
  });
  return { ...kept, rejected };
}

/** Whether what survived is a complete rich draft; returns contract problems (empty when valid). */
export function contractGaps(extraction) {
  const parsed = richExtractionSchema.safeParse(extraction);
  return parsed.success ? [] : [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
}
