import { Component, PLATFORM_ID, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { IdeologyReadingComponent } from './ideology-reading.component';

@Component({
  imports: [IdeologyReadingComponent],
  template: `
    <app-ideology-reading [sections]="sections">
      <header readingOpening><h1>Leitura</h1></header>
      <section id="first" tabindex="-1">Primeiro capítulo</section>
      <section id="second" tabindex="-1">Segundo capítulo</section>
    </app-ideology-reading>
    <section id="outside" tabindex="-1">Fora da leitura</section>
  `,
})
class ReadingFixture {
  readonly reader = viewChild.required(IdeologyReadingComponent);
  readonly sections = [
    { anchor: 'first', title: 'Primeiro' },
    { anchor: 'second', title: 'Segundo' },
    { anchor: 'outside', title: 'Externo' },
  ];
}

describe('Shared ideology reading', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const fixture = TestBed.createComponent(ReadingFixture);
    fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, navigate, reader: fixture.componentInstance.reader() };
  }

  it('projects the opening outside the chapter sequence and starts with the first chapter current', () => {
    const { root } = setup();
    expect(root.querySelector('.chapter-sequence header')).toBeNull();
    expect(root.querySelector('header h1')?.textContent).toBe('Leitura');
    expect(root.querySelector('a[aria-current="location"]')?.getAttribute('href')).toBe('#first');
  });

  it('navigates from the index, preserves query parameters, focuses the chapter and returns', () => {
    const { root, fixture, navigate } = setup();
    root.querySelector<HTMLAnchorElement>('a[href="#second"]')!.click();
    fixture.detectChanges();
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({
        fragment: 'second',
        queryParamsHandling: 'preserve',
        replaceUrl: true,
      }),
    );
    expect(document.activeElement?.id).toBe('second');
    expect(root.querySelector('a[aria-current="location"]')?.getAttribute('href')).toBe('#second');
    const previous = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Voltar de onde veio'),
    )!;
    previous.click();
    fixture.detectChanges();
    expect(document.activeElement?.id).toBe('first');
    expect(root.querySelector('a[aria-current="location"]')?.getAttribute('href')).toBe('#first');
  });

  it('ignores missing anchors and targets outside the projected reading', () => {
    const { reader, navigate } = setup();
    reader.go('unknown');
    reader.go('outside');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps modified link clicks native and removes the motion preference when destroyed', () => {
    const { reader, fixture, navigate } = setup();
    const event = new MouseEvent('click', { ctrlKey: true, cancelable: true });
    reader.navigateChapter(event, 'second');
    expect(event.defaultPrevented).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    reader.toggleMotion();
    fixture.detectChanges();
    expect(document.documentElement.classList.contains('atlas-reduced-motion')).toBe(true);
    expect(fixture.nativeElement.querySelector('button[aria-pressed="true"]')).not.toBeNull();
    fixture.destroy();
    expect(document.documentElement.classList.contains('atlas-reduced-motion')).toBe(false);
  });
});
