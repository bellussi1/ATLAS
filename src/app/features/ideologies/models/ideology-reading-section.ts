export interface IdeologyReadingSection {
  anchor: string;
  title: string;
  minutes?: number;
  /** Canonical index group; consecutive sections sharing it are listed together. */
  group?: string;
}
