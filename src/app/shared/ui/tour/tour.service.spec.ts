import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { TourService } from './tour.service';

const drive = vi.fn();
const destroy = vi.fn();
let config: { steps: { element?: Element; popover: { title: string } }[] } | null = null;

vi.mock('driver.js', () => ({
  driver: (options: typeof config) => {
    config = options;
    return { drive, destroy };
  },
}));

function show(selector: string, hidden = false): HTMLElement {
  const element = document.createElement('div');
  if (selector.startsWith('.')) element.className = selector.slice(1);
  element.textContent = selector;
  if (hidden) element.style.display = 'none';
  document.body.appendChild(element);
  return element;
}

describe('TourService', () => {
  beforeEach(() => {
    localStorage.clear();
    config = null;
    drive.mockClear();
    // jsdom has no layout: an element counts as on screen unless the test hides it.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (
      this: HTMLElement,
    ) {
      return (this.style.display === 'none' ? [] : [{}]) as unknown as DOMRectList;
    });
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('runs only the steps whose target is on screen and remembers that the tour was offered', async () => {
    show('.itineraries__intro');
    show('.itineraries__filters', true);
    show('.itinerary-card__trail');
    const service = TestBed.inject(TourService);

    expect(service.seen('itinerarios')).toBe(false);
    await service.start('itinerarios');

    expect(drive).toHaveBeenCalledOnce();
    expect(config?.steps.map((step) => step.popover.title)).toEqual([
      'Itinerários',
      'Prévia das paradas',
    ]);
    expect(service.seen('itinerarios')).toBe(true);
  });

  it('explains a full-screen target in a centred card, without a spotlight', async () => {
    show('.canvas');
    await TestBed.inject(TourService).start('grafo');

    const step = config?.steps.find((item) => item.popover.title === 'A rede');
    expect(step).toBeTruthy();
    expect(step?.element).toBeUndefined();
  });

  it('does not start when the page has no visible target at all', async () => {
    await TestBed.inject(TourService).start('acervo');

    expect(drive).not.toHaveBeenCalled();
  });

  describe('scrolling', () => {
    const scrollTo = vi.fn();

    beforeEach(() => {
      scrollTo.mockClear();
      window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
      Object.defineProperty(window, 'scrollY', { value: 600, configurable: true });
      show('.itineraries__intro');
    });

    afterEach(() => {
      Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
      document.documentElement.classList.remove('atlas-reduced-motion');
    });

    it('takes the page to the top smoothly before the spotlight opens', async () => {
      const done = TestBed.inject(TourService).start('itinerarios');
      document.dispatchEvent(new Event('scrollend'));
      await done;

      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      expect(drive).toHaveBeenCalledOnce();
      expect(scrollTo.mock.invocationCallOrder[0]).toBeLessThan(drive.mock.invocationCallOrder[0]);
    });

    it('jumps at once when the reader asked for less motion', async () => {
      document.documentElement.classList.add('atlas-reduced-motion');

      await TestBed.inject(TourService).start('itinerarios');

      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
      expect(config).toMatchObject({ animate: false, smoothScroll: false });
    });

    it('does not scroll a page that is already at the top', async () => {
      Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });

      await TestBed.inject(TourService).start('itinerarios');

      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('goes back to the top when the tour ends', async () => {
      Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
      await TestBed.inject(TourService).start('itinerarios');
      Object.defineProperty(window, 'scrollY', { value: 450, configurable: true });

      (config as unknown as { onDestroyed: () => void }).onDestroyed();

      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });
  });

  it('forgets which tours were shown, so every page offers its tour again', () => {
    const service = TestBed.inject(TourService);
    service.markSeen('leituras');
    service.markSeen('mapa');
    localStorage.setItem('atlas:other', '1');

    service.resetAll();

    expect(service.seen('leituras')).toBe(false);
    expect(service.seen('mapa')).toBe(false);
    expect(localStorage.getItem('atlas:other')).toBe('1');
  });
});
