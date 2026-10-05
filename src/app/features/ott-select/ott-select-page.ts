import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { OttBrand } from '../../core/models/brand.model';
import { SLOT_STATUS } from '../../core/models/form-config.model';
import { ConfigService } from '../../core/services/config.service';
import { RecordsService } from '../../core/services/records.service';
import { BrandAvatar } from '../../shared/components/brand-avatar/brand-avatar';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { BrandDialog } from './brand-dialog';

@Component({
  selector: 'app-ott-select-page',
  imports: [MatIconModule, MatButtonModule, MatRippleModule, PageHeader, BrandAvatar],
  template: `
    <app-page-header [title]="editing() ? 'Edit brands' : next() === 'data' ? 'Data: choose OTT' : 'Sale: choose OTT'">
      <button mat-icon-button type="button" (click)="editing.set(!editing())" [attr.aria-label]="editing() ? 'Done editing' : 'Edit brands'">
        <mat-icon>{{ editing() ? 'check' : 'edit' }}</mat-icon>
      </button>
    </app-page-header>

    <div class="page">
      @if (editing()) {
        <p class="hint">Tap a brand to change its logo, screens or default amount.</p>
      }
      <div class="grid">
        @for (b of config.brands(); track b.id) {
          <button type="button" class="tile" [class.editing]="editing()" matRipple (click)="pick(b)">
            <app-brand-avatar [brand]="b" [size]="64" />
            <span class="name">{{ b.name }}</span>
            @if (editing()) {
              <mat-icon class="edit-badge">edit</mat-icon>
            } @else if (freeSlots().has(b.name.toLowerCase())) {
              <span class="free">{{ freeSlots().get(b.name.toLowerCase()) }} free</span>
            }
          </button>
        }
        <button type="button" class="tile add" matRipple (click)="openDialog(null)">
          <span class="plus"><mat-icon>add</mat-icon></span>
          <span class="name">Add custom brand</span>
        </button>
      </div>
    </div>
  `,
  styles: `
    .hint { margin: 0 0 12px; color: var(--mat-sys-on-surface-variant); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
    .tile {
      position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 14px 6px 12px; border-radius: 18px; border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container-low); color: inherit; cursor: pointer; overflow: hidden; font: inherit;
    }
    .tile.editing { border-style: dashed; border-color: var(--mat-sys-primary); }
    .name { font: var(--mat-sys-label-large); text-align: center; line-height: 1.2; }
    .free {
      font: var(--mat-sys-label-small); padding: 2px 8px; border-radius: 10px;
      background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container);
    }
    .edit-badge { position: absolute; top: 6px; right: 6px; font-size: 18px; width: 18px; height: 18px; color: var(--mat-sys-primary); }
    .add { border-style: dashed; }
    .plus { width: 64px; height: 64px; border-radius: 22%; display: grid; place-items: center; background: var(--mat-sys-surface-container-highest); }
  `,
})
export class OttSelectPage {
  /** Where a brand tap leads: the sale form or the credentials list. Bound from ?next= */
  readonly next = input<'sale' | 'data'>('sale');

  protected config = inject(ConfigService);
  private records = inject(RecordsService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  protected editing = signal(false);

  /** Count of Empty credential slots per brand name (lower-cased). */
  protected freeSlots = computed(() => {
    const counts = new Map<string, number>();
    for (const row of this.records.credentials() ?? []) {
      if (this.records.value('credentials', row, 'status').toLowerCase() !== SLOT_STATUS.empty.toLowerCase()) continue;
      const brand = this.records.value('credentials', row, 'brand').toLowerCase();
      counts.set(brand, (counts.get(brand) ?? 0) + 1);
    }
    return counts;
  });

  constructor() {
    void this.records.load('credentials');
  }

  pick(brand: OttBrand): void {
    if (this.editing()) this.openDialog(brand);
    else if (this.next() === 'data') void this.router.navigate(['/data', brand.id]);
    else void this.router.navigate(['/sale'], { queryParams: { brand: brand.id } });
  }

  openDialog(brand: OttBrand | null): void {
    this.dialog.open(BrandDialog, { data: brand, width: '420px', maxWidth: '95vw', autoFocus: false });
  }
}
