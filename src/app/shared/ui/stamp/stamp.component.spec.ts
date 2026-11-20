import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AtlasStampComponent, type StampShadow, type StampTone } from './stamp.component';

@Component({
  imports: [AtlasStampComponent],
  template: `<app-stamp [tone]="tone" [shadow]="shadow" [grain]="grain">
    <a href="/verbete/marxismo">Marxismo</a>
  </app-stamp>`,
})
class StampHost {
  tone: StampTone = 'cal';
  shadow: StampShadow = 'md';
  grain = false;
}

describe('perforated stamp', () => {
  it('keeps projected content operable inside the paper', () => {
    const fixture = TestBed.createComponent(StampHost);
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      'app-stamp .stamp__paper a',
    );

    expect(link?.textContent).toBe('Marxismo');
    expect(link?.getAttribute('href')).toBe('/verbete/marxismo');
  });

  it('exposes tone, shadow and grain as host state', () => {
    const fixture = TestBed.createComponent(StampHost);
    Object.assign(fixture.componentInstance, { tone: 'mata', shadow: 'none', grain: true });
    fixture.detectChanges();
    const stamp = (fixture.nativeElement as HTMLElement).querySelector('app-stamp')!;

    expect(stamp.getAttribute('data-tone')).toBe('mata');
    expect(stamp.getAttribute('data-shadow')).toBe('none');
    expect(stamp.querySelector('.stamp__paper')?.classList).toContain('atlas-grain');
  });
});
