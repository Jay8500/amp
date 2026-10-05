/** A Sheet row, keyed by column header. Values always arrive as strings from the bridge. */
export interface SheetRecord {
  _id: string;
  _createdAt?: string;
  [column: string]: string | undefined;
}

export const NOTIFIED_COL = '_notifiedAt';
