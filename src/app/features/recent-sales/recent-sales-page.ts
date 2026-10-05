import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FieldRole } from '../../core/models/form-config.model';
import { SheetRecord } from '../../core/models/record.model';
import { ConfigService } from '../../core/services/config.service';
import { RecordsService } from '../../core/services/records.service';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { displayDate, parseDate, todayIso } from '../../core/utils/dates';
import { BrandAvatar } from '../../shared/components/brand-avatar/brand-avatar';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateMessage } from '../../shared/components/state-message/state-message';

interface SaleView {
  row: SheetRecord;
  brand: string;
  customerName: string;
  customerPhone: string;
  plan: string;
  activation: string;
  expiry: string;
  amount: number;
  /** Sort/filter date: activation date, or the time the row was added. */
  date: number;
}

@Component({
  selector: 'app-recent-sales-page',
  imports: [
    FormsModule, DecimalPipe, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatExpansionModule, MatProgressBarModule, PageHeader, BrandAvatar, StateMessage,
  ],
  templateUrl: './recent-sales-page.html',
  styleUrl: './recent-sales-page.scss',
})
export class RecentSalesPage implements OnInit {
  protected config = inject(ConfigService);
  protected records = inject(RecordsService);
  private whatsapp = inject(WhatsappService);
  private snack = inject(MatSnackBar);

  protected from = signal('');
  protected to = signal('');
  protected plan = signal('');
  protected brand = signal('');
  protected search = signal('');
  protected exporting = signal(false);
  protected displayDate = displayDate;

  protected activeFilters = computed(() => [this.from(), this.to(), this.plan(), this.brand(), this.search()].filter(Boolean).length);

  private all = computed<SaleView[]>(() => {
    const v = (row: SheetRecord, role: FieldRole) => this.records.value('sale', row, role);
    return (this.records.sales() ?? [])
      .map((row) => ({
        row,
        brand: v(row, 'brand'),
        customerName: v(row, 'customerName'),
        customerPhone: v(row, 'customerPhone'),
        plan: v(row, 'validity'),
        activation: v(row, 'activationDate'),
        expiry: v(row, 'expiryDate'),
        amount: Number(v(row, 'amount')) || 0,
        date: parseDate(v(row, 'activationDate'))?.getTime() ?? (row._createdAt ? Date.parse(row._createdAt) : 0),
      }))
      .sort((a, b) => b.date - a.date || (b.row._createdAt ?? '').localeCompare(a.row._createdAt ?? ''));
  });

  protected planOptions = computed(() => unique(this.all().map((s) => s.plan)));
  protected brandOptions = computed(() => unique(this.all().map((s) => s.brand)));

  protected filtered = computed(() => {
    const from = parseDate(this.from())?.getTime() ?? -Infinity;
    const to = parseDate(this.to())?.getTime() ?? Infinity;
    const q = this.search().trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return this.all().filter(
      (s) =>
        s.date >= from &&
        s.date <= to &&
        (!this.plan() || s.plan === this.plan()) &&
        (!this.brand() || s.brand.toLowerCase() === this.brand().toLowerCase()) &&
        (!q || s.customerName.toLowerCase().includes(q) || (qDigits.length >= 3 && s.customerPhone.replace(/\D/g, '').includes(qDigits))),
    );
  });

  protected total = computed(() => this.filtered().reduce((sum, s) => sum + s.amount, 0));

  ngOnInit(): void {
    void this.records.load('sale');
  }

  protected brandFor(name: string) {
    return this.config.brands().find((b) => b.name.toLowerCase() === name.toLowerCase());
  }

  protected clearFilters(): void {
    this.from.set('');
    this.to.set('');
    this.plan.set('');
    this.brand.set('');
    this.search.set('');
  }

  protected thisMonth(): void {
    const t = todayIso();
    this.from.set(t.slice(0, 8) + '01');
    this.to.set(t);
  }

  protected resend(s: SaleView): void {
    const row = s.row as unknown as Record<string, string>;
    this.whatsapp.open(this.whatsapp.link(s.customerPhone, this.whatsapp.saleMessage(row)));
  }

  protected async exportExcel(): Promise<void> {
    const rows = this.filtered();
    if (!rows.length) return;
    this.exporting.set(true);
    try {
      const { default: writeXlsxFile } = await import('write-excel-file/browser');
      const fields = this.config.saleForm().fields;
      const header = [...fields.map((f) => ({ value: f.label, fontWeight: 'bold' as const })), { value: 'Added', fontWeight: 'bold' as const }];
      const body = rows.map(({ row }) => [
        ...fields.map((f) => {
          const raw = row[f.column] ?? '';
          if (f.type === 'number' && raw !== '' && !isNaN(Number(raw))) return { value: Number(raw), type: Number };
          if (f.type === 'date') {
            const d = parseDate(raw);
            if (d) return { value: d, type: Date, format: 'dd-mm-yyyy' };
          }
          return { value: raw, type: String };
        }),
        { value: row._createdAt ? new Date(row._createdAt) : '', type: row._createdAt ? Date : String, format: 'dd-mm-yyyy hh:mm' },
      ]);
      await writeXlsxFile([header, ...body] as never, {
        sheet: 'Sales',
        stickyRowsCount: 1,
        columns: [...fields.map(() => ({ width: 18 })), { width: 18 }],
      }).toFile(`sales-${todayIso()}.xlsx`);
    } catch (err) {
      this.snack.open(`Export failed: ${(err as Error).message}`, 'OK');
    } finally {
      this.exporting.set(false);
    }
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
