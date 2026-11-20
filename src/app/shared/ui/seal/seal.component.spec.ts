import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AtlasSealComponent, type SealTone } from './seal.component';

@Component({
  imports: [AtlasSealComponent],
  template: '<app-seal [label]="label" [tone]="tone" />',
})
class SealHost {
  label = 'Com fontes · revisão pendente';
  tone: SealTone = 'accent';
}

describe('editorial seal', () => {
  it('prints the status as readable text', () => {
    const fixture = TestBed.createComponent(SealHost);
    fixture.detectChanges();
    const seal = (fixture.nativeElement as HTMLElement).querySelector('app-seal')!;

    expect(seal.textContent?.trim()).toBe('Com fontes · revisão pendente');
    expect(seal.getAttribute('data-tone')).toBe('accent');
  });

  it('switches ink by tone without changing the label', () => {
    const fixture = TestBed.createComponent(SealHost);
    fixture.componentInstance.tone = 'neutral';
    fixture.detectChanges();
    const seal = (fixture.nativeElement as HTMLElement).querySelector('app-seal')!;

    expect(seal.getAttribute('data-tone')).toBe('neutral');
    expect(seal.textContent?.trim()).toBe('Com fontes · revisão pendente');
  });
});
