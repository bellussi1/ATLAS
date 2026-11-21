import { isPlatformBrowser } from '@angular/common';
import {
  ApplicationRef,
  type ComponentRef,
  createComponent,
  EnvironmentInjector,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

import { TourStylesComponent } from './tour.styles.component';
import type { TourId, TourStep } from './tour.types';
import { TourLauncherComponent } from './tour-launcher.component';
import { tourIdForUrl, TOURS } from './tours';

const STORAGE_PREFIX = 'atlas:tour:v1:';
/** Longest the first visit waits for the page to have something to point at. */
const AUTO_WAIT_MS = 8000;
/** Once the first target shows, the page gets a moment to settle before the tour opens. */
const AUTO_SETTLE_MS = 700;
/** Pages whose toolbar carries the Tour button; the others get the floating one. */
const OWN_BUTTON: ReadonlySet<TourId> = new Set(['grafo', 'mapa']);
/** Query keys that do not make a link "a shared view": any other key skips the automatic tour. */
const NEUTRAL_QUERY = new Set(['camada', 'pagina']);

interface ActiveTour {
  destroy: () => void;
}

/**
 * Guided tour of the page in view, built on driver.js (loaded only when a tour starts). Every
 * page has its own steps in `tours.ts`; the service offers the tour once, remembers that it was
 * offered, and lets the reader start it again whenever they want.
 */
@Injectable({ providedIn: 'root' })
export class TourService {
  private readonly router = inject(Router);
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Tour that belongs to the page in view, or null where there is none. */
  readonly current = signal<TourId | null>(null);
  private launcher: ComponentRef<TourLauncherComponent> | null = null;
  private styles: { destroy: () => void } | null = null;
  private active: ActiveTour | null = null;
  private autoTimer: ReturnType<typeof setTimeout> | undefined;
  private autoToken = 0;

  /** Starts following navigation; called once when the app boots. */
  init(): void {
    if (!this.browser) return;
    const host = document.body.appendChild(document.createElement('div'));
    const launcher = createComponent(TourLauncherComponent, {
      environmentInjector: this.injector,
      hostElement: host,
    });
    launcher.instance.pressed.subscribe(() => void this.start());
    this.launcher = launcher;
    this.appRef.attachView(launcher.hostView);
    this.follow(this.router.url);
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.active?.destroy();
        this.cancelAuto();
        this.showLauncher(false);
      } else if (event instanceof NavigationEnd) {
        this.follow(event.urlAfterRedirects);
      }
    });
  }

  seen(id: TourId): boolean {
    try {
      return localStorage.getItem(STORAGE_PREFIX + id) === '1';
    } catch {
      return false;
    }
  }

  markSeen(id: TourId): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + id, '1');
    } catch {
      // Storage can be blocked; the tour then simply offers itself again next visit.
    }
  }

  /** Forgets every "already shown" flag, so each page offers its tour again on the next visit. */
  resetAll(): void {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key);
      }
    } catch {
      // Storage can be blocked; there is then nothing to forget.
    }
  }

  /** Runs the tour of the page in view (or of `id`). Steps whose target is absent are skipped. */
  async start(id: TourId | null = this.current()): Promise<void> {
    if (!this.browser || !id) return;
    this.active?.destroy();
    this.cancelAuto();
    this.showLauncher(false);
    this.markSeen(id);
    this.ensureStyles();
    const opener = document.activeElement as HTMLElement | null;
    // The page returns to its top before the spotlight appears, so nothing blinks while it scrolls.
    const [{ driver }] = await Promise.all([import('driver.js'), scrollToTop()]);
    const opened = await this.revealFoldedTargets(TOURS[id].steps);
    const steps = TOURS[id].steps.flatMap((step) => {
      const element = visibleElement(step.selector);
      return element
        ? [
            {
              ...(step.centered ? {} : { element }),
              popover: {
                title: step.title,
                description: step.body,
                side: step.side ?? 'bottom',
                align: 'start' as const,
              },
            },
          ]
        : [];
    });
    if (!steps.length) {
      this.fold(opened);
      return;
    }
    const calm = prefersCalm();
    const tour = driver({
      steps,
      showProgress: true,
      progressText: '{{current}} de {{total}}',
      nextBtnText: 'Próximo',
      prevBtnText: 'Voltar',
      doneBtnText: 'Concluir',
      closeBtnLabel: 'Fechar o tour',
      popoverClass: 'atlas-tour',
      overlayColor: '#211e1e',
      overlayOpacity: 0.6,
      stagePadding: 6,
      stageRadius: 2,
      animate: !calm,
      smoothScroll: !calm,
      allowClose: true,
      onDestroyed: () => {
        this.active = null;
        this.showLauncher(true);
        this.fold(opened);
        if (opener?.isConnected) opener.focus({ preventScroll: true });
        void scrollToTop();
      },
    });
    this.active = { destroy: () => tour.destroy() };
    tour.drive();
  }

  private follow(url: string): void {
    this.current.set(tourIdForUrl(url));
    this.showLauncher(true);
    this.scheduleAuto(url);
  }

  private showLauncher(visible: boolean): void {
    const id = this.current();
    this.launcher?.setInput('visible', visible && !!id && !OWN_BUTTON.has(id) && !this.active);
  }

  /**
   * First visit to a page: the tour opens by itself once the page has something to point at. It
   * stays quiet for shared views (a link that already picks a node or a territory), for pages the
   * reader has seen, and in automated browsers.
   */
  private scheduleAuto(url: string): void {
    this.cancelAuto();
    const id = this.current();
    if (!id || this.seen(id) || navigator.webdriver || isSharedView(url)) return;
    const token = ++this.autoToken;
    const first = Date.now();
    const poll = (): void => {
      if (token !== this.autoToken) return;
      const ready = TOURS[id].steps.some((step) => visibleElement(step.selector));
      if (ready) {
        this.autoTimer = setTimeout(() => {
          if (token === this.autoToken && !this.active) void this.start(id);
        }, AUTO_SETTLE_MS);
      } else if (Date.now() - first < AUTO_WAIT_MS) {
        this.autoTimer = setTimeout(poll, 250);
      }
    };
    this.autoTimer = setTimeout(poll, 400);
  }

  private cancelAuto(): void {
    this.autoToken += 1;
    clearTimeout(this.autoTimer);
  }

  private ensureStyles(): void {
    if (this.styles) return;
    const host = document.body.appendChild(document.createElement('div'));
    const ref = createComponent(TourStylesComponent, {
      environmentInjector: this.injector,
      hostElement: host,
    });
    this.appRef.attachView(ref.hostView);
    this.styles = { destroy: () => ref.destroy() };
  }

  /** Opens the drawers that hide a target, and reports which ones it opened. */
  private async revealFoldedTargets(steps: readonly TourStep[]): Promise<HTMLElement[]> {
    const opened: HTMLElement[] = [];
    for (const step of steps) {
      if (!step.reveal || visibleElement(step.selector)) continue;
      const control = document.querySelector<HTMLElement>(step.reveal);
      if (control && !opened.includes(control)) {
        control.click();
        opened.push(control);
      }
    }
    if (opened.length) await new Promise((resolve) => setTimeout(resolve, 280));
    return opened;
  }

  private fold(opened: readonly HTMLElement[]): void {
    for (const control of opened) {
      if (control.isConnected && control.getAttribute('aria-expanded') === 'true') control.click();
    }
  }
}

/** The reader asked for less motion, in the system or with the ATLAS motion control. */
function prefersCalm(): boolean {
  return (
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false) ||
    document.documentElement.classList.contains('atlas-reduced-motion')
  );
}

/**
 * Takes the page back to the top, smoothly, and resolves when it gets there (`scrollend`, with a
 * poll and a cap as fallback). With reduced motion the jump is immediate. A page that does not
 * scroll (the graph, the map) resolves at once.
 */
async function scrollToTop(): Promise<void> {
  if (window.scrollY <= 1) return;
  const calm = prefersCalm();
  window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  if (calm) return;
  await new Promise<void>((resolve) => {
    let last = window.scrollY;
    let still = 0;
    const finish = (): void => {
      clearTimeout(cap);
      clearInterval(poll);
      document.removeEventListener('scrollend', finish);
      resolve();
    };
    const cap = setTimeout(finish, 1500);
    const poll = setInterval(() => {
      still = window.scrollY === last ? still + 1 : 0;
      last = window.scrollY;
      if (window.scrollY <= 1 || still >= 5) finish();
    }, 60);
    document.addEventListener('scrollend', finish, { once: true });
  });
}

/** A link that already picks something (a node, a territory, a path) is a shared view. */
function isSharedView(url: string): boolean {
  const query = url.split('#')[0].split('?')[1];
  if (!query) return false;
  return [...new URLSearchParams(query).keys()].some((key) => !NEUTRAL_QUERY.has(key));
}

/** The first element for the selector that is actually on screen (not folded away). */
function visibleElement(selector: string): HTMLElement | null {
  for (const element of document.querySelectorAll<HTMLElement>(selector)) {
    if (element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden') {
      return element;
    }
  }
  return null;
}
