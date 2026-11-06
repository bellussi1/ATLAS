/** Keeps the current pointer plus the previous distinct releases, in that order. */
export function keepPointers(current, history, keep = 4) {
  const seen = new Set();
  const result = [];
  for (const pointer of [current, ...history]) {
    if (!pointer?.release || seen.has(pointer.release)) continue;
    seen.add(pointer.release);
    result.push(pointer);
    if (result.length >= keep) break;
  }
  return result;
}

/** Every immutable key a set of pointers still needs. */
export function keysForPointers(pointers) {
  const keys = new Set(['pointer.json']);
  for (const pointer of pointers) {
    keys.add(`c/${pointer.manifest.sha256}.json`);
    for (const artifact of pointer.artifacts) keys.add(`c/${artifact.sha256}.json`);
    for (const media of pointer.media) keys.add(media.key);
  }
  return keys;
}
