import { TestBed } from '@angular/core/testing';

import { AtlasPaginationComponent, pageWindow } from './pagination.component';

describe('pageWindow', () => {
  it('keeps first, last, current and neighbours, with gaps for skipped ranges', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageWindow(3, 10)).toEqual([1, 2, 3, 4, null, 10]);
  });
});

describe('AtlasPaginationComponent', () => {
  it('marks the current page and emits the chosen one', () => {
    const fixture = TestBed.createComponent(AtlasPaginationComponent);
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('pageCount', 4);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const emitted: number[] = [];
    fixture.componentInstance.pageChange.subscribe((value) => emitted.push(value));
    expect(root.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('2');
    root.querySelector<HTMLButtonElement>('[aria-label="Página 3 de 4"]')!.click();
    [...root.querySelectorAll<HTMLButtonElement>('button')].at(-1)!.click();
    expect(emitted).toEqual([3, 3]);
  });

  it('renders nothing for a single page', () => {
    const fixture = TestBed.createComponent(AtlasPaginationComponent);
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('pageCount', 1);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('nav')).toBeNull();
  });
});
