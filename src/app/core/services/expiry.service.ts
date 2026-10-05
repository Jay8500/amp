import { Injectable, computed, inject } from '@angular/core';
import { NOTIFIED_COL, SheetRecord } from '../models/record.model';
import { daysUntil } from '../utils/dates';
import { ConfigService } from './config.service';
import { RecordsService } from './records.service';

export interface ExpiryItem {
  row: SheetRecord;
  daysLeft: number;
  brand: string;
  customerName: string;
  customerPhone: string;
  expiryDate: string;
  notifiedAt?: string;
}

/**
 * Derives expiry status from sales rows on the device (no scheduled jobs). A sale that was
 * renewed — a later sale for the same customer number + OTT — is not shown as expiring.
 */
@Injectable({ providedIn: 'root' })
export class ExpiryService {
  private records = inject(RecordsService);
  private config = inject(ConfigService);

  readonly items = computed<ExpiryItem[]>(() => {
    const rows = this.records.sales() ?? [];
    const v = (row: SheetRecord, role: Parameters<RecordsService['value']>[2]) => this.records.value('sale', row, role);
    this.config.saleForm(); // re-evaluate when column mapping changes

    const latest = new Map<string, ExpiryItem>();
    for (const row of rows) {
      const daysLeft = daysUntil(v(row, 'expiryDate'));
      if (daysLeft === null) continue;
      const item: ExpiryItem = {
        row,
        daysLeft,
        brand: v(row, 'brand'),
        customerName: v(row, 'customerName'),
        customerPhone: v(row, 'customerPhone'),
        expiryDate: v(row, 'expiryDate'),
        notifiedAt: row[NOTIFIED_COL] || undefined,
      };
      // Keyed by phone (last 10 digits) + OTT: a renewal often moves the customer to another account.
      const key = `${item.customerPhone.replace(/\D/g, '').slice(-10) || row._id}|${item.brand.toLowerCase()}`;
      const existing = latest.get(key);
      if (!existing || existing.daysLeft < daysLeft) latest.set(key, item);
    }
    return [...latest.values()].sort((a, b) => a.daysLeft - b.daysLeft);
  });

  readonly today = computed(() => this.items().filter((i) => i.daysLeft === 0));
  readonly soon = computed(() => {
    const window = this.config.settings().reminderDays;
    return this.items().filter((i) => i.daysLeft > 0 && i.daysLeft <= window);
  });
  readonly expired = computed(() => this.items().filter((i) => i.daysLeft < 0));
  readonly attentionCount = computed(() => this.today().length + this.soon().length);
}
