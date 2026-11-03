import { Component, computed, input } from '@angular/core';
import { reproducibleAsset } from '@core/content/media/asset-license';
import { ContentMediaPipe } from '@core/content/media/content-media.pipe';
import type { AssetLicense, Atlas } from '@core/content/models/content-schema';

@Component({
  selector: 'app-licensed-asset',
  imports: [ContentMediaPipe],
  templateUrl: './licensed-asset.component.html',
  styleUrl: './licensed-asset.component.scss',
})
export class AtlasLicensedAssetComponent {
  readonly atlas = input.required<Atlas>();
  readonly assetPath = input.required<string>();
  readonly alt = input.required<string>();
  readonly kind = input<'image' | 'document'>('image');
  /** Set to false where the page already credits the asset elsewhere (e.g. a link to its record). */
  readonly credit = input(true);
  readonly license = computed(() => reproducibleAsset(this.atlas(), this.assetPath()));

  creator(asset: AssetLicense): string {
    return asset.creator ? `${asset.creator} ·` : '';
  }
}
