import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Marker kept beside a capture that no longer reproduces under the current transform. */
export const retirementFile = 'retired.json';

/**
 * A retired capture stays in the repository for provenance, but it is not replayed or re-fetched:
 * its snapshot cannot be reproduced by the current transformation. Retiring hides nothing, because
 * the marker records the issue, the date and the observed divergence.
 */
export async function readRetirement(directory) {
  try {
    return JSON.parse(await readFile(join(directory, retirementFile), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function isRetired(directory) {
  return (await readRetirement(directory)) !== null;
}
