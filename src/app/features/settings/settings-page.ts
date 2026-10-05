import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { OttBrand } from '../../core/models/brand.model';
import { ConfigService } from '../../core/services/config.service';
import { SessionService } from '../../core/services/session.service';
import { BrandAvatar } from '../../shared/components/brand-avatar/brand-avatar';
import { confirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../shared/components/page-header/page-header';

@Component({
  selector: 'app-settings-page',
  imports: [RouterLink, MatListModule, MatIconModule, MatButtonModule, PageHeader, BrandAvatar],
  template: `
    <app-page-header title="Settings" />
    <mat-nav-list>
      <div mat-subheader>Forms</div>
      <a mat-list-item routerLink="/settings/form/sale">
        <mat-icon matListItemIcon>dynamic_form</mat-icon>
        <span matListItemTitle>Edit Sale Form</span>
        <span matListItemLine>Fields, order and Sheet columns</span>
      </a>
      <a mat-list-item routerLink="/settings/form/credentials">
        <mat-icon matListItemIcon>key</mat-icon>
        <span matListItemTitle>Edit Credentials Form</span>
        <span matListItemLine>Fields saved for each account / screen</span>
      </a>
      <a mat-list-item routerLink="/settings/general">
        <mat-icon matListItemIcon>tune</mat-icon>
        <span matListItemTitle>Plans & WhatsApp messages</span>
        <span matListItemLine>Validity plans, message text, country code</span>
      </a>

      <div mat-subheader>Account</div>
      <a mat-list-item routerLink="/settings/connection">
        <mat-icon matListItemIcon>link</mat-icon>
        <span matListItemTitle>Google Sheet connection</span>
        <span matListItemLine>Manage Apps Script URL</span>
      </a>
      <a mat-list-item (click)="logout()">
        <mat-icon matListItemIcon>logout</mat-icon>
        <span matListItemTitle>Sign out</span>
        <span matListItemLine>Signed in as {{ session.displayName() }}</span>
      </a>
    </mat-nav-list>

    @if (hidden().length) {
      <div class="page hidden-brands">
        <h3>Hidden brands</h3>
        @for (b of hidden(); track b.id) {
          <div class="row">
            <app-brand-avatar [brand]="b" [size]="32" />
            <span>{{ b.name }}</span>
            <button mat-button type="button" (click)="restore(b)">Show</button>
          </div>
        }
      </div>
    }
  `,
  styles: `
    .hidden-brands h3 { font: var(--mat-sys-title-small); margin: 0 0 8px; }
    .row { display: flex; align-items: center; gap: 12px; padding: 4px 0; }
    .row span { flex: 1; }
  `,
})
export class SettingsPage {
  protected session = inject(SessionService);
  private config = inject(ConfigService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  protected hidden = signal(this.config.hiddenBrands());

  async restore(brand: OttBrand): Promise<void> {
    try {
      await this.config.saveBrand({ ...brand, hidden: false });
      this.hidden.set(this.config.hiddenBrands());
    } catch (err) {
      this.snack.open((err as Error).message, 'OK');
    }
  }

  async logout(): Promise<void> {
    const ok = await confirmDialog(this.dialog, { title: 'Sign out?', message: 'You will need your PIN to sign in again.', confirm: 'Sign out' });
    if (!ok) return;
    await this.session.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
