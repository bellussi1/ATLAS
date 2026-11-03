// Structured extraction of one Wikipedia article by a small model, kept honest by quote checks.
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

export const extractionModel = 'claude-haiku-5-5';
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

const system = `Você extrai dados de artigos da Wikipedia para uma plataforma educacional.
Use apenas o texto fornecido; não acrescente conhecimento próprio.
Cada data, relação e afirmação precisa de "quote": um trecho copiado literalmente do artigo, com até 300 caracteres, sem reticências nem alterações.
Classifique "kind": "fact" para fato documentado, "interpretation" para leitura de autores, "controversy" para alegação disputada.
Escreva resumo, eventos, relações e afirmações em português do Brasil, em tom neutro.
Prefira poucos itens bem sustentados a muitos itens fracos (no máximo 12 por lista).`;

/** Message params for one entity; identical for the sync and batch paths. */
export function extractionParams(entity, text) {
  return {
    model: extractionModel,
    max_tokens: 8000,
    output_config: { effort: 'low', format: zodOutputFormat(extractionSchema) },
    system,
    messages: [
      {
        role: 'user',
        content: `Entidade: ${entity.label} (${entity.type}, Wikidata ${entity.qid})\n\n<artigo>\n${text}\n</artigo>`,
      },
    ],
  };
}

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
