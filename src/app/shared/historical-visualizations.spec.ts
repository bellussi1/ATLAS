import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AtlasHistoricalVisualizationsComponent } from './historical-visualizations';

describe('historical visualizations', () => {
  function component() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    return TestBed.createComponent(AtlasHistoricalVisualizationsComponent).componentInstance;
  }

  it('uses structured periods and sources without inventing dates', () => {
    const view = component();
    expect(view.records.find((record) => record.slug === 'ulysses-guimaraes')).toMatchObject({
      startYear: 1916, endYear: 1992, periodLabel: '1916–1992',
    });
    expect(view.records.find((record) => record.slug === 'promulgacao-constituicao-1988')?.sources)
      .toContainEqual({ id: 'source-diario-promulgacao', title: 'Diário da Assembleia Nacional Constituinte — 5 de outubro de 1988' });
    expect(view.records.some((record) => record.slug === 'plenario-camara-dos-deputados')).toBe(false);
  });

  it('filters the timeline by type and selects a record without dragging', () => {
    const view = component();
    view.selectKind('event');
    expect(view.timelineRecords().every((record) => record.kind === 'event')).toBe(true);
    expect(view.timelineRecords().map((record) => record.slug)).toEqual(expect.arrayContaining([
      'promulgacao-constituicao-1988', 'glorious-revolution', 'american-revolution', 'french-revolution',
    ]));
    expect(view.selectedTimeline()?.kind).toBe('event');
  });

  it('limits the comparison to three records and exposes no numerical score', () => {
    const view = component();
    for (const record of view.records.slice(2)) view.toggleComparison(record.id);
    expect(view.comparedRecords()).toHaveLength(3);
    expect(view.comparisonLimitReached()).toBe(true);
  });
});
