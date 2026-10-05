import { ValidityPlan } from '../models/form-config.model';

/** All dates in Sheets/forms are local calendar dates in `yyyy-MM-dd` form. */

export function toIsoDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Parses `yyyy-MM-dd` (or `dd/MM/yyyy`, `dd-MM-yyyy` typed by hand in the Sheet) as a local date. */
export function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const v = value.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(v);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
}

export function addPlan(startIso: string, plan: ValidityPlan): string {
  const start = parseDate(startIso);
  if (!start) return '';
  const day = start.getDate();
  const d = new Date(start.getFullYear(), start.getMonth() + plan.months, 1);
  // Clamp e.g. 31 Jan + 1 month to 28/29 Feb instead of rolling into March.
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay) + plan.days);
  return toIsoDate(d);
}

/** Whole days from today to the date: 0 = today, negative = past. */
export function daysUntil(value: string | undefined): number | null {
  const d = parseDate(value);
  if (!d) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

/** `dd-MM-yyyy`, the format customers expect in WhatsApp messages. */
export function displayDate(value: string | undefined): string {
  const d = parseDate(value);
  if (!d) return value ?? '';
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}
