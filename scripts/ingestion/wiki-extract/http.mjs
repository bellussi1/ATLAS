// Camada HTTP da coleta Wikipedia/Wikidata: rede ao vivo, gravação das respostas ou replay de uma
// captura já gravada. Os módulos de coleta recebem essa camada; nenhum deles chama a rede diretamente.
import { digest } from '../wikimedia/archive.mjs';
import { getResource } from '../wikimedia/client.mjs';

/** `resource(url, kind)` returns `{ bytes, contentType, etag }`; `json(url)` parses the body. */
export function createHttp(resource) {
  return {
    resource,
    json: async (url) => JSON.parse((await resource(url, 'json')).bytes.toString('utf8')),
  };
}

export const liveHttp = createHttp((url, kind) => getResource(url, kind));

/** Licence line stored with each captured response; Wikidata is CC0, Wikipedia text is CC BY-SA. */
export function licenseOf(url, kind) {
  if (url.includes('wikidata.org')) return 'CC0 1.0';
  if (kind === 'html')
    return 'Texto da Wikipedia (CC BY-SA 4.0); origem e atribuição preservadas; não publicado';
  return 'Metadados Wikimedia; origem e atribuição preservadas';
}

/**
 * Wraps a transport and keeps every distinct URL once, with its digest, so the run can be stored as
 * a capture. A URL requested twice returns the first response, as it did when it was read.
 */
export function recordingHttp(transport = liveHttp) {
  const responses = new Map();
  const http = createHttp(async (url, kind) => {
    const key = String(url);
    const known = responses.get(key);
    if (known) return known;
    const response = await transport.resource(key, kind);
    const bytes = Buffer.from(response.bytes);
    const recorded = {
      url: key,
      kind,
      contentType: response.contentType,
      etag: response.etag ?? null,
      sha256: digest(bytes),
      license: licenseOf(key, kind),
      bytes,
    };
    responses.set(key, recorded);
    return recorded;
  });
  return { http, responses };
}

/** Serves only the responses of a capture, byte for byte; anything else is an error, never a fetch. */
export function replayHttp(responses) {
  return createHttp(async (url) => {
    const found = responses.get(String(url));
    if (!found) throw Error(`Resposta ausente na captura: ${url}`);
    return found;
  });
}
