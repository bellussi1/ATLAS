// Cliente local para Firecrawl Local (100% offline/local, FIRECRAWL_CLOUD=off).
// Usa a API HTTP local (http://127.0.0.1:3002/v2/scrape) quando ativa ou invoca o binário
// `firecrawl-local` diretamente.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const DEFAULT_LOCAL_API_URL = process.env.FIRECRAWL_LOCAL_URL || 'http://127.0.0.1:3002';

/** Localiza o binário `firecrawl-local` no PATH ou em `~/.cargo/bin`. */
export function resolveFirecrawlBinary() {
  const exe = process.platform === 'win32' ? 'firecrawl-local.exe' : 'firecrawl-local';
  const cargoPath = join(homedir(), '.cargo', 'bin', exe);
  if (existsSync(cargoPath)) return cargoPath;
  return exe;
}

/** Verifica se o servidor HTTP `firecrawl-local serve` está respondendo. */
export async function isLocalServerRunning(apiUrl = DEFAULT_LOCAL_API_URL) {
  try {
    const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) return true;
  } catch {
    // tenta fallback via root ou ignora
  }
  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(1500) });
    return res.status < 500;
  } catch {
    return false;
  }
}

/** Faz scrape via HTTP na API v2 local do Firecrawl Local. */
export async function scrapeViaHttp(
  url,
  { apiUrl = DEFAULT_LOCAL_API_URL, formats = ['markdown'], timeoutMs = 45000 } = {},
) {
  const res = await fetch(`${apiUrl}/v2/scrape`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, formats }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    const msg = payload?.error || `HTTP ${res.status}`;
    throw new Error(`firecrawl-local HTTP scrape falhou (${url}): ${msg}`);
  }
  return {
    markdown: payload.data?.markdown ?? '',
    metadata: payload.data?.metadata ?? {},
    links: payload.data?.links ?? [],
  };
}

/** Faz scrape invocando diretamente o binário `firecrawl-local scrape <url>`. */
export function scrapeViaCli(url, { timeoutMs = 60000, browser = 'auto' } = {}) {
  const bin = resolveFirecrawlBinary();
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(bin, ['scrape', url, '--public-only'], {
      env: {
        ...process.env,
        FIRECRAWL_CLOUD: 'off',
        FIRECRAWL_LOCAL_BROWSER: browser,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      rejectPromise(new Error(`firecrawl-local CLI timeout (${timeoutMs}ms) em ${url}`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      rejectPromise(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        rejectPromise(
          new Error(`firecrawl-local CLI saiu com código ${code} (${url}): ${stderr.trim()}`),
        );
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        const data = parsed.data ?? parsed;
        resolvePromise({
          markdown: data.markdown ?? '',
          metadata: data.metadata ?? {},
          links: data.links ?? [],
        });
      } catch {
        // Caso o binário retorne markdown direto ou stdout misto
        resolvePromise({
          markdown: stdout,
          metadata: {},
          links: [],
        });
      }
    });
  });
}

/**
 * Sobe uma instância temporária de `firecrawl-local serve` (100% local, FIRECRAWL_CLOUD=off)
 * e retorna função `stop()` para encerrá-la ao final do lote.
 */
export async function startLocalServer({ port = 3002, browser = 'auto' } = {}) {
  const apiUrl = `http://127.0.0.1:${port}`;
  if (await isLocalServerRunning(apiUrl)) {
    return { apiUrl, reused: true, stop: () => {} };
  }
  const bin = resolveFirecrawlBinary();
  const child = spawn(bin, ['serve', '--port', String(port)], {
    env: {
      ...process.env,
      FIRECRAWL_CLOUD: 'off',
      FIRECRAWL_LOCAL_BROWSER: browser,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (child.exitCode !== null) {
      throw new Error(`firecrawl-local serve encerrou cedo com código ${child.exitCode}`);
    }
    if (await isLocalServerRunning(apiUrl)) {
      return {
        apiUrl,
        reused: false,
        stop: () => {
          if (child.exitCode === null) child.kill();
        },
      };
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill();
  throw new Error(`Timeout aguardando firecrawl-local serve em ${apiUrl}`);
}
