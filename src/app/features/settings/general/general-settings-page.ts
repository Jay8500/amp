import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GeneralSettings, MessageTemplates, ValidityPlan } from '../../../core/models/form-config.model';
import { ConfigService } from '../../../core/services/config.service';
import { EXPIRY_STATUS_PLACEHOLDER } from '../../../core/services/whatsapp.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-general-settings-page',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressBarModule, PageHeader],
  template: `
    <app-page-header title="Plans & messages" fallback="/settings" />
    @if (saving()) {
      <mat-progress-bar mode="indeterminate" />
    }

    <div class="page">
      <section>
        <h2>Validity plans</h2>
        <p class="hint">Expiry date = activation date + months + days.</p>
        @for (p of plans(); track $index) {
          <div class="plan">
            <mat-form-field class="label">
              <mat-label>Name</mat-label>
              <input matInput [ngModel]="p.label" (ngModelChange)="setPlan($index, { label: $event })" />
            </mat-form-field>
            <mat-form-field class="num">
              <mat-label>Months</mat-label>
              <input matInput type="number" min="0" [ngModel]="p.months" (ngModelChange)="setPlan($index, { months: +$event || 0 })" />
            </mat-form-field>
            <mat-form-field class="num">
              <mat-label>Days</mat-label>
              <input matInput type="number" min="0" [ngModel]="p.days" (ngModelChange)="setPlan($index, { days: +$event || 0 })" />
            </mat-form-field>
            <button mat-icon-button type="button" aria-label="Remove plan" (click)="removePlan($index)" [disabled]="plans().length === 1">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        }
        <button mat-stroked-button type="button" (click)="addPlan()"><mat-icon>add</mat-icon> Add plan</button>
      </section>

      <section>
        <h2>WhatsApp messages</h2>
        <p class="hint">
          Use any Sheet column name in braces, e.g. {{ example }}. A line is left out when all its placeholders are empty.
        </p>
        <div class="chips">
          @for (c of placeholders(); track c) {
            <code>{{ '{' + c + '}' }}</code>
          }
        </div>
        <mat-form-field class="full">
          <mat-label>Sale confirmation</mat-label>
          <textarea matInput rows="12" [ngModel]="templates().sale" (ngModelChange)="setTemplate('sale', $event)"></textarea>
        </mat-form-field>
        <mat-form-field class="full">
          <mat-label>Expiry reminder</mat-label>
          <textarea matInput rows="6" [ngModel]="templates().reminder" (ngModelChange)="setTemplate('reminder', $event)"></textarea>
          <mat-hint>{{ '{' + expiryStatus + '}' }} becomes “expires in 2 days”, “expires today” or “has expired”.</mat-hint>
        </mat-form-field>
      </section>

      <section>
        <h2>General</h2>
        <div class="general">
          <mat-form-field>
            <mat-label>Country code</mat-label>
            <span matTextPrefix>+&nbsp;</span>
            <input matInput inputmode="numeric" [ngModel]="settings().countryCode" (ngModelChange)="setCountryCode($event)" />
            <mat-hint>Added to 10-digit numbers</mat-hint>
          </mat-form-field>
          <mat-form-field>
            <mat-label>“Expiring soon” window (days)</mat-label>
            <input matInput type="number" min="1" max="30" [ngModel]="settings().reminderDays" (ngModelChange)="setSetting({ reminderDays: +$event || 1 })" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Currency symbol</mat-label>
            <input matInput [ngModel]="settings().currency" (ngModelChange)="setSetting({ currency: $event })" />
          </mat-form-field>
        </div>
      </section>

      @if (dirty() || saving()) {
        <div class="save-bar">
          <button mat-flat-button type="button" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save changes' }}</button>
        </div>
      }
    </div>
  `,
  styles: `
    section { margin-bottom: 28px; }
    h2 { font: var(--mat-sys-title-medium); margin: 0 0 4px; }
    .hint { font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); margin: 0 0 12px; }
    .plan { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 8px; }
    .plan .label { flex: 2; }
    .plan .num { flex: 1; min-width: 0; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
    .chips code { padding: 2px 8px; border-radius: 8px; background: var(--mat-sys-surface-container-high); font-size: 12px; }
    .full { width: 100%; margin-bottom: 12px; }
    .general { display: grid; gap: 12px; }
    .save-bar { position: sticky; bottom: 0; padding: 12px 0 calc(12px + env(safe-area-inset-bottom)); background: linear-gradient(transparent, var(--mat-sys-surface) 30%); }
    .save-bar button { width: 100%; height: 48px; }
  `,
})
export class GeneralSettingsPage {
  private config = inject(ConfigService);
  private snack = inject(MatSnackBar);

  protected plans = signal<ValidityPlan[]>(structuredClone(this.config.plans()));
  protected templates = signal<MessageTemplates>({ ...this.config.templates() });
  protected settings = signal<GeneralSettings>({ ...this.config.settings() });
  protected saving = signal(false);
  protected dirty = signal(false);
  protected example = '{Customer Name}';
  protected expiryStatus = EXPIRY_STATUS_PLACEHOLDER;

  protected placeholders = computed(() => [...this.config.saleForm().fields.map((f) => f.column), EXPIRY_STATUS_PLACEHOLDER]);

  protected setPlan(index: number, patch: Partial<ValidityPlan>): void {
    this.plans.update((list) => list.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    this.dirty.set(true);
  }

  protected addPlan(): void {
    this.plans.update((list) => [...list, { label: '', months: 1, days: 0 }]);
    this.dirty.set(true);
  }

  protected removePlan(index: number): void {
    this.plans.update((list) => list.filter((_, i) => i !== index));
    this.dirty.set(true);
  }

  protected setTemplate(key: keyof MessageTemplates, value: string): void {
    this.templates.update((t) => ({ ...t, [key]: value }));
    this.dirty.set(true);
  }

  protected setSetting(patch: Partial<GeneralSettings>): void {
    this.settings.update((s) => ({ ...s, ...patch }));
    this.dirty.set(true);
  }

  protected setCountryCode(value: string): void {
    this.setSetting({ countryCode: value.replace(/\D/g, '') });
  }

  protected async save(): Promise<void> {
    const plans = this.plans().map((p) => ({ ...p, label: p.label.trim() }));
    if (plans.some((p) => !p.label || (p.months <= 0 && p.days <= 0))) {
      this.snack.open('Each plan needs a name and at least 1 month or day.', 'OK');
      return;
    }
    if (new Set(plans.map((p) => p.label.toLowerCase())).size !== plans.length) {
      this.snack.open('Plan names must be different.', 'OK');
      return;
    }
    this.saving.set(true);
    try {
      // Three small writes: each goes to its own _Config row.
      await this.config.savePlans(plans);
      await this.config.saveTemplates(this.templates());
      await this.config.saveSettings(this.settings());
      this.dirty.set(false);
      this.snack.open('Saved');
    } catch (err) {
      this.snack.open((err as Error).message, 'OK', { duration: 6000 });
    } finally {
      this.saving.set(false);
    }
  }
}
