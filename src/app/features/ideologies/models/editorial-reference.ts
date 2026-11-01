/** Presentation contract; evidence selection and provenance remain with the caller. */
export interface EditorialReference {
  id: string;
  title: string;
  url: string | null;
  edition?: string;
  locator?: string;
}
