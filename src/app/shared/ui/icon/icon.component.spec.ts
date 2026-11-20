import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AtlasIconComponent, type AtlasIconName } from './icon.component';

@Component({
  imports: [AtlasIconComponent],
  template: '<app-icon [name]="name" [label]="label" />',
})
class IconHost {
  name: AtlasIconName = 'arrow-right';
  label: string | null = null;
}

describe('interface icon', () => {
  it('draws an SVG hidden from assistive tech when decorative', () => {
    const fixture = TestBed.createComponent(IconHost);
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('app-icon svg')!;

    expect(svg.querySelectorAll('path, line, polyline').length).toBeGreaterThan(0);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('exposes a title when the icon stands alone', () => {
    const fixture = TestBed.createComponent(IconHost);
    Object.assign(fixture.componentInstance, { name: 'close', label: 'Fechar' });
    fixture.detectChanges();
    const svg = (fixture.nativeElement as HTMLElement).querySelector('app-icon svg')!;

    expect(svg.querySelector('title')?.textContent).toBe('Fechar');
    expect(svg.getAttribute('aria-hidden')).not.toBe('true');
  });
});
