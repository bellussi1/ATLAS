import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { readerProse } from '@core/content/editorial/reader-voice';
import { ContentMediaPipe } from '@core/content/media/content-media.pipe';
import type { AssetLicense, TemporalExtent } from '@core/content/models/content-schema';
import type { LinkedItinerary, LinkedReading } from '@core/content/queries/cross-links';
import { relationFamilies, type RelationFamilyId } from '@core/content/queries/knowledge-network';
import type {
  WorldMapConnection,
  WorldMapFilteredTerritory,
  WorldMapHotpoint,
  WorldMapLayerId,
  WorldMapRecord,
} from '@core/content/queries/world-map';
import { AtlasChevronComponent } from '@shared/ui/chevron/chevron.component';
import { AtlasGeometricIllustrationComponent } from '@shared/ui/geometric-illustration/geometric-illustration.component';
import { illustrationPalette } from '@shared/ui/geometric-illustration/illustration';
import { AtlasIconComponent } from '@shared/ui/icon/icon.component';
import {
  AtlasKindIconComponent,
  type IconKind,
  iconKind,
} from '@shared/ui/kind-icon/kind-icon.component';
import { AtlasStampComponent } from '@shared/ui/stamp/stamp.component';

interface RecordGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly WorldMapRecord[];
}

const LAYER_LABELS: Readonly<Record<WorldMapLayerId, string>> = {
  country: 'País atual',
  polity: 'Entidade histórica',
  locality: 'Cidade ou local',
};

const FAMILY_MAP = new Map(relationFamilies.map((f) => [f.id, f]));

function recordGroupBucket(kind: string): { id: string; label: string; order: number } {
  if (kind === 'event') return { id: 'events', label: 'Acontecimentos', order: 0 };
  if (kind === 'person' || kind === 'activist' || kind === 'politician') {
    return { id: 'people', label: 'Pessoas', order: 1 };
  }
  if (kind === 'work') return { id: 'works', label: 'Obras', order: 2 };
  if (kind === 'party' || kind === 'institution' || kind === 'ideology') {
    return { id: 'organizations', label: 'Instituições e ideias', order: 3 };
  }
  return { id: 'concepts', label: 'Conceitos e registros', order: 4 };
}

function splitLeadSummary(fullText: string): { lead: string; truncated: boolean } {
  const clean = fullText.trim();
  if (clean.length <= 230) return { lead: clean, truncated: false };
  const sentenceEnd = clean.indexOf('. ', 90);
  if (sentenceEnd > 0 && sentenceEnd <= 230) {
    return { lead: clean.slice(0, sentenceEnd + 1), truncated: true };
  }
  const spaceIdx = clean.lastIndexOf(' ', 215);
  const cut = spaceIdx > 100 ? spaceIdx : 215;
  return { lead: `${clean.slice(0, cut)}…`, truncated: true };
}

@Component({
  selector: 'app-map-study-desk',
  imports: [
    RouterLink,
    AtlasChevronComponent,
    AtlasGeometricIllustrationComponent,
    AtlasKindIconComponent,
    AtlasStampComponent,
    AtlasIconComponent,
    ContentMediaPipe,
  ],
  templateUrl: './map-study-desk.component.html',
  styleUrl: './map-study-desk.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapStudyDeskComponent {
  readonly territoryEntry = input<WorldMapFilteredTerritory | null>(null);
  readonly connection = input<WorldMapConnection | null>(null);
  readonly territoryConnections = input<readonly WorldMapConnection[]>([]);
  readonly readings = input<readonly LinkedReading[]>([]);
  readonly itineraries = input<readonly LinkedItinerary[]>([]);
  readonly highlightedRecordSlug = input<string | null>(null);
  readonly activePeriodLabel = input<string>('Todo o acervo (1750–2026)');
  readonly activeHotpoint = input<WorldMapHotpoint | null>(null);
  readonly hasTemporalFilter = input<boolean>(false);
  readonly media = input<AssetLicense | undefined>(undefined);
  readonly atlasId = input<string | null>(null);

  readonly closeDesk = output<void>();
  readonly collapseDesk = output<void>();
  readonly closeConnection = output<void>();
  readonly selectTerritory = output<string>();
  readonly selectConnection = output<string>();
  readonly hoverConnection = output<string | null>();

  readonly showAllRecords = linkedSignal({
    source: () => this.territoryEntry()?.territory.id,
    computation: () => false,
  });

  readonly palette = computed(() => illustrationPalette(this.atlasId()));

  readonly cleanSummary = computed(() => {
    const entry = this.territoryEntry();
    if (!entry) return '';
    return readerProse(entry.territory.summary) || entry.territory.summary;
  });

  readonly summaryLead = computed(() => splitLeadSummary(this.cleanSummary()));

  readonly visibleRecords = computed<readonly WorldMapRecord[]>(() => {
    const entry = this.territoryEntry();
    if (!entry) return [];
    const all = entry.activeRecords;
    const highlightSlug = this.highlightedRecordSlug();
    const ordered = highlightSlug
      ? [
          ...all.filter((r) => r.slug === highlightSlug),
          ...all.filter((r) => r.slug !== highlightSlug),
        ]
      : all;
    return this.showAllRecords() || ordered.length <= 8 ? ordered : ordered.slice(0, 8);
  });

  readonly groupedRecords = computed<readonly RecordGroup[]>(() => {
    const records = this.visibleRecords();
    const map = new Map<string, { label: string; order: number; items: WorldMapRecord[] }>();
    for (const rec of records) {
      const bucket = recordGroupBucket(rec.kind);
      const existing = map.get(bucket.id);
      if (existing) existing.items.push(rec);
      else map.set(bucket.id, { label: bucket.label, order: bucket.order, items: [rec] });
    }
    return [...map.entries()]
      .sort((a, b) => a[1].order - b[1].order)
      .map(([id, data]) => ({ id, label: data.label, items: data.items }));
  });

  /** The record behind the active timeline marker: what it is and how it ties to the territory. */
  readonly hotpointRecord = computed(() => {
    const hp = this.activeHotpoint();
    const record = hp
      ? this.territoryEntry()?.activeRecords.find((item) => item.slug === hp.slug)
      : undefined;
    if (!record) return null;
    const summary = readerProse(record.summary) ?? record.summary ?? '';
    const verb = record.relationLabel.trim();
    return {
      lead: summary ? splitLeadSummary(summary).lead : '',
      relation: verb.charAt(0).toLocaleUpperCase('pt-BR') + verb.slice(1),
    };
  });

  readonly hasGeoReference = computed(() => {
    const t = this.territoryEntry()?.territory;
    if (!t) return false;
    return Boolean(t.territorialScope || t.identityNote || t.isoAlpha2 || t.coordinates);
  });

  layerLabel(layer: WorldMapLayerId): string {
    return LAYER_LABELS[layer];
  }

  territoryIcon(layer: WorldMapLayerId): IconKind {
    return layer === 'locality' ? 'place' : 'polity';
  }

  recordIcon(kind: string): IconKind {
    return iconKind(kind);
  }

  familyLabel(familyId: RelationFamilyId): string {
    return FAMILY_MAP.get(familyId)?.label ?? 'Conexão';
  }

  familyColorVar(familyId: RelationFamilyId): string {
    return FAMILY_MAP.get(familyId)?.color ?? '--color-border-strong';
  }

  readableText(text: string | null | undefined): string {
    return readerProse(text) ?? text ?? '';
  }

  formatExtent(extent: TemporalExtent | null): string {
    if (!extent) return 'Sem datação estrita';
    if (extent.label) return extent.label;
    if (extent.startYear !== null && extent.endYear !== null) {
      return extent.startYear === extent.endYear
        ? String(extent.startYear)
        : `${extent.startYear}–${extent.endYear}`;
    }
    if (extent.startYear !== null) return `Desde ${extent.startYear}`;
    if (extent.endYear !== null) return `Até ${extent.endYear}`;
    return 'Sem datação estrita';
  }
}
