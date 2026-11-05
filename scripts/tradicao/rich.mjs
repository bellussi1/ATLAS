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
/**
 * Lista fechada de naturezas históricas; `related_to` e semelhança ficam de fora de propósito.
 * "Foi influenciado por" não é um tipo: é `influenciou` com direção `alvo-para-entidade`.
 */
export const relationNatures = [
  'influenciou',
  'participou-de',
  'membro-de',
  'fundou',
  'escreveu',
  'desenvolveu-se-em',
  'reagiu-contra',
  'sucedeu',
  'governou',
  'ocorreu-em',
];
/** Quem pratica a ação: a entidade do artigo ou o alvo. */
export const relationDirections = ['entidade-para-alvo', 'alvo-para-entidade'];
/** Versão do contrato gravada em cada rascunho; rascunho de outra versão é refeito. */
export const richContract = 'rich-v1';

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
          .nullable()
          .optional(),
        targetTitle: text.optional(),
        targetType: text.optional(),
        verified: z.boolean().optional(),
        verifiedBy: text.optional(),
        nature: z.enum(relationNatures),
        direction: z.enum(relationDirections),
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

/**
 * O que o modelo devolve: sem limites de tamanho nem refinamentos, que a saída estruturada não
 * garante. Quem aplica os limites, item a item, é `guardExtraction` (guards.mjs): um item ruim é
 * descartado com motivo, sem jogar fora a resposta inteira já paga.
 */
export const modelOutputSchema = z.object({
  oneLine: z.string().describe('Definição neutra de uma linha, em pt-BR, até 140 caracteres.'),
  summary: z.string().describe('Resumo neutro em pt-BR, até 600 caracteres.'),
  sections: z.array(
    z.object({
      kind: z.string().describe(`Um destes valores: ${sectionKinds.join(', ')}.`),
      text: z.string().describe('Paráfrase em pt-BR, até 500 caracteres.'),
      quote: z.string().describe('Trecho copiado literalmente do artigo, até 300 caracteres.'),
    }),
  ),
  glossary: z.array(
    z.object({
      term: z.string().describe('Nome principal desta entidade.'),
      pt: z.array(z.string()).describe('Formas em português.'),
      en: z.array(z.string()).describe('Formas em inglês.'),
      aliases: z.array(z.string()).describe('Apelidos e siglas que designam só esta entidade.'),
    }),
  ),
  relations: z.array(
    z.object({
      target: z.string().describe('Nome do outro nó, como escrito no artigo.'),
      nature: z.string().describe(`Um destes valores: ${relationNatures.join(', ')}.`),
      direction: z.string().describe(`Um destes valores: ${relationDirections.join(', ')}.`),
      sentence: z.string().describe('A relação em uma frase em pt-BR, até 240 caracteres.'),
      quote: z.string().describe('Trecho literal que afirma a relação e nomeia o alvo.'),
    }),
  ),
  dates: z.array(
    z.object({
      date: z.string().describe('AAAA, AAAA-MM ou AAAA-MM-DD.'),
      event: z.string().describe('O que aconteceu, em pt-BR.'),
      quote: z.string().describe('Trecho literal que contém o ano.'),
    }),
  ),
  claims: z.array(
    z.object({
      statement: z.string().describe('Afirmação em pt-BR.'),
      kind: z.string().describe('fact, interpretation ou controversy.'),
      quote: z.string().describe('Trecho literal que sustenta a afirmação.'),
    }),
  ),
});

/** Second pass: one verdict per relation, read against the passage it came from. */
export const verdicts = ['confirma', 'inverte', 'nao-sustenta'];
export const verdictOutputSchema = z.object({
  verdicts: z.array(
    z.object({
      index: z.number().describe('Índice da relação na lista.'),
      verdict: z.string().describe(`Um destes valores: ${verdicts.join(', ')}.`),
      reason: z.string().describe('Motivo em uma frase curta, em pt-BR.'),
    }),
  ),
});

/** Só tipografia: aspas, travessões, hífen condicional, espaços e caixa. Nunca palavras. */
export function normalizeText(value) {
  return value
    .normalize('NFC')
    .replace(/[\u2018\u2019\u201A\u201B`´]/g, "'")
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replaceAll('\u00AD', '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Every quote must be literally in the article; returns what is not. Same rule as the lean draft. */
export function unverifiedQuotes(extraction, sourceText) {
  const source = normalizeText(sourceText);
  const lists = {
    sections: extraction.sections,
    relations: extraction.relations,
    dates: extraction.dates,
    claims: extraction.claims,
  };
  return Object.entries(lists).flatMap(([list, items]) =>
    items
      .filter((item) => !source.includes(normalizeText(item.quote)))
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
const key = (term) => normalizeText(term).normalize('NFD').replace(/[̀-ͯ]/g, '');

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
          /** Erro restante depois das travas, na conferência humana; `null` se a pessoa não conferiu este braço. */
          residualError: rate.nullable(),
          quotesRejected: rate,
          relationsRejected: rate,
          costUsd: z.number().min(0),
        }),
      )
      .min(2),
    chosen: z.partialRecord(
      z.enum(['extracao', 'relacoes']),
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
    // Só a etapa de relações pode subir de modelo sem medição própria (regra de decisão da avaliação).
    for (const [stage, pick] of Object.entries(choice.chosen))
      if (stage !== 'relacoes' && !has(pick.model, pick.effort))
        ctx.addIssue({
          code: 'custom',
          message: `Escolha de ${stage} sem medição.`,
          path: ['chosen', stage],
        });
  });
