import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { allowsAdaptation, reproducibleAsset } from '@core/content/media/asset-license';
import { ContentMediaPipe } from '@core/content/media/content-media.pipe';
import type { AssetLicense, Atlas } from '@core/content/models/content-schema';
import { AtlasLicensedAssetComponent } from '@shared/ui/licensed-asset/licensed-asset.component';

export type DuotoneTone = 'rosa' | 'pau-brasil' | 'mata' | 'jenipapo';

/**
 * Licensed image shown in duotone with a halftone screen. The treatment only applies
 * when the licence permits adaptation; otherwise the untouched licensed asset renders.
 * The caption records the treatment next to the credit.
 */
@Component({
  selector: 'app-halftone-figure',
  imports: [ContentMediaPipe, AtlasLicensedAssetComponent],
  templateUrl: './halftone-figure.component.html',
  styleUrl: './halftone-figure.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-tone]': 'tone()' },
})
export class AtlasHalftoneFigureComponent {
  readonly atlas = input.required<Atlas>();
  readonly assetPath = input.required<string>();
  readonly alt = input.required<string>();
  readonly tone = input<DuotoneTone>('pau-brasil');
  readonly loading = input<'eager' | 'lazy'>('lazy');

  /** The asset when it may be treated; undefined falls back to the plain licensed asset. */
  readonly treatable = computed(() => {
    const asset = reproducibleAsset(this.atlas(), this.assetPath());
    return allowsAdaptation(asset) ? asset : undefined;
  });

  creator(asset: AssetLicense): string {
    return asset.creator ? `${asset.creator} ·` : '';
  }
}
