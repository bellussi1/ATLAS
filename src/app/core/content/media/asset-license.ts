import type { AssetLicense, Atlas } from '@core/content/models/content-schema';

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
