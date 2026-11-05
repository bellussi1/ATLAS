// Lean drafts written by hand (chat path) and read by the converter, kept honest by quote checks.
// The API path is the rich extractor: scripts/tradicao/extract.mjs.
import { z } from 'zod';

export const maxInputChars = 60000;

export const extractionSchema = z.object({
  summary: z.string().describe('Resumo neutro em pt-BR, até 600 caracteres.'),
  dates: z.array(
    z.object({
      date: z.string().describe('AAAA, AAAA-MM ou AAAA-MM-DD.'),
      event: z.string().describe('O que aconteceu, em pt-BR.'),
      quote: z.string().describe('Trecho literal do artigo que sustenta a data.'),
    }),
  ),
  relations: z.array(
    z.object({
      target: z.string().describe('Nome da pessoa, obra, organização ou ideia relacionada.'),
      relation: z.string().describe('Natureza da relação, em pt-BR (ex.: influenciou, fundou).'),
      quote: z.string().describe('Trecho literal do artigo que sustenta a relação.'),
    }),
  ),
  claims: z.array(
    z.object({
      statement: z.string().describe('Afirmação em pt-BR.'),
      kind: z.enum(['fact', 'interpretation', 'controversy']),
      quote: z.string().describe('Trecho literal do artigo que sustenta a afirmação.'),
    }),
  ),
});

const normalize = (value) => value.replace(/\s+/g, ' ').trim().toLowerCase();

/** Drops every item whose quote is not literally in the source; returns what was dropped. */
export function verifyQuotes(extraction, sourceText) {
  const source = normalize(sourceText);
  const rejected = [];
  const keep = (list, name) =>
    list.filter((item) => {
      const ok = item.quote.length > 0 && source.includes(normalize(item.quote));
      if (!ok) rejected.push({ list: name, quote: item.quote });
      return ok;
    });
  return {
    extraction: {
      summary: extraction.summary,
      dates: keep(extraction.dates, 'dates'),
      relations: keep(extraction.relations, 'relations'),
      claims: keep(extraction.claims, 'claims'),
    },
    rejected,
  };
}

/** Reads the model output; a refusal, cut-off or schema mismatch is an error, never an empty record. */
export function parseExtraction(message) {
  if (message.stop_reason !== 'end_turn')
    throw new Error(`extração interrompida: stop_reason ${message.stop_reason}`);
  const text = message.content.find((block) => block.type === 'text')?.text;
  if (!text) throw new Error('extração sem bloco de texto');
  return extractionSchema.parse(JSON.parse(text));
}
