import { computed, Directive, ElementRef, HostListener, inject, input } from '@angular/core';
import { type ContextRequest, type ContextStop } from '@core/content/models/knowledge-context';
import {
  contextKey,
  ContextPanelService,
} from '@shared/ui/knowledge-context/context-panel.service';

/** Triggers of the same reading group, found by the directive's own marker attribute. */
const TRIGGER = '[data-context-trigger]';
const registry = new WeakMap<Element, KnowledgeContextDirective>();

@Directive({
  selector: 'button[appKnowledgeContext]',
  host: {
    'data-context-trigger': '',
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'expanded()',
    '[attr.aria-controls]': 'controls()',
    '[class.is-expanded]': 'expanded()',
  },
})
export class KnowledgeContextDirective {
  readonly request = input.required<ContextRequest>({ alias: 'appKnowledgeContext' });
  private readonly panel = inject(ContextPanelService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly expanded = computed(() => this.panel.active() === this.element);
  /** The open panel, named by the trigger while it owns it. */
  readonly controls = computed(() => (this.expanded() ? this.panel.dialogId() : null));

  constructor() {
    registry.set(this.element, this);
  }

  @HostListener('click')
  open(): void {
    this.panel.open(this.request(), this.element, this.readingOrder());
  }

  /**
   * Records of the chapter (or of the list the trigger sits in) in page order, each once.
   * A `data-context-group` ancestor wins; otherwise the nearest section, article or main.
   */
  private readingOrder(): ContextStop[] {
    const group =
      this.element.closest('[data-context-group]') ??
      this.element.closest('section, article, main') ??
      this.element.ownerDocument.body;
    const seen = new Set<string>();
    const stops: ContextStop[] = [];
    for (const trigger of group.querySelectorAll(TRIGGER)) {
      const directive = registry.get(trigger);
      if (!directive || !(trigger as HTMLElement).offsetParent) continue;
      const request = directive.request();
      const key = contextKey(request);
      if (seen.has(key)) continue;
      seen.add(key);
      stops.push({ key, request });
    }
    return stops;
  }
}
