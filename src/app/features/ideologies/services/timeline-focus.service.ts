import { Injectable, signal } from '@angular/core';

/** The record the reader picked on a timeline, so other charts of the page can echo it. */
@Injectable({ providedIn: 'root' })
export class TimelineFocusService {
  readonly entityId = signal<string | null>(null);
}
