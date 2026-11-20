// Pure helpers of the Commons media mirror: candidate selection, image sniffing and the committed
// mirror record. The CLI (mirror-media.mjs) does the network and bucket work.
import '../content/register-source-modules.mjs';
import { mediaKey, sha256Hex } from '../content/r2-content.mjs';

const { allowsAdaptation, reproducibleAsset } =
  await import('../../src/app/core/content/media/asset-license.ts');
const { mirrorSlot } = await import('../../src/app/core/content/media/mirror-index.ts');

export const mirrorFile = 'content/media-mirror.json';
export const maxImageBytes = 10 * 1024 * 1024;

const extensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};
export const extensionFor = (contentType) => extensions[contentType.split(';')[0].trim()];

const hotlink = /^https:\/\/(?:upload|thumb)\.wikimedia\.org\//;

/**
 * Licensed images that may be copied: a known licence with reproduction allowed (the same rule the
 * app applies before showing an image) and no no-derivatives or fair-use terms. Everything else is
 * reported with its reason and keeps being hotlinked or hidden as before.
 */
export function selectCandidates(atlases) {
  const seen = new Set();
  const candidates = [];
  const skipped = [];
  for (const atlas of atlases) {
    for (const license of atlas.assetLicenses) {
      const path = license.assetPath;
      if (!hotlink.test(path) || seen.has(path)) continue;
      seen.add(path);
      const allowed = reproducibleAsset(atlas, path);
      if (!allowed) skipped.push({ path, reason: 'licença desconhecida ou reprodução bloqueada' });
      else if (!allowsAdaptation(allowed))
        skipped.push({ path, reason: 'licença sem derivados ou uso justo' });
      else candidates.push(allowed);
    }
  }
  return { candidates, skipped };
}

/** Content type from the bytes themselves; null when the file is not a supported image. */
export function sniffImage(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')))
    return 'image/png';
  const head = bytes.subarray(0, 12).toString('latin1');
  if (head.startsWith('GIF8')) return 'image/gif';
  if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') return 'image/webp';
  const text = bytes.subarray(0, 512).toString('utf8').trimStart();
  if (/^(?:<\?xml[\s\S]*?)?<svg[\s>]/i.test(text)) return 'image/svg+xml';
  return null;
}

/** Pixel size of raster images, for reserving layout space; null when it cannot be read. */
export function imageSize(bytes, contentType) {
  try {
    if (contentType === 'image/png')
      return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    if (contentType === 'image/gif')
      return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
    if (contentType === 'image/jpeg') {
      let offset = 2;
      while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) return null;
        const marker = bytes[offset + 1];
        const length = bytes.readUInt16BE(offset + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
          return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
        offset += 2 + length;
      }
      return null;
    }
    if (contentType === 'image/webp') {
      const kind = bytes.subarray(12, 16).toString('latin1');
      if (kind === 'VP8X')
        return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
      if (kind === 'VP8 ')
        return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
      if (kind === 'VP8L') {
        const bits = bytes.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** The record committed to git: one entry per mirrored thumbnail, with provenance and licence. */
export function mirrorEntry({ license, bytes, contentType, mirroredAt }) {
  const sha256 = sha256Hex(bytes);
  const extension = extensionFor(contentType);
  return {
    path: license.assetPath,
    key: mediaKey(sha256, extension),
    sha256,
    bytes: bytes.byteLength,
    contentType,
    ...imageSize(bytes, contentType),
    creator: license.creator,
    license: license.license,
    licenseUrl: license.licenseUrl,
    sourceUrl: license.sourceUrl ?? null,
    filePageUrl: license.filePageUrl ?? null,
    mirroredAt,
  };
}

export function serializeMirror(entries) {
  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));
  return `${JSON.stringify({ schemaVersion: 1, entries: sorted }, null, 2)}\n`;
}

/** The compact index the app downloads; throws on a slot collision so it can never mis-resolve. */
export function compactIndex(entries) {
  const slots = {};
  for (const entry of entries) {
    const slot = mirrorSlot(entry.path);
    const object = entry.key.slice(2);
    if (slots[slot] && slots[slot] !== object)
      throw new Error(`Colisão no índice do espelho: ${entry.path}`);
    slots[slot] = object;
  }
  const sorted = Object.fromEntries(Object.entries(slots).sort(([a], [b]) => a.localeCompare(b)));
  return `${JSON.stringify({ schemaVersion: 1, entries: sorted })}\n`;
}

/** Every `m/` key a mirror record holds, so retention never deletes a mirrored image. */
export const mirrorKeys = (entries) => new Set(entries.map((entry) => entry.key));
