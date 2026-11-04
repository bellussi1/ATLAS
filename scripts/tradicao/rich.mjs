/**
 * Contratos do conteúdo rico por entidade (estágio de extração), do glossário (hovers e folhas
 * laterais) e da escolha de modelo por estágio (calibração). Tudo puro e sem rede.
 *
 * Por entidade: definição de uma linha (hover), resumo curto (folha), seções com citação
 * verificada (origem, ideias centrais, contexto, controvérsias, bibliografia), glossário de termos
 * em pt/en para ligar palavras-chave, e relações em frase com fonte e natureza. Relação só entra
 * quando documentada no texto; semelhança, associação temática e menção nunca viram aresta.
 */
import * as z from 'zod';

export const sectionKinds = [
  'origem',
  'ideias-centrais',
  'contexto',
  'controversias',
  'bibliografia',
];
/** Naturezas históricas aceitas; `related_to` e semelhança ficam de fora de propósito. */
export const relationNatures = [
  'influenciou',
  'foi-influenciado-por',
  'participou-de',
  'fundou',
  'escreveu',
  'desenvolveu-se-em',
  'reagiu-contra',
  'sucedeu',
  'governou',
];

const quoted = z.string().trim().min(1).max(300);
const text = z.string().trim().min(1);

export const richExtractionSchema = z.object({
  oneLine: text.max(140).describe('Definição de uma linha para o hover.'),
  summary: text.max(600).describe('Resumo neutro para a folha lateral.'),
  sections: z.array(z.object({ kind: z.enum(sectionKinds), text, quote: quoted })).max(10),
  glossary: z
    .array(
      z.object({
        term: text,
        pt: z.array(text).default([]),
        en: z.array(text).default([]),
        aliases: z.array(text).default([]),
      }),
    )
    .max(20),
  relations: z
    .array(
      z.object({
        target: text,
        targetQid: z
          .string()
          .regex(/^Q\d+$/)
          .optional(),
        nature: z.enum(relationNatures),
        sentence: text.max(240),
        quote: quoted,
      }),
    )
    .max(12),
  dates: z
    .array(
      z.object({ date: z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/), event: text, quote: quoted }),
    )
    .max(12),
  claims: z
    .array(
      z.object({
        statement: text,
        kind: z.enum(['fact', 'interpretation', 'controversy']),
        quote: quoted,
      }),
    )
    .max(12),
});

const normalize = (value) => value.replace(/\s+/g, ' ').trim().toLowerCase();

/** Every quote must be literally in the article; returns what is not. Same rule as the lean draft. */
export function unverifiedQuotes(extraction, sourceText) {
  const source = normalize(sourceText);
  const lists = {
    sections: extraction.sections,
    relations: extraction.relations,
    dates: extraction.dates,
    claims: extraction.claims,
  };
  return Object.entries(lists).flatMap(([list, items]) =>
    items
      .filter((item) => !source.includes(normalize(item.quote)))
      .map((item) => ({ list, quote: item.quote })),
  );
}

/** Fields that make an old lean draft insufficient for hovers and side sheets. */
export function richGaps(draft) {
  const parsed = richExtractionSchema.safeParse({
    oneLine: draft.oneLine,
    summary: draft.summary,
    sections: draft.sections ?? [],
    glossary: draft.glossary ?? [],
    relations: draft.relations ?? [],
    dates: draft.dates ?? [],
    claims: draft.claims ?? [],
  });
  if (parsed.success) return [];
  return [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? 'raiz')))];
}

const commonWords = new Set([
  'estado',
  'governo',
  'partido',
  'política',
  'politica',
  'sociedade',
  'história',
  'historia',
  'liberdade',
  'poder',
  'direito',
  'trabalho',
  'economia',
]);
const key = (term) => normalize(term).normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Glossary index: term (any pt/en label or alias) -> entity. A term that two entities claim is
 * ambiguous and is not linked automatically; common words and short terms are not linked either.
 */
export function buildGlossary(entities) {
  const claims = new Map();
  for (const entity of entities) {
    const terms = new Set();
    for (const item of entity.glossary ?? [])
      for (const label of [item.term, ...item.pt, ...item.en, ...item.aliases]) terms.add(label);
    for (const label of terms) {
      const k = key(label);
      if (k.length < 4 || commonWords.has(k)) continue;
      claims.set(k, new Set([...(claims.get(k) ?? []), entity.id]));
    }
  }
  const links = [];
  const ambiguous = [];
  for (const [term, ids] of [...claims].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    if (ids.size === 1) links.push({ term, entityId: [...ids][0] });
    else ambiguous.push({ term, entityIds: [...ids].sort() });
  }
  return { links, ambiguous };
}

const rate = z.number().min(0).max(1);
export const modelChoiceSchema = z
  .object({
    measuredAt: z.iso.date(),
    sample: z.object({ size: z.number().int().min(10), entityIds: z.array(z.string()).min(10) }),
    candidates: z
      .array(
        z.object({
          model: z.string(),
          effort: z.enum(['low', 'medium', 'high', 'xhigh', 'max']),
          relevance: rate,
          relations: rate,
          classification: rate,
          costUsd: z.number().min(0),
        }),
      )
      .min(3),
    chosen: z.partialRecord(
      z.enum(['descoberta', 'extracao', 'redacao', 'edicao']),
      z.object({ model: z.string(), effort: z.string() }),
    ),
    rationale: text,
  })
  .superRefine((choice, ctx) => {
    const has = (model, effort) =>
      choice.candidates.some((c) => c.model === model && c.effort === effort);
    if (!has('claude-haiku-5-5', 'low') || !has('claude-haiku-5-5', 'medium'))
      ctx.addIssue({
        code: 'custom',
        message: 'Compare Haiku 5.5 low e medium.',
        path: ['candidates'],
      });
    if (!choice.candidates.some((c) => !c.model.startsWith('claude-haiku')))
      ctx.addIssue({
        code: 'custom',
        message: 'Inclua um modelo maior na comparação.',
        path: ['candidates'],
      });
    for (const [stage, pick] of Object.entries(choice.chosen))
      if (!has(pick.model, pick.effort))
        ctx.addIssue({
          code: 'custom',
          message: `Escolha de ${stage} sem medição.`,
          path: ['chosen', stage],
        });
  });
