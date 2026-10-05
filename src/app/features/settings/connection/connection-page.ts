import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfigService } from '../../../core/services/config.service';
import { SessionService } from '../../../core/services/session.service';
import { PingResult, SheetsApiService } from '../../../core/services/sheets-api.service';
import { scriptUrlValidator } from '../../../core/utils/validators';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { ScriptHelp } from '../../../shared/components/script-help/script-help';

@Component({
  selector: 'app-connection-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressBarModule, PageHeader, ScriptHelp],
  template: `
    <app-page-header title="Google Sheet connection" fallback="/settings" />
    @if (busy()) {
      <mat-progress-bar mode="indeterminate" />
    }

    <div class="page">
      <section class="current">
        <h2>Current connection</h2>
        <p class="url">{{ masked() }}</p>
        @if (current(); as c) {
          <p class="ok"><mat-icon>check_circle</mat-icon> Connected to “{{ c.name }}”</p>
        } @else if (currentError()) {
          <p class="error">{{ currentError() }}</p>
        }
        <button mat-stroked-button type="button" (click)="checkCurrent()" [disabled]="busy()">Test connection</button>
      </section>

      <section>
        <h2>Change Apps Script URL</h2>
        <p class="hint">Use this after you re-deploy the script as a <i>new</i> deployment or move to a different Sheet. If you only made a new version of the same deployment, the URL stays the same.</p>
        <app-script-help [expanded]="false" />
        <mat-form-field class="full">
          <mat-label>New Web app URL</mat-label>
          <input matInput type="url" [formControl]="url" placeholder="https://script.google.com/macros/s/…/exec" />
          @if (url.hasError('scriptUrl')) {
            <mat-error>Must be a script.google.com/macros/s/…/exec URL</mat-error>
          }
        </mat-form-field>
        @if (newError()) {
          <p class="error">{{ newError() }}</p>
        }
        <button mat-flat-button type="button" (click)="change()" [disabled]="busy() || !url.value">Test & save</button>
      </section>
    </div>
  `,
  styles: `
    section { margin-bottom: 28px; }
    h2 { font: var(--mat-sys-title-medium); margin: 0 0 8px; }
    .url { font-family: monospace; word-break: break-all; margin: 0 0 8px; color: var(--mat-sys-on-surface-variant); }
    .ok { display: flex; align-items: center; gap: 6px; color: var(--mat-sys-primary); }
    .hint { font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); }
    app-script-help { display: block; margin-bottom: 16px; }
    .full { width: 100%; }
  `,
})
export class ConnectionPage {
  private session = inject(SessionService);
  private api = inject(SheetsApiService);
  private config = inject(ConfigService);
  private snack = inject(MatSnackBar);

  protected url = new FormControl('', { nonNullable: true, validators: [Validators.required, scriptUrlValidator] });
  protected busy = signal(false);
  protected current = signal<PingResult | null>(null);
  protected currentError = signal('');
  protected newError = signal('');

  /** Shows only the ends of the URL: it is effectively the password to the Sheet. */
  protected masked = () => {
    const u = this.session.scriptUrl();
    const id = u.match(/\/s\/([\w-]+)\//)?.[1] ?? '';
    return id ? u.replace(id, `${id.slice(0, 6)}…${id.slice(-4)}`) : u;
  };

  async checkCurrent(): Promise<void> {
    this.busy.set(true);
    this.currentError.set('');
    try {
      this.current.set(await this.api.ping());
    } catch (err) {
      this.current.set(null);
      this.currentError.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async change(): Promise<void> {
    this.url.markAsTouched();
    if (this.url.invalid) return;
    this.busy.set(true);
    this.newError.set('');
    try {
      const result = await this.api.ping(this.url.value.trim());
      await this.session.changeScriptUrl(this.url.value);
      await this.config.refresh();
      this.current.set(result);
      this.url.reset();
      this.snack.open(`Connected to “${result.name}”`);
    } catch (err) {
      this.newError.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
