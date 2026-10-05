import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { PIN_PATTERN, pinsMatch } from '../../core/utils/validators';

@Component({
  selector: 'app-forgot-pin-page',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="auth-page">
      <div class="brand-mark"><mat-icon>lock_reset</mat-icon></div>
      <h1>Reset PIN</h1>
      <p class="sub">Paste the same Apps Script URL you connected this seller ID with. That proves the Google Sheet is yours.</p>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field>
          <mat-label>Seller ID</mat-label>
          <input matInput formControlName="sellerId" autocapitalize="none" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Apps Script URL</mat-label>
          <input matInput formControlName="scriptUrl" type="url" placeholder="https://script.google.com/macros/s/…/exec" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>New PIN (4–6 digits)</mat-label>
          <input matInput formControlName="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Confirm new PIN</mat-label>
          <input matInput formControlName="confirmPin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" />
        </mat-form-field>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <button mat-flat-button type="submit" [disabled]="busy()">{{ busy() ? 'Checking…' : 'Reset PIN' }}</button>
      </form>
      <div class="links"><a mat-button routerLink="/login">Back to sign in</a></div>
    </div>
  `,
})
export class ForgotPinPage {
  private session = inject(SessionService);
  private router = inject(Router);

  protected form = inject(FormBuilder).nonNullable.group(
    {
      sellerId: ['', Validators.required],
      scriptUrl: ['', Validators.required],
      pin: ['', [Validators.required, Validators.pattern(PIN_PATTERN)]],
      confirmPin: ['', Validators.required],
    },
    { validators: pinsMatch },
  );
  protected busy = signal(false);
  protected error = signal('');

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.error.set(this.form.hasError('pinMismatch') ? 'PINs do not match.' : 'Fill in all fields. PIN must be 4–6 digits.');
      return;
    }
    const { sellerId, scriptUrl, pin } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.session.resetPin(sellerId, scriptUrl, pin);
      if (result === 'unknown') this.error.set('This seller ID is not set up on this device.');
      else if (result === 'mismatch') this.error.set('That URL does not match the one saved for this seller ID.');
      else await this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
