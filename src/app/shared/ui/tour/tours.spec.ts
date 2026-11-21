import { tourIdForUrl, TOURS } from './tours';

describe('page tours', () => {
  it('maps each tour page to its tour and leaves other pages without one', () => {
    expect(tourIdForUrl('/leituras')).toBe('leituras');
    expect(tourIdForUrl('/leituras?pagina=2')).toBe('leituras');
    expect(tourIdForUrl('/leitura/marxismo')).toBe('leitura');
    expect(tourIdForUrl('/itinerarios/')).toBe('itinerarios');
    expect(tourIdForUrl('/itinerario/esquerda-direita-e-populismos#parada-2')).toBe('itinerario');
    expect(tourIdForUrl('/acervo?camada=registros')).toBe('acervo');
    expect(tourIdForUrl('/acervo/pessoas')).toBe('acervo');
    expect(tourIdForUrl('/mapa?pais=brasil')).toBe('mapa');
    expect(tourIdForUrl('/grafos?no=person-karl-marx')).toBe('grafo');
    expect(tourIdForUrl('/')).toBeNull();
    expect(tourIdForUrl('/verbete/karl-marx')).toBeNull();
    expect(tourIdForUrl('/privacidade')).toBeNull();
  });

  it('has a tour for each of the seven pages, each with titled, explained steps', () => {
    const ids = Object.keys(TOURS).sort();

    expect(ids).toEqual(
      ['acervo', 'grafo', 'itinerario', 'itinerarios', 'leitura', 'leituras', 'mapa'].sort(),
    );
    for (const tour of Object.values(TOURS)) {
      expect(tour.steps.length).toBeGreaterThanOrEqual(4);
      for (const step of tour.steps) {
        expect(step.selector.trim()).not.toBe('');
        expect(step.title.trim()).not.toBe('');
        expect(step.body.length).toBeGreaterThan(30);
        expect(step.body).not.toMatch(/—/);
      }
    }
  });

  it('keeps selectors valid CSS', () => {
    for (const tour of Object.values(TOURS)) {
      for (const step of tour.steps) {
        expect(() => document.querySelector(step.selector)).not.toThrow();
        if (step.reveal) expect(() => document.querySelector(step.reveal!)).not.toThrow();
      }
    }
  });
});
