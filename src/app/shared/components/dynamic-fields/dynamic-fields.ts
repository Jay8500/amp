import { Component, input, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { OttBrand } from '../../../core/models/brand.model';
import { FormField, ValidityPlan } from '../../../core/models/form-config.model';
import { ErrorStateMatcher } from '@angular/material/core';
import { displayDate } from '../../../core/utils/dates';
import { DynamicGroup, openDatePicker } from './dynamic-form';

/** Renders configured fields as Material inputs bound to a group built by `buildGroup`. */
@Component({
  selector: 'app-dynamic-fields',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatButtonModule],
  template: `
    <div class="fields" [formGroup]="group()">
      @for (f of fields(); track f.key) {
        @if (!hidden().includes(f.key)) {
          <mat-form-field [class.full]="f.type === 'textarea'">
            <mat-label>{{ f.label }}</mat-label>
            @switch (f.type) {
              @case ('brand') {
                <mat-select [formControlName]="f.key">
                  @for (b of brands(); track b.id) {
                    <mat-option [value]="b.name">{{ b.name }}</mat-option>
                  }
                  @if (unknownValue(f, brandNames())) {
                    <mat-option [value]="group().controls[f.key].value">{{ group().controls[f.key].value }}</mat-option>
                  }
                </mat-select>
              }
              @case ('validity') {
                <mat-select [formControlName]="f.key">
                  @for (p of plans(); track p.label) {
                    <mat-option [value]="p.label">{{ p.label }}</mat-option>
                  }
                  @if (unknownValue(f, planLabels())) {
                    <mat-option [value]="group().controls[f.key].value">{{ group().controls[f.key].value }}</mat-option>
                  }
                </mat-select>
              }
              @case ('select') {
                <mat-select [formControlName]="f.key">
                  @if (!f.required) {
                    <mat-option value="">—</mat-option>
                  }
                  @for (o of f.options ?? []; track o) {
                    <mat-option [value]="o">{{ o }}</mat-option>
                  }
                  @if (unknownValue(f, f.options ?? [])) {
                    <mat-option [value]="group().controls[f.key].value">{{ group().controls[f.key].value }}</mat-option>
                  }
                </mat-select>
              }
              @case ('textarea') {
                <textarea matInput [formControlName]="f.key" rows="2" [readonly]="readonly()"></textarea>
              }
              @case ('password') {
                <input matInput [formControlName]="f.key" [type]="revealed().has(f.key) ? 'text' : 'password'"
                       autocomplete="off" autocapitalize="none" spellcheck="false" [readonly]="readonly()" />
              }
              @case ('phone') {
                <input matInput [formControlName]="f.key" type="tel" inputmode="tel" autocomplete="off" [readonly]="readonly()" />
              }
              @case ('number') {
                <input matInput [formControlName]="f.key" inputmode="decimal" [readonly]="readonly()" />
              }
              @case ('date') {
                <!-- Shown as dd-MM-yyyy; the hidden native input provides the phone's calendar picker. -->
                <input matInput readonly class="date-display" placeholder="dd-mm-yyyy" [required]="f.required"
                       [value]="shownDate(f.key)" [errorStateMatcher]="dateErrors(f.key)"
                       (click)="pickDate(native)" (keydown.enter)="pickDate(native)" (keydown.space)="pickDate(native)" />
                <input #native type="date" class="native-date" tabindex="-1" aria-hidden="true"
                       [formControlName]="f.key" (change)="group().controls[f.key].markAsTouched()" />
              }
              @default {
                <input matInput [formControlName]="f.key" autocomplete="off" [readonly]="readonly()" />
              }
            }
            @if (f.type === 'date') {
              <mat-icon matSuffix class="date-icon" aria-hidden="true">calendar_month</mat-icon>
            }
            @if (f.type === 'password') {
              <button mat-icon-button matSuffix type="button" (click)="toggleReveal(f.key)"
                      [attr.aria-label]="revealed().has(f.key) ? 'Hide' : 'Show'">
                <mat-icon>{{ revealed().has(f.key) ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            }
            @if (group().controls[f.key].hasError('required')) {
              <mat-error>{{ f.label }} is required</mat-error>
            } @else if (group().controls[f.key].hasError('pattern')) {
              <mat-error>Enter a valid {{ f.type === 'phone' ? 'number' : 'value' }}</mat-error>
            }
          </mat-form-field>
        }
      }
    </div>
  `,
  styles: `
    .fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 12px 12px; }
    .full { grid-column: 1 / -1; }
    .date-display { cursor: pointer; }
    .date-icon { margin-right: 12px; color: var(--mat-sys-on-surface-variant); pointer-events: none; }
    .native-date { position: absolute; left: 0; bottom: 0; width: 1px; height: 1px; opacity: 0; pointer-events: none; border: 0; padding: 0; }
  `,
})
export class DynamicFields {
  readonly fields = input.required<FormField[]>();
  readonly group = input.required<DynamicGroup>();
  readonly brands = input<OttBrand[]>([]);
  readonly plans = input<ValidityPlan[]>([]);
  readonly hidden = input<string[]>([]);
  /** Text inputs become read-only; selects follow the group's disabled state. */
  readonly readonly = input(false);

  protected revealed = signal(new Set<string>());
  protected brandNames = () => this.brands().map((b) => b.name);
  protected planLabels = () => this.plans().map((p) => p.label);

  /** Keeps a value typed into the Sheet by hand selectable even if it isn't a known option. */
  protected unknownValue(f: FormField, known: string[]): boolean {
    const v = this.group().controls[f.key]?.value;
    return !!v && !known.includes(v);
  }

  protected shownDate(key: string): string {
    return displayDate(this.group().controls[key]?.value);
  }

  protected pickDate(native: HTMLInputElement): void {
    if (!this.readonly()) openDatePicker(native);
  }

  /** The visible date box isn't the form control, so it borrows the real control's error state. */
  protected dateErrors(key: string): ErrorStateMatcher {
    return (this.matchers[key] ??= { isErrorState: () => this.group().controls[key].invalid && this.group().controls[key].touched });
  }

  private matchers: Record<string, ErrorStateMatcher> = {};

  protected toggleReveal(key: string): void {
    this.revealed.update((s) => {
      const next = new Set(s);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }
}
