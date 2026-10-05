import { Injectable, inject } from '@angular/core';
import { FormKind } from '../models/form-config.model';
import { SheetRecord } from '../models/record.model';
import { displayDate } from '../utils/dates';
import { fillTemplate } from '../utils/template';
import { ConfigService } from './config.service';

export const EXPIRY_STATUS_PLACEHOLDER = 'Expiry Status';

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private config = inject(ConfigService);

  /** Converts a typed number to wa.me format: digits only, with the default country code. */
  normalizePhone(raw: string): string {
    let digits = (raw || '').replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 10) digits = this.config.settings().countryCode + digits;
    return digits;
  }

  link(phone: string, message: string): string {
    return `https://wa.me/${this.normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
  }

  /** Placeholder values for a row: every column, with date columns shown as dd-MM-yyyy. */
  placeholders(kind: FormKind, row: Record<string, string | undefined>, extra: Record<string, string> = {}) {
    const values: Record<string, string> = {};
    const fields = this.config.form(kind).fields;
    for (const [col, v] of Object.entries(row)) values[col] = v ?? '';
    for (const f of fields) {
      if (f.type === 'date') values[f.column] = displayDate(row[f.column]);
      if (f.role === 'amount' && row[f.column]) values[f.column] = this.config.settings().currency + row[f.column];
    }
    return { ...values, ...extra };
  }

  saleMessage(row: Record<string, string>): string {
    return fillTemplate(this.config.templates().sale, this.placeholders('sale', row));
  }

  reminderMessage(row: SheetRecord, daysLeft: number): string {
    const status =
      daysLeft < 0 ? 'has expired' : daysLeft === 0 ? 'expires today' : daysLeft === 1 ? 'expires tomorrow' : `expires in ${daysLeft} days`;
    return fillTemplate(
      this.config.templates().reminder,
      this.placeholders('sale', row, { [EXPIRY_STATUS_PLACEHOLDER]: status }),
    );
  }

  /**
   * Opens WhatsApp. Returns false when the browser blocked the pop-up (common after an
   * `await`), so the caller can offer a tap-to-open button instead.
   */
  open(url: string): boolean {
    // Not using the 'noopener' feature: it makes window.open always return null, hiding blocks.
    const win = window.open(url, '_blank');
    if (!win) return false;
    try {
      win.opener = null;
    } catch {
      /* cross-origin already — fine */
    }
    return true;
  }
}
