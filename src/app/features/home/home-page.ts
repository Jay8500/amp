import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { RouterLink } from '@angular/router';
import { ConfigService } from '../../core/services/config.service';
import { ExpiryService } from '../../core/services/expiry.service';
import { RecordsService } from '../../core/services/records.service';
import { SessionService } from '../../core/services/session.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PoweredBy } from '../../shared/components/powered-by/powered-by';

@Component({
  selector: 'app-home-page',
  imports: [PoweredBy, RouterLink, MatIconModule, MatButtonModule, MatRippleModule, PageHeader],
  template: `
    <app-page-header [title]="'Hi, ' + session.displayName()" [back]="false">
      <a mat-icon-button routerLink="/settings" aria-label="Settings"><mat-icon>settings</mat-icon></a>
    </app-page-header>

    <div class="page">
      @if (config.syncError(); as err) {
        <div class="banner">
          <mat-icon>sync_problem</mat-icon>
          <span>Using saved settings: {{ err }}</span>
          <button mat-button (click)="config.refresh()">Retry</button>
        </div>
      }

      @if (expiry.attentionCount() || expiry.expired().length) {
        <a class="alert-strip" routerLink="/expiry" matRipple>
          <mat-icon>notifications_active</mat-icon>
          <span>
            @if (expiry.today().length) { <b>{{ expiry.today().length }}</b> expire today · }
            @if (expiry.soon().length) { <b>{{ expiry.soon().length }}</b> expiring soon · }
            <b>{{ expiry.expired().length }}</b> expired
          </span>
          <mat-icon>chevron_right</mat-icon>
        </a>
      }

      <div class="cards">
        <a class="card sale" routerLink="/ott-select" [queryParams]="{ next: 'sale' }" matRipple>
          <mat-icon>point_of_sale</mat-icon>
          <div>
            <h2>Sale</h2>
            <p>Sell a screen and send the details on WhatsApp</p>
          </div>
        </a>
        <a class="card data" routerLink="/ott-select" [queryParams]="{ next: 'data' }" matRipple>
          <mat-icon>key</mat-icon>
          <div>
            <h2>Data</h2>
            <p>Saved account IDs, passwords and screen slots</p>
          </div>
        </a>
        <a class="card recent" routerLink="/recent-sales" matRipple>
          <mat-icon>receipt_long</mat-icon>
          <div>
            <h2>Recent Sales</h2>
            <p>Filter, search and export to Excel</p>
          </div>
        </a>
      </div>
      <app-powered-by />
    </div>
  `,
  styles: `
    .cards { display: grid; gap: 14px; }
    /* Tablets / desktop: three tiles side by side, icon on top. */
    @media (min-width: 700px) {
      .cards { grid-template-columns: repeat(3, 1fr); }
      .card { flex-direction: column; align-items: flex-start; padding: 24px; min-height: 200px; }
    }
    .card {
      display: flex; align-items: center; gap: 18px; padding: 22px 20px; border-radius: 20px;
      text-decoration: none; color: inherit; position: relative; overflow: hidden;
    }
    .card mat-icon { width: 44px; height: 44px; font-size: 44px; flex: none; }
    .card h2 { margin: 0 0 4px; font: var(--mat-sys-title-large); }
    .card p { margin: 0; font: var(--mat-sys-body-medium); opacity: 0.85; }
    .sale { background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); }
    .data { background: var(--mat-sys-tertiary-container); color: var(--mat-sys-on-tertiary-container); }
    .recent { background: var(--mat-sys-secondary-container); color: var(--mat-sys-on-secondary-container); }
    .alert-strip {
      display: flex; align-items: center; gap: 10px; padding: 12px 14px; margin-bottom: 16px; border-radius: 14px;
      background: var(--mat-sys-error-container); color: var(--mat-sys-on-error-container); text-decoration: none; position: relative;
    }
    .alert-strip span { flex: 1; }
  `,
})
export class HomePage implements OnInit {
  protected session = inject(SessionService);
  protected config = inject(ConfigService);
  protected expiry = inject(ExpiryService);
  private records = inject(RecordsService);

  ngOnInit(): void {
    void this.records.load('sale');
  }
}
