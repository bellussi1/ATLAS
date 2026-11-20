import type {
  AssetLicense,
  Atlas,
  Entity,
  KnowledgeGraph,
} from '@core/content/models/content-schema';

export function reproducibleAsset(
  atlas: Atlas | undefined,
  assetPath: string,
): AssetLicense | undefined {
  const asset = atlas?.assetLicenses.find((item) => item.assetPath === assetPath);
  return asset?.status === 'known' &&
    asset.reproduction === 'allowed' &&
    asset.license &&
    asset.licenseUrl
    ? asset
    : undefined;
}

/** Licensed, attributed image for a record, from any atlas (Smith appears in both readings). */
export function entityMedia(graph: KnowledgeGraph, entity: Pick<Entity, 'id'>) {
  for (const atlas of graph.atlases) {
    const asset = atlas.assetLicenses.find(
      (item) =>
        item.entityId === entity.id &&
        item.attribution &&
        item.filePageUrl &&
        reproducibleAsset(atlas, item.assetPath),
    );
    if (asset) return asset;
  }
  return undefined;
}

const noDerivatives =
  /(?:^|[\s/-])nd(?:[\s/-]|$)|noderiv|no[\s-]?derivatives|sem\s+deriva|fair[\s-]?use|uso\s+justo/i;

/**
 * Whether a reproducible asset may be shown with a colour treatment (duotone, halftone).
 * ND licences and fair-use claims are refused; everything else that is already
 * reproducible (public domain, CC0, BY, BY-SA, GFDL) permits adaptation with attribution.
 */
export function allowsAdaptation(asset: AssetLicense | undefined): boolean {
  if (!asset) return false;
  return !noDerivatives.test(`${asset.license ?? ''} ${asset.licenseUrl ?? ''}`);
}
