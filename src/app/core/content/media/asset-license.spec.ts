import type { AssetLicense } from '@core/content/models/content-schema';

import { allowsAdaptation } from './asset-license';

function asset(license: string, licenseUrl: string): AssetLicense {
  return {
    id: 'asset-test',
    assetPath: '/brand/atlas-logo.svg',
    creator: 'Autor',
    license,
    licenseUrl,
    status: 'known',
    reproduction: 'allowed',
  };
}

describe('allowsAdaptation', () => {
  it.each([
    ['CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/'],
    ['CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0/'],
    ['Public domain', 'https://commons.wikimedia.org/wiki/Public_domain'],
    ['CC0', 'https://creativecommons.org/publicdomain/zero/1.0/'],
  ])('permits a colour treatment under %s', (license, url) => {
    expect(allowsAdaptation(asset(license, url))).toBe(true);
  });

  it.each([
    ['CC BY-ND 4.0', 'https://creativecommons.org/licenses/by-nd/4.0/'],
    ['CC BY-NC-ND 3.0', 'https://creativecommons.org/licenses/by-nc-nd/3.0/'],
    ['Attribution-NoDerivatives', 'https://example.org/license'],
    ['Fair use', 'https://en.wikipedia.org/wiki/Fair_use'],
  ])('refuses a colour treatment under %s', (license, url) => {
    expect(allowsAdaptation(asset(license, url))).toBe(false);
  });

  it('refuses an asset that is not reproducible at all', () => {
    expect(allowsAdaptation(undefined)).toBe(false);
  });
});
