// Licença de um arquivo do Commons, lida do próprio arquivo. Regra única da ingestão e do coletor de imagens.
const clean = (value) =>
  value?.value
    ?.replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || null;

export function assessCommonsFile(imageName, info) {
  const meta = info?.extmetadata ?? {};
  const license = clean(meta.LicenseShortName);
  const filePageUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(`File:${imageName}`).replaceAll('%3A', ':').replaceAll('%20', '_')}`;
  // Public-domain files carry their rationale on the file page instead of a licence URL.
  const licenseUrl =
    meta.LicenseUrl?.value || (/^public domain$/i.test(license ?? '') ? filePageUrl : null);
  const creator = clean(meta.Artist);
  const licensePage = licenseUrl?.toLocaleLowerCase('en') ?? '';
  const reusableLicense =
    /creativecommons\.org\/licenses\/(?:by|by-sa|zero)(?:\/|$)/.test(licensePage) ||
    /creativecommons\.org\/publicdomain\/(?:zero|mark)(?:\/|$)/.test(licensePage) ||
    /gnu\.org\/copyleft\/fdl\.html/.test(licensePage) ||
    /^public domain$/i.test(license);
  return {
    license,
    licenseUrl,
    creator,
    filePageUrl,
    attribution:
      clean(meta.Attribution) || `${imageName}, ${creator ?? 'autor não identificado'}, ${license}`,
    nonFree: /^true$/i.test(clean(meta.NonFree) ?? ''),
    restrictions: clean(meta.Restrictions),
    reusable: Boolean(license && licenseUrl && reusableLicense),
  };
}
