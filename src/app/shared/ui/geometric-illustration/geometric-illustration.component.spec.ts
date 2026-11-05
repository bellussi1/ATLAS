import { TestBed } from '@angular/core/testing';

import { AtlasGeometricIllustrationComponent } from './geometric-illustration.component';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(AtlasGeometricIllustrationComponent);
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('AtlasGeometricIllustrationComponent', () => {
  it('is an image with a short accessible name', () => {
    const el = render({ entityId: 'quilombismo', kind: 'ideology', title: 'Quilombismo' });
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Ilustração geométrica de Quilombismo');
    expect(el.querySelectorAll('svg .tile').length).toBe(9);
  });

  it('can be decorative when the title is next to it', () => {
    const el = render({ entityId: 'quilombismo', decorative: true });
    expect(el.getAttribute('role')).toBeNull();
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the same markup for the same record', () => {
    const a = render({ entityId: 'peronismo', kind: 'ideology' }).innerHTML;
    const b = render({ entityId: 'peronismo', kind: 'ideology' }).innerHTML;
    expect(a).toBe(b);
  });
});
