import * as z from 'zod';

// The public CSP forbids eval and Zod's JIT compiles validators with `new Function`.
z.config({ jitless: true });

/** Public, non-secret base URL of the atlas-public bucket; the only address the app reads from. */
export const DEFAULT_CONTENT_BASE_URL = 'https://atlas-content-delivery.atlas-bellussi.workers.dev';

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const artifact = z.object({ sha256: digest, bytes: z.number().int().nonnegative() });

/** Licence fields copied from the editorial record of a published media file. */
export const mediaLicenseSchema = z.object({
  assetPath: z.string().regex(/^\//),
  creator: z.string().nullable(),
  license: z.string().nullable(),
  licenseUrl: z.url({ protocol: /^https?$/ }).nullable(),
  sourceUrl: z.url({ protocol: /^https?$/ }).optional(),
  status: z.enum(['known', 'unknown']),
  reproduction: z.enum(['allowed', 'blocked']),
});

/**
 * Small reviewable pointer committed to git. It pins the content graph and media by SHA-256 and
 * bytes; the R2 objects it names are immutable, so only `pointer.json` on the bucket changes.
 */
export const contentPointerSchema = z.object({
  schemaVersion: z.literal(1),
  baseUrl: z.url({ protocol: /^https$/ }),
  release: digest,
  manifest: artifact,
  /**
   * Direct references to the packaged artifacts, so a reading route needs only the pointer and the
   * bundle. Older pointers omit them and the repository falls back to the manifest.
   */
  bundle: artifact.nullable().default(null),
  networkBundle: artifact.nullable().default(null),
  artifacts: z
    .array(artifact.extend({ file: z.string().regex(/^[a-z0-9-]+\.[a-f0-9]{64}\.json$/) }))
    .min(1),
  media: z.array(
    artifact.extend({
      path: z.string().regex(/^\/(?:images|assets)\//),
      key: z.string().regex(/^m\/[a-f0-9]{64}\.[a-z0-9]+$/),
      contentType: z.string().regex(/^[a-z]+\/[a-z0-9.+-]+$/),
      license: mediaLicenseSchema,
    }),
  ),
});
export type ContentPointer = z.infer<typeof contentPointerSchema>;

/** Immutable object key for a content-addressed artifact, relative to the public base URL. */
export const artifactKey = (sha256: string): string => `c/${sha256}.json`;
