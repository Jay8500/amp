import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { FieldRole, FormField, SLOT_STATUS } from '../../core/models/form-config.model';
import { SheetRecord } from '../../core/models/record.model';
import { ConfigService } from '../../core/services/config.service';
import { RecordsService } from '../../core/services/records.service';
import { daysUntil, displayDate, parseDate } from '../../core/utils/dates';
import { BrandAvatar } from '../../shared/components/brand-avatar/brand-avatar';
import { confirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { DynamicGroup, buildGroup, fromRecord, toRecord } from '../../shared/components/dynamic-fields/dynamic-form';
import { DynamicFields } from '../../shared/components/dynamic-fields/dynamic-fields';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateMessage } from '../../shared/components/state-message/state-message';
import { AddAccountDialog } from './add-account-dialog';

type SortMode = 'selected' | 'empty' | 'validity' | 'sheet';

@Component({
  selector: 'app-data-page',
  imports: [
    FormsModule, MatButtonModule, MatButtonToggleModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatProgressBarModule, PageHeader, BrandAvatar, DynamicFields, StateMessage,
  ],
  templateUrl: './data-page.html',
  styleUrl: './data-page.scss',
})
export class DataPage implements OnInit {
  /** Brand id from the :brand route param. */
  readonly brand = input.required<string>();

  protected config = inject(ConfigService);
  protected records = inject(RecordsService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  protected selectedBrand = computed(() => this.config.brands().find((b) => b.id === this.brand()));
  protected fields = computed(() => this.config.credentialsForm().fields);
  protected sort = signal<SortMode>('sheet');
  protected search = signal('');
  /** Rows currently unlocked for editing, each with its own form. */
  protected editing = signal(new Map<string, DynamicGroup>());
  protected saving = signal<string | null>(null);
  protected revealed = signal(new Set<string>());

  private v = (row: SheetRecord, role: FieldRole) => this.records.value('credentials', row, role);

  protected rows = computed(() => {
    const name = this.selectedBrand()?.name.toLowerCase();
    const q = this.search().trim().toLowerCase();
    const all = (this.records.credentials() ?? []).filter((r) => this.v(r, 'brand').toLowerCase() === name);
    const filtered = q ? all.filter((r) => Object.values(r).some((x) => x?.toLowerCase().includes(q))) : all;
    return this.sorted(filtered);
  });

  protected counts = computed(() => {
    const name = this.selectedBrand()?.name.toLowerCase();
    let empty = 0, selected = 0;
    for (const r of this.records.credentials() ?? []) {
      if (this.v(r, 'brand').toLowerCase() !== name) continue;
      if (this.isEmpty(r)) empty++;
      else selected++;
    }
    return { empty, selected };
  });

  ngOnInit(): void {
    if (!this.selectedBrand()) {
      void this.router.navigate(['/ott-select'], { queryParams: { next: 'data' }, replaceUrl: true });
      return;
    }
    void this.records.load('credentials');
  }

  protected refresh(): void {
    this.editing.set(new Map());
    void this.records.load('credentials', true);
  }

  protected isEmpty(row: SheetRecord): boolean {
    return this.v(row, 'status').toLowerCase() !== SLOT_STATUS.selected.toLowerCase();
  }

  /** Fields shown in a locked card (everything except brand, which the page already shows). */
  protected displayFields(): FormField[] {
    return this.fields().filter((f) => f.role !== 'brand' && f.role !== 'status');
  }

  protected display(row: SheetRecord, f: FormField): string {
    const value = row[f.column] ?? '';
    if (f.type === 'date') return displayDate(value);
    if (f.type === 'password' && !this.revealed().has(row._id)) return value ? '••••••••' : '';
    return value;
  }

  protected validityBadge(row: SheetRecord): { text: string; tone: 'ok' | 'warn' | 'bad' } | null {
    const days = daysUntil(this.v(row, 'accountExpiry'));
    if (days === null) return null;
    if (days < 0) return { text: 'Account expired', tone: 'bad' };
    if (days <= this.config.settings().reminderDays) return { text: days === 0 ? 'Account ends today' : `Account ends in ${days}d`, tone: 'warn' };
    return null;
  }

  protected toggleReveal(id: string): void {
    this.revealed.update((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  protected unlock(row: SheetRecord): void {
    this.editing.update((m) => new Map(m).set(row._id, buildGroup(this.fields(), fromRecord(this.fields(), row))));
  }

  protected lock(id: string): void {
    this.editing.update((m) => {
      const next = new Map(m);
      next.delete(id);
      return next;
    });
  }

  protected async save(row: SheetRecord): Promise<void> {
    const group = this.editing().get(row._id);
    if (!group) return;
    if (group.invalid) {
      group.markAllAsTouched();
      return;
    }
    const next = toRecord(this.fields(), group.getRawValue());
    const changed = Object.fromEntries(Object.entries(next).filter(([col, val]) => (row[col] ?? '') !== val));
    if (!Object.keys(changed).length) {
      this.lock(row._id);
      return;
    }
    this.saving.set(row._id);
    try {
      await this.records.update('credentials', row._id, changed);
      this.lock(row._id);
      this.snack.open('Saved to Sheet');
    } catch (err) {
      this.snack.open((err as Error).message, 'OK', { duration: 6000 });
    } finally {
      this.saving.set(null);
    }
  }

  protected async remove(row: SheetRecord): Promise<void> {
    const ok = await confirmDialog(this.dialog, {
      title: 'Delete this row?',
      message: `${this.v(row, 'accountId')}${this.v(row, 'screenNo') ? ', screen ' + this.v(row, 'screenNo') : ''} will be deleted from your Sheet.`,
      confirm: 'Delete',
      danger: true,
    });
    if (!ok) return;
    this.saving.set(row._id);
    try {
      await this.records.remove('credentials', row._id);
      this.lock(row._id);
    } catch (err) {
      this.snack.open((err as Error).message, 'OK', { duration: 6000 });
    } finally {
      this.saving.set(null);
    }
  }

  protected addAccount(): void {
    this.dialog.open(AddAccountDialog, { data: this.selectedBrand(), width: '520px', maxWidth: '95vw', autoFocus: false });
  }

  private sorted(rows: SheetRecord[]): SheetRecord[] {
    const list = [...rows];
    switch (this.sort()) {
      case 'selected':
        return list.sort((a, b) => Number(this.isEmpty(a)) - Number(this.isEmpty(b)));
      case 'empty':
        return list.sort((a, b) => Number(this.isEmpty(b)) - Number(this.isEmpty(a)));
      case 'validity': {
        const t = (r: SheetRecord) => parseDate(this.v(r, 'accountExpiry'))?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return list.sort((a, b) => t(a) - t(b));
      }
      default:
        return list; // Sheet order, top to bottom
    }
  }
}
