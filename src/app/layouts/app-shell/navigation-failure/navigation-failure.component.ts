import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';

export type NavigationFailureKind = 'chunk' | 'route';

/**
 * Recovery surface for a navigation that did not complete. It sits above the preserved page,
 * names the kind of destination that failed and offers one retry, one way back and one way out.
 */
@Component({
  selector: 'app-navigation-failure',
  imports: [RouterLink],
  templateUrl: './navigation-failure.component.html',
  styleUrl: './navigation-failure.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationFailureComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** URL the router tried to open. */
  readonly path = input.required<string>();
  /** A chunk/network failure is retryable; a route failure is not necessarily. */
  readonly kind = input<NavigationFailureKind>('route');
  /** Page that stayed on screen, when there was one. */
  readonly previousTitle = input<string | null>(null);
  readonly retrying = input(false);

  readonly retry = output<void>();
  readonly dismiss = output<void>();

  readonly title = computed(() => {
    const path = this.path();
    if (/^\/leitura\//.test(path)) return 'A leitura não abriu';
    if (/^\/verbete\//.test(path)) return 'O verbete não abriu';
    if (/^\/grafos?\b/.test(path)) return 'O grafo não abriu';
    if (/^\/acervo\b/.test(path)) return 'O acervo não abriu';
    return 'A página não abriu';
  });

  readonly lead = computed(() =>
    this.kind() === 'chunk'
      ? 'Um recurso necessário não carregou. Verifique a conexão e tente novamente.'
      : 'A navegação para este endereço não foi concluída. O conteúdo anterior continua disponível.',
  );

  readonly pathLabel = computed(() => {
    try {
      return decodeURI(this.path());
    } catch {
      return this.path();
    }
  });

  /** Reading failures go back to the reading index; other failures go to the archive search. */
  readonly recoveryPath = computed(() => (/^\/leitura\//.test(this.path()) ? '/' : '/acervo'));
  readonly recoveryFragment = computed(() =>
    /^\/leitura\//.test(this.path()) ? 'leituras' : undefined,
  );
  readonly recoveryLabel = computed(() =>
    /^\/leitura\//.test(this.path()) ? 'Ver outras leituras' : 'Buscar no acervo',
  );

  constructor() {
    // The alert is the new context; move focus to its heading without stealing the scroll.
    afterNextRender(() =>
      this.host.nativeElement.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true }),
    );
  }
}
