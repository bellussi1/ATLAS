/**
 * Host checks for Wikimedia URLs. A parsed hostname cannot be fooled by a domain placed in the
 * path or query, unlike `url.includes('wikidata.org')`.
 */
export function hostnameOf(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return '';
  }
}

/** Wikidata and its subdomains, never look-alikes such as `notwikidata.org`. */
export function isWikidataHost(value) {
  const host = hostnameOf(value);
  return host === 'wikidata.org' || host.endsWith('.wikidata.org');
}

/** Commons' API host, never a look-alike or a path that mentions it. */
export function isCommonsHost(value) {
  return hostnameOf(value) === 'commons.wikimedia.org';
}
