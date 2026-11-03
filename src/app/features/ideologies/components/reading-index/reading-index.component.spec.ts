import { TestBed } from '@angular/core/testing';

import { IdeologyReadingIndexComponent } from './reading-index.component';

describe('IdeologyReadingIndexComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [IdeologyReadingIndexComponent] }));

  it('shows shared reading progress and marks the active chapter in both navigation controls', () => {
    const fixture = TestBed.createComponent(IdeologyReadingIndexComponent);
    fixture.componentRef.setInput('sections', [
      { anchor: 'origens', title: 'Origens', minutes: 4 },
      { anchor: 'vertentes', title: 'Correntes' },
    ]);
    fixture.componentRef.setInput('active', 'vertentes');
    fixture.componentRef.setInput('progress', 42);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector<HTMLProgressElement>('progress')?.value).toBe(42);
    expect(root.querySelector('[aria-current="location"]')?.textContent).toContain('Correntes');
    expect(root.querySelector<HTMLSelectElement>('select')?.value).toBe('vertentes');
    expect(root.textContent).toContain('4 min');
    expect(root.textContent).not.toContain('minundefined');
  });

  it('lists only the active act in the sidebar and every group in the mobile picker', () => {
    const fixture = TestBed.createComponent(IdeologyReadingIndexComponent);
    fixture.componentRef.setInput('sections', [
      { anchor: 'introducao', title: 'O que é?', group: 'Entender' },
      { anchor: 'origens', title: 'Origens', group: 'Entender' },
      { anchor: 'epocas', title: 'Épocas', group: 'Situar' },
    ]);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const acts = [...root.querySelectorAll('.index-act')];
    expect(acts.map((a) => a.firstChild?.textContent?.trim())).toEqual(['Entender', 'Situar']);
    expect(acts[1].getAttribute('href')).toBe('#epocas');
    expect(root.querySelector('.desktop-nav a[href="#origens"]:not(.index-act)')).not.toBeNull();
    expect(root.querySelector('.desktop-nav a[href="#epocas"]:not(.index-act)')).toBeNull();
    const groups = [...root.querySelectorAll('optgroup')];
    expect(groups.map((g) => g.label)).toEqual(['Entender', 'Situar']);
    expect(groups[0].querySelectorAll('option')).toHaveLength(2);
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
