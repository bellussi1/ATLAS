import { TestBed } from '@angular/core/testing';

import { IdeologyReadingIndexComponent } from './reading-index.component';

describe('IdeologyReadingIndexComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [IdeologyReadingIndexComponent] }));

  it('shows shared reading progress and marks the active chapter in both navigation controls', () => {
    const fixture = TestBed.createComponent(IdeologyReadingIndexComponent);
    fixture.componentRef.setInput('sections', [
      { anchor: 'origens', title: 'Origens', minutes: 4 },
      { anchor: 'correntes', title: 'Correntes' },
    ]);
    fixture.componentRef.setInput('active', 'correntes');
    fixture.componentRef.setInput('progress', 42);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector<HTMLProgressElement>('progress')?.value).toBe(42);
    expect(root.querySelector('[aria-current="location"]')?.textContent).toContain('Correntes');
    expect(root.querySelector<HTMLSelectElement>('select')?.value).toBe('correntes');
    expect(root.textContent).toContain('~4 min');
    expect(root.textContent).not.toContain('minundefined');
  });

  it('emits chapter selection, previous-point, and reduced-motion actions', () => {
    const fixture = TestBed.createComponent(IdeologyReadingIndexComponent);
    fixture.componentRef.setInput('sections', [{ anchor: 'origens', title: 'Origens' }]);
    fixture.componentRef.setInput('active', 'origens');
    fixture.componentRef.setInput('hasPrevious', true);
    fixture.detectChanges();

    const selected: string[] = [];
    let previousCount = 0;
    let motionCount = 0;
    fixture.componentInstance.chapterSelected.subscribe((anchor) => selected.push(anchor));
    fixture.componentInstance.previousRequested.subscribe(() => previousCount++);
    fixture.componentInstance.motionToggleRequested.subscribe(() => motionCount++);

    const root = fixture.nativeElement as HTMLElement;
    const link = root.querySelector<HTMLAnchorElement>('.desktop-nav a')!;
    const modifiedClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      metaKey: true,
    });
    link.dispatchEvent(modifiedClick);
    expect(modifiedClick.defaultPrevented).toBe(false);
    link.click();
    root.querySelector<HTMLSelectElement>('select')!.value = 'origens';
    root.querySelector<HTMLSelectElement>('select')!.dispatchEvent(new Event('change'));
    root.querySelector<HTMLButtonElement>('.return-control')!.click();
    root.querySelector<HTMLButtonElement>('.motion-control')!.click();

    expect(selected).toEqual(['origens', 'origens']);
    expect(previousCount).toBe(1);
    expect(motionCount).toBe(1);
  });
});
