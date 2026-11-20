import * as z from 'zod';

/**
 * Compact lookup from a Commons thumbnail address to its mirrored object on the public bucket.
 * The slot is a short non-cryptographic hash of the address (the build fails on a collision), so
 * the artifact stays small enough to ship with every release; integrity of the images themselves
 * comes from their content-addressed keys.
 */
export function mirrorSlot(assetPath: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < assetPath.length; index++) {
    const code = assetPath.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export const mirrorIndexSchema = z.object({
  schemaVersion: z.literal(1),
  /** slot → `<sha256>.<ext>`; the object lives at `m/<value>`. */
  entries: z.record(z.string().regex(/^[a-z0-9]+$/), z.string().regex(/^[a-f0-9]{64}\.[a-z0-9]+$/)),
});
export type MirrorIndex = z.infer<typeof mirrorIndexSchema>;
