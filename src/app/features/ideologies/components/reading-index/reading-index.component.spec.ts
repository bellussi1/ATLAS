import { TestBed } from '@angular/core/testing';

import { IdeologyReadingIndexComponent } from './reading-index.component';

describe('IdeologyReadingIndexComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [IdeologyReadingIndexComponent] }));

  it('shows shared reading progress and marks the active chapter in the sidebar, the sheet and the bar', () => {
    const fixture = TestBed.createComponent(IdeologyReadingIndexComponent);
    fixture.componentRef.setInput('sections', [
      { anchor: 'origens', title: 'Origens', minutes: 4 },
      { anchor: 'vertentes', title: 'Correntes' },
    ]);
    fixture.componentRef.setInput('active', 'vertentes');
    fixture.componentRef.setInput('progress', 42);
    fixture.detectChanges();

    fixture.componentInstance.openSheet();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector<HTMLProgressElement>('progress')?.value).toBe(42);
    expect(root.querySelector('[aria-current="location"]')?.textContent).toContain('Correntes');
    expect(root.querySelector('.sheet-list [aria-current="location"]')?.textContent).toContain(
      'Correntes',
    );
    expect(root.querySelector('.bar-title')?.textContent).toContain('Correntes');
    expect(root.querySelector('.bar-meta')?.textContent).toContain('Capítulo 2 de 2');
    expect(root.querySelector('[aria-label="Capítulo anterior"]')).not.toHaveProperty(
      'disabled',
      true,
    );
    expect(root.querySelector('[aria-label="Próximo capítulo"]')).toHaveProperty('disabled', true);
    expect(root.textContent).toContain('4 min');
    expect(root.textContent).not.toContain('minundefined');
  });

  it('lists the chapters of every act in the sidebar and in the phone sheet', () => {
    const fixture = TestBed.createComponent(IdeologyReadingIndexComponent);
    fixture.componentRef.setInput('sections', [
      { anchor: 'introducao', title: 'O que é?', group: 'Entender' },
      { anchor: 'origens', title: 'Origens', group: 'Entender' },
      { anchor: 'epocas', title: 'Épocas', group: 'Situar' },
    ]);
    fixture.componentInstance.openSheet();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const acts = [...root.querySelectorAll('.desktop-nav .index-act')];
    expect(acts.map((a) => a.firstChild?.textContent?.trim())).toEqual(['Entender', 'Situar']);
    expect(acts[1].getAttribute('href')).toBe('#epocas');
    expect(root.querySelector('.desktop-nav a[href="#origens"]:not(.index-act)')).not.toBeNull();
    expect(root.querySelector('.desktop-nav a[href="#epocas"]:not(.index-act)')).not.toBeNull();
    const sheetActs = [...root.querySelectorAll('.sheet-list .index-act')];
    expect(sheetActs.map((a) => a.firstChild?.textContent?.trim())).toEqual(['Entender', 'Situar']);
    expect(root.querySelectorAll('.sheet-list a:not(.index-act)')).toHaveLength(3);
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
    root.querySelector<HTMLButtonElement>('.return-control')!.click();
    root.querySelector<HTMLButtonElement>('.motion-control')!.click();

    expect(selected).toEqual(['origens']);
    expect(previousCount).toBe(1);
    expect(motionCount).toBe(1);
  });

  it('steps to the neighbouring chapters from the compact bar', () => {
    const fixture = TestBed.createComponent(IdeologyReadingIndexComponent);
    fixture.componentRef.setInput('sections', [
      { anchor: 'a', title: 'A' },
      { anchor: 'b', title: 'B' },
      { anchor: 'c', title: 'C' },
    ]);
    fixture.componentRef.setInput('active', 'b');
    fixture.detectChanges();

    const selected: string[] = [];
    fixture.componentInstance.chapterSelected.subscribe((anchor) => selected.push(anchor));
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Capítulo anterior"]')!.click();
    root.querySelector<HTMLButtonElement>('[aria-label="Próximo capítulo"]')!.click();
    expect(selected).toEqual(['a', 'c']);
  });
});
