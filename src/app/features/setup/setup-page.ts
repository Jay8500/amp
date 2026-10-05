import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { PingResult, SheetsApiService } from '../../core/services/sheets-api.service';
import { PIN_PATTERN, pinsMatch, scriptUrlValidator } from '../../core/utils/validators';
import { ScriptHelp } from '../../shared/components/script-help/script-help';
import { PoweredBy } from '../../shared/components/powered-by/powered-by';

@Component({
  selector: 'app-setup-page',
  imports: [PoweredBy, 
    ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, ScriptHelp,
  ],
  template: `
    <div class="auth-page wide">
      <div class="brand-mark"><mat-icon>add_link</mat-icon></div>
      <h1>Set up seller</h1>
      <p class="sub">Connect your own Google Sheet and choose a PIN for this device.</p>

      <button mat-stroked-button type="button" class="demo-btn" (click)="tryDemo()" [disabled]="demoBusy()">
        <mat-icon>play_circle</mat-icon> Try demo with sample data
      </button>
      <p class="demo-note">No Google Sheet needed. Nothing is saved.</p>

      <h2 class="step"><span>1</span> Connect Google Sheet</h2>
      <app-script-help />

      <form [formGroup]="connect" (ngSubmit)="test()" class="row-form">
        <mat-form-field>
          <mat-label>Apps Script Web app URL</mat-label>
          <input matInput formControlName="scriptUrl" type="url" placeholder="https://script.google.com/macros/s/…/exec" />
          @if (connect.controls.scriptUrl.hasError('scriptUrl')) {
            <mat-error>Must be a script.google.com/macros/s/…/exec URL</mat-error>
          }
        </mat-form-field>
        <button mat-stroked-button type="submit" [disabled]="testing()">
          @if (testing()) { <mat-spinner diameter="18" /> } @else { Test connection }
        </button>
      </form>
      @if (sheet(); as s) {
        <p class="ok"><mat-icon>check_circle</mat-icon> Connected to “{{ s.name }}”</p>
      }
      @if (connectError()) {
        <p class="error">{{ connectError() }}</p>
      }

      <h2 class="step" [class.disabled]="!sheet()"><span>2</span> Seller ID & PIN</h2>
      <form [formGroup]="account" (ngSubmit)="finish()">
        <fieldset [disabled]="!sheet()">
          <mat-form-field>
            <mat-label>Seller ID</mat-label>
            <input matInput formControlName="sellerId" autocapitalize="none" autocomplete="username" />
            <mat-hint>Any name you'll remember, e.g. your shop name</mat-hint>
          </mat-form-field>
          <mat-form-field>
            <mat-label>PIN (4–6 digits)</mat-label>
            <input matInput formControlName="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Confirm PIN</mat-label>
            <input matInput formControlName="confirmPin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" />
          </mat-form-field>
        </fieldset>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <button mat-flat-button type="submit" [disabled]="!sheet() || busy()">{{ busy() ? 'Saving…' : 'Finish setup' }}</button>
      </form>

      <div class="links"><a mat-button routerLink="/login">I already have a seller ID</a></div>
      <app-powered-by />
    </div>
  `,
  styles: `
    .step { display: flex; align-items: center; gap: 10px; font: var(--mat-sys-title-medium); margin: 28px 0 12px; align-self: stretch; }
    .step span { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--mat-sys-primary); color: var(--mat-sys-on-primary); font: var(--mat-sys-label-large); }
    .step.disabled { opacity: 0.5; }
    app-script-help { align-self: stretch; margin-bottom: 16px; }
    .row-form { display: grid; grid-template-columns: 1fr; gap: 8px; }
    fieldset { border: 0; padding: 0; margin: 0; display: grid; gap: 12px; }
    .ok { display: flex; align-items: center; gap: 6px; color: var(--mat-sys-primary); margin: 8px 0 0; align-self: stretch; }
  `,
})
export class SetupPage {
  private session = inject(SessionService);
  private api = inject(SheetsApiService);
  private router = inject(Router);
  private fb = inject(FormBuilder).nonNullable;

  protected connect = this.fb.group({ scriptUrl: ['', [Validators.required, scriptUrlValidator]] });
  protected account = this.fb.group(
    {
      sellerId: ['', Validators.required],
      pin: ['', [Validators.required, Validators.pattern(PIN_PATTERN)]],
      confirmPin: ['', Validators.required],
    },
    { validators: pinsMatch },
  );

  protected testing = signal(false);
  protected sheet = signal<PingResult | null>(null);
  protected connectError = signal('');
  protected busy = signal(false);
  protected error = signal('');

  constructor() {
    // Any edit to the URL invalidates a previous successful test.
    this.connect.controls.scriptUrl.valueChanges.subscribe(() => this.sheet.set(null));
  }

  async test(): Promise<void> {
    this.connect.markAllAsTouched();
    if (this.connect.invalid) return;
    this.testing.set(true);
    this.connectError.set('');
    try {
      this.sheet.set(await this.api.ping(this.connect.getRawValue().scriptUrl.trim()));
    } catch (err) {
      this.connectError.set((err as Error).message);
    } finally {
      this.testing.set(false);
    }
  }

  async finish(): Promise<void> {
    if (this.account.invalid) {
      this.error.set(this.account.hasError('pinMismatch') ? 'PINs do not match.' : 'Enter a seller ID and a 4–6 digit PIN.');
      return;
    }
    const { sellerId, pin } = this.account.getRawValue();
    if (await this.session.sellerExists(sellerId)) {
      this.error.set('This seller ID already exists on this device. Sign in, or use "Forgot PIN".');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.session.register(sellerId, pin, this.connect.getRawValue().scriptUrl);
      await this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  protected demoBusy = signal(false);

  async tryDemo(): Promise<void> {
    this.demoBusy.set(true);
    try {
      await this.session.startDemo();
      await this.router.navigateByUrl('/home', { replaceUrl: true });
    } finally {
      this.demoBusy.set(false);
    }
  }
}
