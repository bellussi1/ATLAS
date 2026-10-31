import { Component, computed, input } from '@angular/core';
import type { Atlas, AssetLicense } from '../core/content-schema';

@Component({
  selector: 'app-licensed-asset',
  template: `
    @if (license(); as record) {
      @if (kind() === 'image') {
        <figure>
          <img [src]="record.assetPath" [alt]="alt()" loading="lazy" />
          <figcaption>{{ creator(record) }} <a [href]="record.licenseUrl" target="_blank" rel="noopener noreferrer">{{ record.license }}</a></figcaption>
        </figure>
      } @else {
        <p><a [href]="record.assetPath">{{ alt() }}</a> · {{ creator(record) }} <a [href]="record.licenseUrl" target="_blank" rel="noopener noreferrer">{{ record.license }}</a></p>
      }
    } @else {
      <p class="license-block" role="note">Ativo omitido: licença desconhecida ou reprodução não autorizada.</p>
    }
  `,
  styles: `
    :host { display: block; }
    figure { margin: 0; }
    img { display: block; max-width: 100%; height: auto; }
    figcaption, p { margin-block: .5rem; font-size: .85rem; line-height: 1.5; }
    a { color: var(--color-accent, var(--signal)); text-underline-offset: .2em; }
    a:focus-visible { outline: 3px solid var(--color-accent, var(--signal)); outline-offset: 3px; }
    .license-block { padding: .75rem 1rem; border-left: .2rem solid var(--color-border-strong, #57544d); }
  `,
})
export class AtlasLicensedAssetComponent {
  readonly atlas = input.required<Atlas>();
  readonly assetPath = input.required<string>();
  readonly alt = input.required<string>();
  readonly kind = input<'image' | 'document'>('image');
  private readonly registered = computed(() => this.atlas().assetLicenses.find((asset) => asset.assetPath === this.assetPath()));
  readonly license = computed(() => {
    const asset = this.registered();
    return asset?.status === 'known' && asset.reproduction === 'allowed' && asset.license && asset.licenseUrl
      ? asset
      : undefined;
  });

  creator(asset: AssetLicense): string { return asset.creator ? `${asset.creator} ·` : ''; }
}
