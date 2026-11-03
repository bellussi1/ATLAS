import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { TimelineAxisItem } from '@ideologies/utils/timeline-axis-layout';
import { ContextPanelService } from '@shared/ui/knowledge-context/context-panel.service';

import { TimelineAxisComponent } from './timeline-axis.component';

const item = (
  id: string,
  kind: string,
  start: number,
  end = start,
  approximate = false,
): TimelineAxisItem => ({
  id,
  title: `Título ${id}`,
  kind,
  kindLabel: kind,
  start,
  end,
  approximate,
});

const items = [
  item('marx', 'person', 1818, 1883),
  item('manifesto', 'work', 1848),
  item('commune', 'event', 1871),
  item('lenin', 'person', 1870, 1924, true),
  item('revolution', 'event', 1917),
];

function create(list: readonly TimelineAxisItem[], selected: string | null = null) {
  const fixture = TestBed.createComponent(TimelineAxisComponent);
  fixture.componentRef.setInput('items', list);
  fixture.componentRef.setInput('selectedId', selected);
  const picked: string[] = [];
  fixture.componentInstance.picked.subscribe((id) => picked.push(id));
  fixture.detectChanges();
  return { fixture, picked, root: fixture.nativeElement as HTMLElement };
}

describe('TimelineAxisComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ContextPanelService,
          useValue: { active: signal(null), dialogId: signal(null), open: () => undefined },
        },
      ],
    });
  });

  it('splits records into one track per kind and marks approximate lives', () => {
    const { root } = create(items, 'marx');
    const tracks = [...root.querySelectorAll('.axis-track')].map((t) =>
      t.getAttribute('data-track'),
    );
    expect(tracks).toEqual(['people', 'works', 'events']);
    expect(root.querySelector('[data-axis-id="lenin"]')?.classList).toContain('is-approx');
    expect(root.querySelector('[data-axis-id="lenin"]')?.classList).toContain('is-life');
    expect(root.querySelector('[data-axis-id="marx"]')?.getAttribute('aria-current')).toBe('true');
    expect(root.querySelector('[data-axis-id="lenin"]')?.getAttribute('aria-label')).toContain(
      'data aproximada',
    );
  });

  it('keeps one tab stop and moves selection with arrows, Home and End', () => {
    const { root, picked } = create(items, 'marx');
    const stops = [...root.querySelectorAll('.axis-marker')].filter(
      (m) => m.getAttribute('tabindex') === '0',
    );
    expect(stops).toHaveLength(1);
    const press = (id: string, key: string) =>
      root
        .querySelector(`[data-axis-id="${id}"]`)!
        .dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    press('marx', 'ArrowRight');
    press('marx', 'End');
    press('marx', 'Home');
    press('marx', 'ArrowDown');
    expect(picked).toEqual(['manifesto', 'revolution', 'marx', 'manifesto']);
  });

  it('cuts by century and by free interval, with an accessible error for a bad one', () => {
    const { fixture, root } = create(items);
    const chips = [...root.querySelectorAll<HTMLButtonElement>('.axis-chip')];
    expect(chips.map((c) => c.textContent!.replace(/\s+/g, ' ').trim())).toEqual([
      'Tudo 5',
      'Século XIX 4',
      'Século XX 1',
    ]);
    chips[2]!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.visible().map((i) => i.id)).toEqual(['lenin', 'revolution']);

    fixture.componentInstance.fromField.set('1900');
    fixture.componentInstance.toField.set('1800');
    fixture.componentInstance.applyFields();
    fixture.detectChanges();
    expect(root.querySelector('.axis-error')?.getAttribute('role')).toBe('alert');

    fixture.componentInstance.fromField.set('1840');
    fixture.componentInstance.toField.set('1850');
    fixture.componentInstance.applyFields();
    fixture.detectChanges();
    expect(fixture.componentInstance.visible().map((i) => i.id)).toEqual(['marx', 'manifesto']);
    expect(root.querySelector('.axis-error')).toBeNull();
  });

  it('zooms within bounds, widening the axis', () => {
    const { fixture } = create(items);
    const axis = fixture.componentInstance;
    const before = axis.layout().width;
    axis.setZoom(1);
    expect(axis.layout().width).toBeGreaterThan(before);
    axis.setZoom(99);
    expect(axis.zoom()).toBe(axis.maxZoom());
    axis.setZoom(-5);
    expect(axis.zoom()).toBe(0);
  });

  it('opens the list on the picked record, folded past eight', () => {
    const many = Array.from({ length: 12 }, (_, i) => item(`e${i}`, 'event', 1900 + i));
    const { fixture, root, picked } = create(many, 'e10');
    expect(root.querySelectorAll('.axis-row')).toHaveLength(9);
    expect(root.querySelector('.axis-list li.current')?.textContent).toContain('Título e10');
    root.querySelector<HTMLButtonElement>('.axis-more')!.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.axis-row')).toHaveLength(12);
    root.querySelectorAll<HTMLButtonElement>('.axis-row')[0]!.click();
    expect(picked).toEqual(['e0']);
  });

  it('survives no records, one record and a single shared year', () => {
    const empty = create([]);
    expect(empty.root.querySelector('.axis-empty')?.textContent).toContain('Nenhum registro');
    const one = create([item('only', 'person', 1900)], 'only');
    expect(one.root.querySelectorAll('.axis-marker')).toHaveLength(1);
    const crowd = create(Array.from({ length: 20 }, (_, i) => item(`c${i}`, 'event', 1848)));
    expect(crowd.root.querySelectorAll('.axis-marker')).toHaveLength(20);
  });

  it('steps record by record from the buttons', () => {
    const { fixture, picked } = create(items, 'manifesto');
    fixture.componentInstance.step(1);
    fixture.componentInstance.step(-1);
    expect(picked).toEqual(['lenin', 'marx']);
  });

  it('cuts to the span chosen on the ruler by keyboard: Enter, arrows, Enter, and Esc cancels', () => {
    const { fixture, root } = create(items);
    const axis = fixture.componentInstance;
    const ruler = root.querySelector<HTMLElement>('.axis-ruler')!;
    const press = (key: string) =>
      ruler.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    press('Enter');
    expect(axis.brush()).not.toBeNull();
    press('Escape');
    expect(axis.brush()).toBeNull();
    press('Enter');
    for (let i = 0; i < 6; i++) press('ArrowRight');
    fixture.detectChanges();
    expect(root.querySelector('.axis-brush')).not.toBeNull();
    press('Enter');
    fixture.detectChanges();
    expect(axis.cut()).not.toBeNull();
    expect(axis.brush()).toBeNull();
    expect(axis.cut()!.to).toBeGreaterThan(axis.cut()!.from);
    expect(axis.visible().length).toBeLessThan(items.length);
  });

  it('cuts to a dragged span on the ruler and ignores a click without drag', () => {
    const { fixture, root } = create(items);
    const axis = fixture.componentInstance;
    const ruler = root.querySelector<HTMLElement>('.axis-ruler')!;
    ruler.setPointerCapture = () => undefined;
    ruler.getBoundingClientRect = () => ({ left: 0, width: 2000, top: 0, height: 44 }) as DOMRect;
    const fire = (type: string, x: number) =>
      ruler.dispatchEvent(
        Object.assign(new MouseEvent(type, { bubbles: true, button: 0, clientX: x }), {
          pointerId: 1,
        }),
      );
    fire('pointerdown', 100);
    fire('pointerup', 100);
    expect(axis.cut()).toBeNull();
    fire('pointerdown', 100);
    fire('pointermove', 900);
    fire('pointerup', 900);
    expect(axis.cut()).not.toBeNull();
    expect(axis.cut()!.from).toBeLessThan(axis.cut()!.to);
  });
});
