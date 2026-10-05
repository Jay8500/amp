import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { PIN_PATTERN } from '../../core/utils/validators';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatAutocompleteModule],
  template: `
    <div class="auth-page">
      <div class="brand-mark"><mat-icon>subscriptions</mat-icon></div>
      <h1>Accounts Manager</h1>
      <p class="sub">Sign in with your seller ID and PIN</p>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field>
          <mat-label>Seller ID</mat-label>
          <input matInput formControlName="sellerId" autocomplete="username" autocapitalize="none" [matAutocomplete]="ids" />
          <mat-autocomplete #ids>
            @for (id of knownIds(); track id) {
              <mat-option [value]="id">{{ id }}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>

        <mat-form-field>
          <mat-label>PIN</mat-label>
          <input matInput formControlName="pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="6" />
        </mat-form-field>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <button mat-flat-button type="submit" [disabled]="busy()">{{ busy() ? 'Signing in…' : 'Sign in' }}</button>
      </form>

      <div class="links">
        <a mat-button routerLink="/setup">New seller? Set up</a>
        <a mat-button routerLink="/forgot-pin">Forgot PIN?</a>
      </div>
    </div>
  `,
})
export class LoginPage implements OnInit {
  private session = inject(SessionService);
  private router = inject(Router);

  protected form = inject(FormBuilder).nonNullable.group({
    sellerId: ['', Validators.required],
    pin: ['', [Validators.required, Validators.pattern(PIN_PATTERN)]],
  });
  protected knownIds = signal<string[]>([]);
  protected busy = signal(false);
  protected error = signal('');

  async ngOnInit(): Promise<void> {
    const ids = await this.session.knownSellers();
    this.knownIds.set(ids);
    if (ids.length === 0) void this.router.navigateByUrl('/setup', { replaceUrl: true });
    else if (ids.length === 1) this.form.controls.sellerId.setValue(ids[0]);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.error.set('Enter your seller ID and 4–6 digit PIN.');
      return;
    }
    const { sellerId, pin } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set('');
    try {
      if (!(await this.session.sellerExists(sellerId))) {
        this.error.set('This seller ID is not set up on this device. Tap "New seller? Set up".');
      } else if (await this.session.login(sellerId, pin)) {
        await this.router.navigateByUrl('/home', { replaceUrl: true });
      } else {
        this.error.set('Incorrect PIN.');
        this.form.controls.pin.reset();
      }
    } finally {
      this.busy.set(false);
    }
  }
}
