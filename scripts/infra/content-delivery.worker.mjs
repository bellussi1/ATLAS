// Public content delivery for the atlas-public bucket. It replaces the rate-limited r2.dev host
// without changing the content contract: the same immutable c/<sha256>.json and m/<sha256>.<ext>
// keys, plus the mutable pointer.json. The browser never talks to the S3 endpoint.
const ARTIFACT = /^\/c\/[a-f0-9]{64}\.json$/;
const MEDIA = /^\/m\/[a-f0-9]{64}\.(?:jpe?g|png|webp|gif|svg)$/;
const ALLOWED = new Set(['GET', 'HEAD', 'OPTIONS']);
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Expose-Headers': 'ETag, Content-Length, Content-Encoding',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  Vary: 'Accept-Encoding',
};

function failure(status, headers = {}) {
  return new Response(null, { status, headers: { ...CORS, ...headers } });
}

export default {
  async fetch(request, env) {
    if (!ALLOWED.has(request.method)) return failure(405, { Allow: 'GET, HEAD, OPTIONS' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const path = new URL(request.url).pathname;
    const pointer = path === '/pointer.json';
    if (!pointer && !ARTIFACT.test(path) && !MEDIA.test(path)) return failure(404);

    const key = path.slice(1);
    const object =
      request.method === 'HEAD'
        ? await env.PUBLIC_CONTENT.head(key)
        : await env.PUBLIC_CONTENT.get(key);
    if (!object) return failure(404);

    const headers = new Headers(CORS);
    object.writeHttpMetadata(headers);
    headers.set('ETag', object.httpEtag);
    headers.set(
      'Cache-Control',
      pointer ? 'public, max-age=0, must-revalidate' : 'public, max-age=31536000, immutable',
    );
    if (!headers.has('Content-Type'))
      headers.set(
        'Content-Type',
        MEDIA.test(path) ? 'application/octet-stream' : 'application/json',
      );
    return new Response(request.method === 'HEAD' ? null : object.body, { headers });
  },
};
