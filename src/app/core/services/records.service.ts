import { Injectable, inject, signal } from '@angular/core';
import { FieldRole, FormKind } from '../models/form-config.model';
import { SheetRecord } from '../models/record.model';
import { ConfigService } from './config.service';
import { SheetsApiService } from './sheets-api.service';

interface Collection {
  rows: ReturnType<typeof signal<SheetRecord[] | null>>;
  loading: ReturnType<typeof signal<boolean>>;
  error: ReturnType<typeof signal<string | null>>;
  inflight?: Promise<void>;
}

/**
 * Sales and credentials rows fetched from the seller's Sheet. Held in memory only — never
 * persisted on the device — and cleared on logout.
 */
@Injectable({ providedIn: 'root' })
export class RecordsService {
  private api = inject(SheetsApiService);
  private config = inject(ConfigService);

  private readonly collections: Record<FormKind, Collection> = {
    sale: { rows: signal(null), loading: signal(false), error: signal(null) },
    credentials: { rows: signal(null), loading: signal(false), error: signal(null) },
  };

  readonly sales = this.collections.sale.rows.asReadonly();
  readonly salesLoading = this.collections.sale.loading.asReadonly();
  readonly salesError = this.collections.sale.error.asReadonly();
  readonly credentials = this.collections.credentials.rows.asReadonly();
  readonly credentialsLoading = this.collections.credentials.loading.asReadonly();
  readonly credentialsError = this.collections.credentials.error.asReadonly();

  /** Fetches once per session unless `force` (pull-to-refresh / refresh button). */
  load(kind: FormKind, force = false): Promise<void> {
    const c = this.collections[kind];
    if (c.inflight) return c.inflight;
    if (c.rows() && !force) return Promise.resolve();
    c.loading.set(true);
    c.error.set(null);
    c.inflight = this.api
      .list(this.sheet(kind))
      .then((rows) => c.rows.set(rows))
      .catch((err: Error) => c.error.set(err.message))
      .finally(() => {
        c.loading.set(false);
        c.inflight = undefined;
      });
    return c.inflight;
  }

  async add(kind: FormKind, record: Record<string, string>): Promise<SheetRecord> {
    const saved = await this.api.append(this.sheet(kind), record);
    this.collections[kind].rows.update((rows) => (rows ? [...rows, saved] : rows));
    return saved;
  }

  async addMany(kind: FormKind, records: Record<string, string>[]): Promise<SheetRecord[]> {
    const saved = await this.api.appendMany(this.sheet(kind), records);
    this.collections[kind].rows.update((rows) => (rows ? [...rows, ...saved] : rows));
    return saved;
  }

  async update(kind: FormKind, id: string, patch: Record<string, string>): Promise<void> {
    await this.api.update(this.sheet(kind), id, patch);
    this.collections[kind].rows.update((rows) => rows?.map((r) => (r._id === id ? { ...r, ...patch } : r)) ?? null);
  }

  async remove(kind: FormKind, id: string): Promise<void> {
    await this.api.remove(this.sheet(kind), id);
    this.collections[kind].rows.update((rows) => rows?.filter((r) => r._id !== id) ?? null);
  }

  /** Reads a row's value by meaning rather than by column name. */
  value(kind: FormKind, row: SheetRecord, role: FieldRole): string {
    const col = this.config.column(kind, role);
    return (col && row[col]) || '';
  }

  /** Drops cached rows, e.g. after the sheet tab name or Apps Script URL changes. */
  clear(kind?: FormKind): void {
    for (const k of kind ? [kind] : (Object.keys(this.collections) as FormKind[])) {
      this.collections[k].rows.set(null);
      this.collections[k].error.set(null);
    }
  }

  private sheet(kind: FormKind): string {
    return this.config.form(kind).sheetName;
  }
}
