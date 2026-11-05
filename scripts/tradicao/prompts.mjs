/**
 * Pedidos à API do extrator rico e da segunda passada. O prompt fixo fica no bloco `system`, com
 * marca de cache, e não muda por entidade: o que varia (tipo, nome, artigo) vai na mensagem do
 * usuário, depois da marca. Mudar uma letra aqui muda o hash e refaz o trabalho, de propósito.
 */
import { createHash } from 'node:crypto';

import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

import { articleText } from '../ingestion/wiki-extract/article.mjs';
import { passageFor } from './guards.mjs';
import {
  modelOutputSchema,
  relationNatures,
  richContract,
  sectionKinds,
  verdictOutputSchema,
} from './rich.mjs';

export const defaultModel = 'claude-haiku-5-5';
export const maxArticleChars = 60_000;
export const maxBibliographyChars = 3_000;
/** Pensamento conta em `max_tokens`: é o teto real de saída e, por isso, do custo. */
export const maxOutputTokens = { extract: 12_000, verify: 3_000 };

export const richSystem = `Você extrai dados de um artigo da Wikipedia para uma plataforma educacional pública sobre política e história. A saída alimenta um grafo de conhecimento: cada campo é conferido por código contra o artigo, e o que não bater é descartado.

REGRAS GERAIS
- Use apenas o texto dentro de <artigo>. Não acrescente conhecimento próprio, datas, nomes ou avaliações.
- Tudo que você redige fica em português do Brasil, em tom neutro, sem adjetivo de juízo. Citações ficam no idioma do artigo.
- Diferencie fato documentado de interpretação e de alegação disputada; divergência entre autores é controvérsia, sem escolher lado.
- Prefira poucos itens bem sustentados a muitos fracos. Lista vazia é resposta válida.

CITAÇÕES
- Todo campo "quote" é um trecho copiado letra por letra do artigo, com pelo menos três palavras e no máximo 300 caracteres.
- Sem reticências, sem colchetes, sem juntar frases distantes, sem traduzir, sem corrigir erros do original.
- Se não houver trecho literal que sustente o item, não produza o item.

CAMPOS
- oneLine: define a entidade em uma linha, até 140 caracteres, para um cartão de hover. Sem começar pelo nome dela.
- summary: até 600 caracteres, para a folha lateral: o que é, quando, onde e por que importa no artigo.
- sections: até 10 itens. "kind" é um de: ${sectionKinds.join(', ')}. "text" parafraseia em até 500 caracteres e "quote" sustenta. Em bibliografia, cite só obras listadas no bloco de bibliografia do artigo.
- glossary: um item por entidade do artigo, para esta entidade apenas: nome principal, formas em pt e en e apelidos ou siglas que designem só ela. Só formas presentes no artigo ou no título. Não inclua palavras comuns.
- dates: até 12. "date" em AAAA, AAAA-MM ou AAAA-MM-DD, e o ano aparece na citação.
- claims: até 12. "kind" é fact, interpretation ou controversy.

RELAÇÕES
Uma relação é um fato histórico afirmado no texto entre a entidade do artigo e outro nó nomeado. Até 12.
- "nature" é exatamente um de: ${relationNatures.join(', ')}. Não invente outro valor. Semelhança, afinidade, comparação, tema comum e mera menção não são relação: nesses casos não produza o item.
- "direction" diz quem pratica a ação. "entidade-para-alvo": a entidade do artigo fundou, influenciou ou escreveu o alvo. "alvo-para-entidade": o alvo fundou, influenciou ou escreveu a entidade. "Foi influenciado por X" é influenciou com alvo-para-entidade.
- "target" é o nome do outro nó como está escrito no artigo, sem cargo nem descrição.
- "quote" afirma a relação e nomeia o alvo na mesma frase. Se a frase fala de outra pessoa agindo, não é relação desta entidade.
- "sentence" escreve a relação em uma frase, em português, até 240 caracteres, com o sujeito certo.
- Significados: influenciou (influência intelectual ou política afirmada); participou-de (tomou parte em evento ou organização); membro-de (filiação a partido ou organização); fundou (criou organização, movimento ou publicação); escreveu (autoria de obra); desenvolveu-se-em (corrente que deu origem a outra); reagiu-contra (oposição ou crítica afirmada); sucedeu (assumiu o posto de); governou (chefiou governo, Estado ou região); ocorreu-em (evento e lugar).

COBERTURA
O artigo pode estar parcial; não trate o silêncio do texto como negação. Responda somente com o JSON do formato pedido.`;

export const verifySystem = `Você confere relações extraídas de um artigo da Wikipedia. Para cada relação recebe o tipo, o sentido declarado, a citação e o parágrafo de onde ela veio. Julgue só pelo parágrafo; não use conhecimento próprio.

Responda um veredito por índice:
- "confirma": o parágrafo afirma esse fato, com esse tipo, entre esses dois nós e nesse sentido.
- "inverte": o fato existe, mas quem age é o outro nó.
- "nao-sustenta": o parágrafo só menciona os dois nós, compara, fala de outra pessoa, usa dúvida ou hipótese como fato, ou o tipo não descreve o que está escrito.

Na dúvida, "nao-sustenta". Significados dos tipos: influenciou (influência intelectual ou política afirmada); participou-de (tomou parte em evento ou organização); membro-de (filiação a partido ou organização); fundou (criou organização, movimento ou publicação); escreveu (autoria de obra); desenvolveu-se-em (corrente que deu origem a outra); reagiu-contra (oposição ou crítica afirmada); sucedeu (assumiu o posto de); governou (chefiou governo, Estado ou região); ocorreu-em (evento e lugar).`;

/** O que olhar primeiro em cada tipo; fica na mensagem do usuário para não quebrar o cache. */
const typeHints = {
  pessoa:
    'Priorize origem, ideias, filiações, obras, cargos e quem influenciou ou foi influenciado.',
  partido: 'Priorize fundação, fundadores, cisões, governos, ideologia declarada e país.',
  ideologia: 'Priorize origem, correntes derivadas, autores centrais e oposições declaradas.',
  movimento: 'Priorize origem, líderes, eventos, país e correntes de que deriva.',
  organização: 'Priorize fundação, fundadores, membros notáveis e o que fez.',
  obra: 'Priorize autoria, data, tese central e recepção.',
  acontecimento: 'Priorize data, lugar, participantes, causas afirmadas e consequências afirmadas.',
  lugar: 'Priorize os eventos e as organizações políticas que o artigo liga ao lugar.',
  conceito: 'Priorize quem formulou, em que obra e como foi disputado.',
};

/** Cache de 1 hora: lotes podem levar mais de 5 minutos; com menos de 3 pedidos não compensa. */
export function cacheControl(requestCount) {
  return requestCount >= 3 ? { type: 'ephemeral', ttl: '1h' } : null;
}

const systemBlock = (text, requestCount) => {
  const control = cacheControl(requestCount);
  return [{ type: 'text', text, ...(control ? { cache_control: control } : {}) }];
};

/** Exactly what the model reads and what its quotes are checked against. */
export function richSourceText(article, maxChars = maxArticleChars) {
  const { text, coverage, truncated } = articleText(article, maxChars);
  const works = (article.references?.bibliography ?? [])
    .map((entry) => entry.text)
    .join('\n')
    .slice(0, maxBibliographyChars);
  return {
    text: works ? `${text}\n\n## Bibliografia do artigo\n${works}` : text,
    coverage,
    truncated,
  };
}

export function richParams({ entity, text, model, effort, requestCount }) {
  const hint = typeHints[entity.type];
  return {
    model,
    max_tokens: maxOutputTokens.extract,
    output_config: { effort, format: zodOutputFormat(modelOutputSchema) },
    system: systemBlock(richSystem, requestCount),
    messages: [
      {
        role: 'user',
        content: `Entidade: ${entity.label} (${entity.type}, Wikidata ${entity.qid ?? 'sem item'}).${hint ? ` ${hint}` : ''}\n\n<artigo>\n${text}\n</artigo>`,
      },
    ],
  };
}

const directionPhrase = (relation, label) =>
  relation.direction === 'entidade-para-alvo'
    ? `${label} → ${relation.target}`
    : `${relation.target} → ${label}`;

export function verifyParams({ entity, relations, text, model, effort }) {
  const items = relations.map((relation, index) => ({
    index,
    tipo: relation.nature,
    sentido: directionPhrase(relation, entity.label),
    citacao: relation.quote,
    paragrafo: passageFor(relation.quote, text),
  }));
  return {
    model,
    max_tokens: maxOutputTokens.verify,
    output_config: { effort, format: zodOutputFormat(verdictOutputSchema) },
    system: verifySystem,
    messages: [
      {
        role: 'user',
        content: `Entidade do artigo: ${entity.label}.\n\n<relacoes>\n${JSON.stringify(items, null, 1)}\n</relacoes>`,
      },
    ],
  };
}

/** Fingerprint of everything that changes the answer; a different one means redo. */
export const promptHash = createHash('sha256')
  .update(`${richContract}\0${richSystem}\0${verifySystem}\0${JSON.stringify(typeHints)}`)
  .digest('hex')
  .slice(0, 12);

/** Text of a finished message; refusal, cut-off or empty output is an error, never an empty draft. */
export function messageJson(message) {
  if (message.stop_reason !== 'end_turn')
    throw new Error(`stop_reason ${message.stop_reason}`, { cause: message.stop_details });
  const block = message.content.find((item) => item.type === 'text');
  if (!block?.text) throw new Error('resposta sem bloco de texto');
  return JSON.parse(block.text);
}
