import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { clickPath, trackedPath } from './analytics-paths';

interface AtlasAnalyticsConfig {
  goatcounter?: string | null;
  cloudflare?: string | null;
}

declare global {
  interface Window {
    __ATLAS_ANALYTICS__?: AtlasAnalyticsConfig;
    goatcounter?: {
      count: (options: { path: string; title?: string; event?: boolean }) => void;
    };
  }
}

/**
 * Privacy-first analytics. Nothing is loaded unless the build injected a site token, so local
 * development and forks stay silent. Page views are sent on Router navigation; clicks are sent as
 * events with the route, never with page text or personal data.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private started = false;
  private goatReady = false;
  private lastTracked = '';
  private pending: string | null = null;

  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    const config = window.__ATLAS_ANALYTICS__;
    if (!config) return;
    if (config.cloudflare) this.loadCloudflare(config.cloudflare);
    if (!config.goatcounter) return;
    this.loadGoatCounter(config.goatcounter);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.trackPageview());
    this.document.addEventListener('click', this.onClick, true);
    this.destroyRef.onDestroy(() => this.document.removeEventListener('click', this.onClick, true));
    this.trackPageview();
  }

  /** Explicit event for a named interaction, if a component ever needs one. */
  event(name: string): void {
    if (!this.goatReady || !name) return;
    window.goatcounter?.count({ path: `event:${name}`, event: true });
  }

  private trackPageview(): void {
    const path = trackedPath(location.pathname, location.search);
    if (!path || path === this.lastTracked) return;
    this.lastTracked = path;
    if (!this.goatReady) {
      this.pending = path;
      return;
    }
    window.goatcounter?.count({ path, title: this.document.title, event: false });
  }

  private loadGoatCounter(site: string): void {
    const endpoint = /^https?:\/\//.test(site) ? site : `https://${site}.goatcounter.com`;
    const script = this.document.createElement('script');
    script.async = true;
    script.src = 'https://gc.zgo.at/count.js';
    script.setAttribute('data-goatcounter', `${endpoint.replace(/\/$/, '')}/count`);
    script.setAttribute('data-goatcounter-settings', JSON.stringify({ no_onload: true }));
    script.addEventListener('load', () => {
      this.goatReady = true;
      if (this.pending) {
        const path = this.pending;
        this.pending = null;
        window.goatcounter?.count({ path, title: this.document.title, event: false });
      }
    });
    this.document.head.appendChild(script);
  }

  private loadCloudflare(token: string): void {
    const script = this.document.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.setAttribute('data-cf-beacon', JSON.stringify({ token }));
    this.document.head.appendChild(script);
  }

  private readonly onClick = (event: MouseEvent): void => {
    if (!this.goatReady) return;
    const target = event.target instanceof Element ? event.target : null;
    const link = target?.closest<HTMLAnchorElement>('a[href]');
    if (!link) return;
    const path = clickPath(link.href, location.origin, link.dataset['analytics']);
    if (path) window.goatcounter?.count({ path, event: true });
  };
}
