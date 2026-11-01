import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { methodologyAtlas } from '@core/content/repositories/content-repository.service';

import { AtlasLicensedAssetComponent } from './licensed-asset.component';

@Component({
  imports: [AtlasLicensedAssetComponent],
  template:
    '<app-licensed-asset [atlas]="atlas" [assetPath]="assetPath" [kind]="kind" alt="Fonte licenciada" />',
})
class LicensedAssetHost {
  atlas = methodologyAtlas;
  assetPath = '/brand/atlas-logo.svg';
  kind: 'image' | 'document' = 'image';
}

describe('licensed editorial assets', () => {
  it('does not render an image whose license is unknown', () => {
    const fixture = TestBed.createComponent(LicensedAssetHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('img')).toBeNull();
    expect(root.textContent).toContain(
      'Ativo omitido: licença desconhecida ou reprodução não autorizada.',
    );
  });

  it('does not render an asset absent from the license registry', () => {
    const fixture = TestBed.createComponent(LicensedAssetHost);
    fixture.componentInstance.assetPath = '/unregistered-image.png';
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('img')).toBeNull();
  });

  it('renders a registered asset only when reproduction is explicitly allowed', () => {
    const fixture = TestBed.createComponent(LicensedAssetHost);
    fixture.componentInstance.atlas = {
      ...methodologyAtlas,
      assetLicenses: methodologyAtlas.assetLicenses.map((asset) => ({
        ...asset,
        assetPath: '/fonts/IBMPlexSans.ttf',
        creator: 'IBM',
        license: 'SIL Open Font License 1.1',
        licenseUrl: 'https://github.com/IBM/plex/blob/master/LICENSE.txt',
        status: 'known' as const,
        reproduction: 'allowed' as const,
      })),
    };
    fixture.componentInstance.assetPath = '/fonts/IBMPlexSans.ttf';
    fixture.componentInstance.kind = 'document';
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('a[href="/fonts/IBMPlexSans.ttf"]')).not.toBeNull();
    expect(
      root.querySelector('a[href="https://github.com/IBM/plex/blob/master/LICENSE.txt"]')
        ?.textContent,
    ).toContain('SIL Open Font License 1.1');
  });
});
