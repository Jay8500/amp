import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { NOTIFIED_COL } from '../../core/models/record.model';
import { ConfigService } from '../../core/services/config.service';
import { ExpiryItem, ExpiryService } from '../../core/services/expiry.service';
import { RecordsService } from '../../core/services/records.service';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { displayDate } from '../../core/utils/dates';
import { BrandAvatar } from '../../shared/components/brand-avatar/brand-avatar';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateMessage } from '../../shared/components/state-message/state-message';

@Component({
  selector: 'app-expiry-page',
  imports: [MatTabsModule, MatButtonModule, MatIconModule, MatProgressBarModule, PageHeader, BrandAvatar, StateMessage],
  template: `
    <app-page-header title="Expiry" [back]="false">
      <button mat-icon-button type="button" aria-label="Refresh" (click)="records.load('sale', true)"><mat-icon>refresh</mat-icon></button>
    </app-page-header>
    @if (records.salesLoading() && records.sales()) {
      <mat-progress-bar mode="indeterminate" />
    }

    <mat-tab-group [selectedIndex]="tab()" (selectedIndexChange)="tab.set($event)" mat-stretch-tabs animationDuration="150ms">
      @for (t of tabs(); track t.label) {
        <mat-tab>
          <ng-template mat-tab-label>
            <span class="tab-label">{{ t.label }} <span class="count" [class.hot]="t.hot && t.count">{{ t.count }}</span></span>
          </ng-template>
        </mat-tab>
      }
    </mat-tab-group>

    <div class="page">
      @if (!records.sales()) {
        <app-state-message [loading]="records.salesLoading()" [error]="records.salesError()" (retry)="records.load('sale', true)" />
      } @else {
        @for (item of list(); track item.row._id) {
          <article class="item" [class]="tone(item)">
            <app-brand-avatar [brand]="brandFor(item.brand)" [name]="item.brand" [size]="40" />
            <div class="main">
              <b>{{ item.customerName || item.customerPhone }}</b>
              <div class="sub">{{ item.brand }} · {{ displayDate(item.expiryDate) }}</div>
              <div class="sub status">
                {{ statusText(item) }}
                @if (item.notifiedAt) { · notified {{ ago(item.notifiedAt) }} }
              </div>
            </div>
            <button mat-flat-button type="button" class="notify" (click)="notify(item)" [disabled]="!item.customerPhone">
              <mat-icon>chat</mat-icon> Notify
            </button>
          </article>
        } @empty {
          <app-state-message icon="event_available" [message]="emptyText()" />
        }
      }
    </div>
  `,
  styles: `
    mat-tab-group { max-width: 720px; margin: 0 auto; --mat-tab-container-height: 48px; }
    :host ::ng-deep .mat-mdc-tab { min-width: 0; padding: 0 6px; flex-grow: 1; }
    .tab-label { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
    .count {
      min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; display: inline-grid; place-items: center;
      font: var(--mat-sys-label-small); background: var(--mat-sys-surface-container-highest); color: var(--mat-sys-on-surface-variant);
    }
    .count.hot { background: var(--mat-sys-error); color: var(--mat-sys-on-error); }
    .item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .main { flex: 1; min-width: 0; }
    .sub { font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); }
    .status { font-weight: 500; }
    .item.today .status, .item.expired .status { color: var(--mat-sys-error); }
    .item.soon .status { color: #b26a00; }
    .notify { flex: none; }
  `,
})
export class ExpiryPage implements OnInit {
  protected config = inject(ConfigService);
  protected expiry = inject(ExpiryService);
  protected records = inject(RecordsService);
  private whatsapp = inject(WhatsappService);
  private snack = inject(MatSnackBar);

  protected tab = signal(1);
  protected displayDate = displayDate;

  protected list = computed<ExpiryItem[]>(() => {
    switch (this.tab()) {
      case 1: return this.expiry.soon();
      case 2: return this.expiry.today();
      case 3: return [...this.expiry.expired()].reverse(); // most recently expired first
      default: return this.expiry.items();
    }
  });

  protected tabs = computed(() => [
    { label: 'All', count: this.expiry.items().length, hot: false },
    { label: `${this.config.settings().reminderDays} days`, count: this.expiry.soon().length, hot: true },
    { label: 'Today', count: this.expiry.today().length, hot: true },
    { label: 'Expired', count: this.expiry.expired().length, hot: false },
  ]);

  protected emptyText = computed(
    () => ['No subscriptions yet.', 'Nothing expiring soon.', 'Nothing expires today.', 'No expired subscriptions.'][this.tab()],
  );

  ngOnInit(): void {
    // Land on the most urgent non-empty tab.
    void this.records.load('sale').then(() => {
      if (this.expiry.today().length) this.tab.set(2);
      else if (!this.expiry.soon().length) this.tab.set(this.expiry.expired().length ? 3 : 0);
    });
  }

  protected brandFor(name: string) {
    return this.config.brands().find((b) => b.name.toLowerCase() === name.toLowerCase());
  }

  protected tone(item: ExpiryItem): string {
    if (item.daysLeft < 0) return 'item expired';
    if (item.daysLeft === 0) return 'item today';
    if (item.daysLeft <= this.config.settings().reminderDays) return 'item soon';
    return 'item';
  }

  protected statusText(item: ExpiryItem): string {
    const d = item.daysLeft;
    if (d < 0) return `Expired ${-d} day${d === -1 ? '' : 's'} ago`;
    if (d === 0) return 'Expires today';
    if (d === 1) return 'Expires tomorrow';
    return `${d} days left`;
  }

  protected ago(iso: string): string {
    const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
    if (isNaN(mins)) return '';
    if (mins < 60) return `${Math.max(mins, 1)}m ago`;
    if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
    return `${Math.round(mins / 1440)}d ago`;
  }

  /** Opens WhatsApp synchronously (keeps the tap gesture), then records the reminder in the Sheet. */
  protected notify(item: ExpiryItem): void {
    const link = this.whatsapp.link(item.customerPhone, this.whatsapp.reminderMessage(item.row, item.daysLeft));
    if (!this.whatsapp.open(link)) {
      this.snack.open('Pop-up blocked. Allow pop-ups for this app.', 'OK');
      return;
    }
    this.records.update('sale', item.row._id, { [NOTIFIED_COL]: new Date().toISOString() }).catch((err: Error) =>
      this.snack.open(`Reminder sent, but could not record it: ${err.message}`, 'OK'),
    );
  }
}
