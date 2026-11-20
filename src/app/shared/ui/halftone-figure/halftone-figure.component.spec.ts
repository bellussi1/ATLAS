import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Atlas } from '@core/content/models/content-schema';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { methodologyAtlas } from '@testing/content-fixture';

import { AtlasHalftoneFigureComponent } from './halftone-figure.component';

const assetPath = '/brand/atlas-logo.svg';

function atlasWith(license: string, licenseUrl: string): Atlas {
  return {
    ...methodologyAtlas,
    assetLicenses: methodologyAtlas.assetLicenses.map((asset) => ({
      ...asset,
      assetPath,
      creator: 'Autor',
      license,
      licenseUrl,
      status: 'known' as const,
      reproduction: 'allowed' as const,
    })),
  };
}

@Component({
  imports: [AtlasHalftoneFigureComponent],
  template: `<app-halftone-figure
    [atlas]="atlas"
    assetPath="${assetPath}"
    alt="Retrato"
    tone="rosa"
  />`,
})
class HalftoneHost {
  atlas = atlasWith('CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/');
}

describe('halftone figure', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ContentRepository,
          useValue: {
            mediaUrl: (path: string) => `https://media.example.test${path}`,
            mirrorUrl: () => null,
          },
        },
      ],
    });
  });

  it('treats an adaptable image and records the treatment in the caption', () => {
    const fixture = TestBed.createComponent(HalftoneHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.plate img')?.getAttribute('alt')).toBe('Retrato');
    expect(root.querySelector('figcaption')?.textContent).toContain('imagem com tratamento de cor');
    expect(root.querySelector('figcaption a')?.textContent).toBe('CC BY-SA 4.0');
  });

  it('shows a no-derivatives image untouched, without claiming a treatment', () => {
    const fixture = TestBed.createComponent(HalftoneHost);
    fixture.componentInstance.atlas = atlasWith(
      'CC BY-ND 4.0',
      'https://creativecommons.org/licenses/by-nd/4.0/',
    );
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.plate')).toBeNull();
    expect(root.querySelector('app-licensed-asset img')).not.toBeNull();
    expect(root.textContent).not.toContain('tratamento de cor');
  });
});
