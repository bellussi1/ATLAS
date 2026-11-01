import { Component, computed, input } from '@angular/core';
import { reproducibleAsset } from '@core/content/media/asset-license';
import type { AssetLicense, Atlas } from '@core/content/models/content-schema';

@Component({
  selector: 'app-licensed-asset',
  templateUrl: './licensed-asset.component.html',
  styleUrl: './licensed-asset.component.scss',
})
export class AtlasLicensedAssetComponent {
  readonly atlas = input.required<Atlas>();
  readonly assetPath = input.required<string>();
  readonly alt = input.required<string>();
  readonly kind = input<'image' | 'document'>('image');
  readonly license = computed(() => reproducibleAsset(this.atlas(), this.assetPath()));

  creator(asset: AssetLicense): string {
    return asset.creator ? `${asset.creator} ·` : '';
  }
}
