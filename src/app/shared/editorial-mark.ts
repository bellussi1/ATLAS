import { Component, input } from '@angular/core';
import { EditorialType } from '../content/content-types';
@Component({
  selector: 'app-editorial-mark',
  template: `
    <svg viewBox="0 0 240 120" aria-hidden="true" focusable="false">
      @switch (kind()) {
        @case ('verbete') {
          <path fill="var(--color-teal-paper)" d="M0 0h240v120H0z"/>
          <path fill="var(--color-ink)" d="M0 0h80v120H0z"/>
          <circle cx="80" cy="60" r="45" fill="var(--color-ochre-paper)"/>
          <path d="M80 15a45 45 0 010 90z" fill="var(--color-accent)"/>
          <circle cx="80" cy="60" r="12" fill="var(--color-canvas)"/>
          <path d="M153 25h64M153 43h64M153 61h64M153 79h64M153 97h64" stroke="var(--color-ink)" stroke-width="2"/>
        }
        @case ('artigo') {
          <path fill="var(--color-rose-paper)" d="M0 0h240v120H0z"/>
          <path fill="var(--color-ink)" d="M0 120L120 0v120z"/>
          <path fill="var(--color-ochre-paper)" d="M120 0h120v120z"/>
          <path d="M140 20h76M140 40h56M140 60h36M140 80h16" stroke="var(--color-ink)" stroke-width="3"/>
          <circle cx="42" cy="30" r="13" fill="var(--color-accent)"/>
        }
        @default {
          <path fill="var(--color-ochre-paper)" d="M0 0h240v120H0z"/>
          <path fill="var(--color-teal-paper)" d="M0 0h120v120z"/>
          <path fill="var(--color-indigo)" d="M120 0h120v60H120z"/>
          <path d="M0 60h240M60 0v120M120 0v120M180 0v120" stroke="var(--color-ink)" stroke-width="1"/>
          <circle cx="60" cy="60" r="29" fill="var(--color-canvas)"/>
          <path d="M120 120l60-60 60 60z" fill="var(--color-accent)"/>
          <circle cx="180" cy="30" r="10" fill="var(--color-ochre-paper)"/>
        }
      }
    </svg>
  `,
  styles: `:host { display: block; } svg { display: block; width: 100%; height: 100%; }`,
})
export class AtlasEditorialMarkComponent {
  readonly kind = input<EditorialType>('atlas');
}
