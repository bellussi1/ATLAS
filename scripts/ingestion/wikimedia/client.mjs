const requestHeaders = { 'User-Agent': 'ATLAS educational project/1.0 (static content ingestion)' };
let lastRequestAt = 0;

export async function getResource(url, kind = 'json') {
  const target = new URL(url);
  if (
    target.protocol !== 'https:' ||
    !/^(?:www\.wikidata\.org|[a-z-]+\.wikipedia\.org|commons\.wikimedia\.org|upload\.wikimedia\.org|thumb\.wikimedia\.org)$/.test(
      target.hostname,
    )
  )
    throw new Error(`Origem Wikimedia não autorizada: ${target.origin}`);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const wait = Math.max(0, 500 - (Date.now() - lastRequestAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let response;
    try {
      response = await fetch(url, { headers: requestHeaders, signal: controller.signal });
      if (response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        if (kind === 'image' && !contentType.startsWith('image/'))
          throw new Error(`Commons retornou mídia inválida: ${url}`);
        return { bytes: Buffer.from(await response.arrayBuffer()), contentType };
      }
    } finally {
      clearTimeout(timeout);
    }
    if (![429, 502, 503, 504].includes(response.status) || attempt === 5)
      throw new Error(`Wikimedia request failed (${response.status}): ${url}`);
    const retryAfter = Number(response.headers.get('retry-after'));
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(retryAfter * 1000 || 0, 1200 * (attempt + 1))),
    );
  }
  throw new Error(`Wikimedia request retries exhausted: ${url}`);
}

export async function getJson(url) {
  return JSON.parse((await getResource(url)).bytes.toString('utf8'));
}

export async function getImage(url, imageName) {
  try {
    return (await getResource(url, 'image')).bytes;
  } catch (error) {
    throw new Error(`Commons image download failed for ${imageName}`, { cause: error });
  }
}
