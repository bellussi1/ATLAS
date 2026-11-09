import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { ContentMediaPipe } from '@core/content/media/content-media.pipe';
import { placeTypeOf } from '@core/content/models/content-schema';
import { ContentRepository } from '@core/content/repositories/content-repository.service';
import { AtlasGeometricIllustrationComponent } from '@shared/ui/geometric-illustration/geometric-illustration.component';
import {
  atlasOf,
  illustrationPalette,
  needsIllustration,
} from '@shared/ui/geometric-illustration/illustration';
import {
  AtlasKindIconComponent,
  type IconKind,
  iconKind,
} from '@shared/ui/kind-icon/kind-icon.component';

/** Colour families shared with the context sheet, so a card and the sheet it opens match. */
export type RecordTone = 'person' | 'work' | 'concept' | 'event' | 'idea' | 'reading';

const toneByIcon: Record<IconKind, RecordTone> = {
  person: 'person',
  activist: 'person',
  politician: 'person',
  work: 'work',
  thesis: 'work',
  concept: 'concept',
  event: 'event',
  place: 'event',
  ideology: 'idea',
  party: 'idea',
  institution: 'idea',
  polity: 'idea',
  record: 'reading',
};

const kindNames: Record<string, string> = {
  person: 'Pessoa',
  work: 'Obra',
  concept: 'Conceito',
  event: 'Acontecimento',
  ideology: 'Corrente',
  institution: 'Instituição',
  party: 'Partido',
  place: 'Lugar',
  government: 'Governo',
  'historical-polity': 'Formação política',
};

/**
 * Uniform record card on a native button or link: kind (glyph and label), title, period and a
 * closing note (relations, classification). With `entityId` it fills itself from the graph
 * (except the picture, which callers pass); explicit inputs override. The licensed picture replaces the glyph corner, and the colour
 * family is the same as the context sheet's. The host stays a native control so opening
 * directives or router links sit on it.
 */
@Component({
  // Attribute selector so the host stays a native button or link.
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[appRecordCard], a[appRecordCard]',
  imports: [AtlasKindIconComponent, AtlasGeometricIllustrationComponent, ContentMediaPipe],
  templateUrl: './record-card.component.html',
  styleUrl: './record-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'record-card',
    '[attr.type]': "isButton ? 'button' : null",
    '[attr.data-tone]': 'shownTone()',
  },
})
export class RecordCardComponent {
  private readonly repository = inject(ContentRepository);
  readonly isButton = inject(ElementRef).nativeElement.tagName === 'BUTTON';
  readonly entityId = input<string | null>(null);
  readonly icon = input<IconKind | null>(null);
  readonly kindLabel = input<string | null>(null);
  readonly title = input<string | null>(null);
  readonly period = input<string | null>(null);
  readonly note = input<string | null>(null);
  readonly picture = input<string | null>(null);
  /** Flags must be shown whole, not cropped as a portrait; default keeps the portrait crop. */
  readonly pictureMode = input<'photo' | 'flag'>('photo');
  /** Colour family; defaults to the family of the glyph. Graph kinds are accepted too. */
  readonly tone = input<string | null>(null);

  /** The graph, or null before content loads; explicit inputs still render the card. */
  private readonly graph = computed(() => {
    if (!this.entityId()) return null;
    try {
      return this.repository.knowledgeGraph;
    } catch {
      return null;
    }
  });
  private readonly entity = computed(() => {
    const id = this.entityId();
    if (!id) return undefined;
    for (const atlas of this.graph()?.atlases ?? []) {
      const entity = atlas.entities.find((e) => e.id === id);
      if (entity) return entity;
    }
    return undefined;
  });
  readonly shownIcon = computed<IconKind>(() => {
    const entity = this.entity();
    return (
      this.icon() ?? iconKind(entity?.kind ?? 'record', entity ? placeTypeOf(entity) : undefined)
    );
  });
  readonly shownKind = computed(() => {
    if (this.kindLabel()) return this.kindLabel();
    const entity = this.entity();
    if (!entity) return 'Registro';
    if (entity.kind === 'place')
      return entity.placeType === 'country'
        ? 'País'
        : entity.placeType === 'regime'
          ? 'Regime'
          : 'Lugar';
    return kindNames[entity.kind] ?? 'Registro';
  });
  readonly shownTitle = computed(() => this.title() ?? this.entity()?.title ?? '');
  readonly shownPeriod = computed(() => {
    if (this.period() !== null) return this.period();
    const extent = this.entity()?.temporalExtent;
    if (!extent) return '';
    if (extent.label) return extent.label;
    if (extent.startYear === null) return '';
    return extent.endYear && extent.endYear !== extent.startYear
      ? `${extent.startYear}–${extent.endYear}`
      : `${extent.startYear}`;
  });
  readonly shownNote = computed(() => {
    if (this.note() !== null) return this.note();
    const id = this.entityId();
    if (!id) return '';
    const count = (this.graph()?.atlases ?? [])
      .flatMap((a) => a.relations)
      .filter((r) => r.fromEntityId === id || r.toEntityId === id).length;
    return count ? `${count} ${count === 1 ? 'relação' : 'relações'}` : '';
  });
  /** Pictures are opt-in so a licensed image appears once in the reading. */
  /** Own illustration, only for a graph record that has no licensed picture. */
  readonly illustration = computed(() => {
    const graph = this.graph();
    const id = this.entityId();
    if (!graph || !id || this.picture() || !this.entity()) return null;
    if (!needsIllustration(graph, id)) return null;
    return {
      id,
      kind: this.entity()!.kind,
      palette: illustrationPalette(atlasOf(graph, id)?.id),
    };
  });
  readonly shownPicture = computed(() => this.picture() ?? null);
  readonly shownTone = computed<RecordTone>(() => {
    const tone = this.tone();
    if (tone && tone in toneByIcon) return toneByIcon[tone as IconKind];
    if (tone && ['person', 'work', 'concept', 'event', 'idea', 'reading'].includes(tone))
      return tone as RecordTone;
    if (tone) return toneByIcon[iconKind(tone)];
    return toneByIcon[this.shownIcon()];
  });
}
