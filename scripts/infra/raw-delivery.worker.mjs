// CI mirror for already-public capture objects. The browser content URL stays in content-pointer.
export default {
  async fetch(request, env) {
    if (!['GET', 'HEAD'].includes(request.method))
      return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
    const path = new URL(request.url).pathname;
    if (!/^\/raw\/[a-f0-9]{64}\.bin$/.test(path)) return new Response(null, { status: 404 });
    const key = path.slice(1);
    const object =
      request.method === 'HEAD'
        ? await env.PUBLIC_CAPTURES.head(key)
        : await env.PUBLIC_CAPTURES.get(key);
    if (!object) return new Response(null, { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('ETag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(request.method === 'HEAD' ? null : object.body, { headers });
  },
};
