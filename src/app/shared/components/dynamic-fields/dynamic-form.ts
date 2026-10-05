import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { FormField } from '../../../core/models/form-config.model';
import { SheetRecord } from '../../../core/models/record.model';

export type DynamicGroup = FormGroup<Record<string, FormControl<string>>>;

/** Builds a reactive form with one string control per configured field (keyed by field.key). */
export function buildGroup(fields: FormField[], initial: Record<string, string> = {}): DynamicGroup {
  const controls: Record<string, FormControl<string>> = {};
  for (const f of fields) {
    const validators: ValidatorFn[] = [];
    if (f.required) validators.push(Validators.required);
    if (f.type === 'phone') validators.push(Validators.pattern(/^[+\d][\d\s-]{6,}$/));
    if (f.type === 'number') validators.push(Validators.pattern(/^-?\d*(\.\d+)?$/));
    controls[f.key] = new FormControl(initial[f.key] ?? '', { nonNullable: true, validators });
  }
  return new FormGroup(controls);
}

/** Form value (by field key) → Sheet record (by column header). */
export function toRecord(fields: FormField[], value: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) out[f.column] = String(value[f.key] ?? '').trim();
  return out;
}

/** Sheet record (by column header) → form value (by field key). */
export function fromRecord(fields: FormField[], row: SheetRecord | Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) out[f.key] = row[f.column] ?? '';
  return out;
}

export function fieldKeyFor(fields: FormField[], role: FormField['role']): string | undefined {
  return fields.find((f) => f.role === role)?.key;
}
