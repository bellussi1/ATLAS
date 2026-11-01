const requestHeaders = { 'User-Agent': 'ATLAS educational project/1.0 (static content ingestion)' };
let lastRequestAt = 0;

export async function getJson(url) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const wait = Math.max(0, 500 - (Date.now() - lastRequestAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let response;
    try {
      response = await fetch(url, { headers: requestHeaders, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (response.ok) return response.json();
    if (![429, 502, 503, 504].includes(response.status) || attempt === 5)
      throw new Error(`Wikimedia request failed (${response.status}): ${url}`);
    const retryAfter = Number(response.headers.get('retry-after'));
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(retryAfter * 1000 || 0, 1200 * (attempt + 1))),
    );
  }
  throw new Error(`Wikimedia request retries exhausted: ${url}`);
}

export async function getImage(url, imageName) {
  const response = await fetch(url, { headers: requestHeaders });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
    throw new Error(`Commons image download failed (${response.status}) for ${imageName}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
