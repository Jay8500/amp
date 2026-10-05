import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { merge } from 'rxjs';
import { FieldRole, SLOT_STATUS } from '../../core/models/form-config.model';
import { SheetRecord } from '../../core/models/record.model';
import { ConfigService } from '../../core/services/config.service';
import { RecordsService } from '../../core/services/records.service';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { addPlan, todayIso } from '../../core/utils/dates';
import { BrandAvatar } from '../../shared/components/brand-avatar/brand-avatar';
import { DynamicGroup, buildGroup, fieldKeyFor, toRecord } from '../../shared/components/dynamic-fields/dynamic-form';
import { DynamicFields } from '../../shared/components/dynamic-fields/dynamic-fields';
import { PageHeader } from '../../shared/components/page-header/page-header';

/** Credential fields copied into the sale when a free slot is picked. */
const SLOT_ROLES: FieldRole[] = ['accountId', 'password', 'screenNo', 'pin'];

@Component({
  selector: 'app-sale-page',
  imports: [
    ReactiveFormsModule, RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatSelectModule,
    MatProgressBarModule, PageHeader, DynamicFields, BrandAvatar,
  ],
  templateUrl: './sale-page.html',
  styleUrl: './sale-page.scss',
})
export class SalePage implements OnInit {
  /** Brand id from ?brand= */
  readonly brand = input<string>('');

  protected config = inject(ConfigService);
  private records = inject(RecordsService);
  private whatsapp = inject(WhatsappService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  protected fields = this.config.saleForm().fields;
  protected group!: DynamicGroup;
  protected selectedBrand = computed(() => this.config.brands().find((b) => b.id === this.brand()));

  protected slotId = signal<string>('');
  protected saving = signal(false);
  protected error = signal('');
  /** Set after a successful save: the WhatsApp link, kept so it can be reopened. */
  protected sent = signal<{ link: string; customer: string } | null>(null);

  protected credentialsLoading = this.records.credentialsLoading;
  /** Empty slots for this brand from the Credentials sheet. */
  protected freeSlots = computed<SheetRecord[]>(() => {
    const name = this.selectedBrand()?.name.toLowerCase();
    if (!name) return [];
    const v = (row: SheetRecord, role: FieldRole) => this.records.value('credentials', row, role);
    return (this.records.credentials() ?? []).filter(
      (r) => v(r, 'brand').toLowerCase() === name && v(r, 'status').toLowerCase() === SLOT_STATUS.empty.toLowerCase(),
    );
  });

  ngOnInit(): void {
    if (!this.selectedBrand()) {
      void this.router.navigate(['/ott-select'], { queryParams: { next: 'sale' }, replaceUrl: true });
      return;
    }
    void this.records.load('credentials');
    this.resetForm();
  }

  protected slotLabel(row: SheetRecord): string {
    const v = (role: FieldRole) => this.records.value('credentials', row, role);
    const screen = v('screenNo') ? ` · Screen ${v('screenNo')}` : '';
    return `${v('accountId')}${screen}`;
  }

  protected pickSlot(id: string): void {
    this.slotId.set(id);
    const row = this.freeSlots().find((r) => r._id === id);
    const patch: Record<string, string> = {};
    for (const role of SLOT_ROLES) {
      const key = fieldKeyFor(this.fields, role);
      if (key) patch[key] = row ? this.records.value('credentials', row, role) : '';
    }
    this.group.patchValue(patch);
  }

  async send(): Promise<void> {
    if (this.saving()) return;
    if (this.group.invalid) {
      this.group.markAllAsTouched();
      this.error.set('Please fill in the highlighted fields.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const record = toRecord(this.fields, this.group.getRawValue());
    try {
      await this.records.add('sale', record);
      await this.markSlotSold(record);

      const phone = record[this.config.column('sale', 'customerPhone') ?? ''] ?? '';
      const link = this.whatsapp.link(phone, this.whatsapp.saleMessage(record));
      this.sent.set({ link, customer: record[this.config.column('sale', 'customerName') ?? ''] || phone });
      if (!this.whatsapp.open(link)) {
        this.snack.open('Saved. Tap to open WhatsApp.', 'Open', { duration: 10_000 }).onAction().subscribe(() => this.whatsapp.open(link));
      }
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.saving.set(false);
    }
  }

  protected reopenWhatsapp(): void {
    const s = this.sent();
    if (s) this.whatsapp.open(s.link);
  }

  protected newSale(): void {
    this.sent.set(null);
    this.slotId.set('');
    this.resetForm();
  }

  private async markSlotSold(sale: Record<string, string>): Promise<void> {
    const id = this.slotId();
    if (!id) return;
    const patch: Record<string, string> = {};
    const statusCol = this.config.column('credentials', 'status');
    const customerCol = this.config.column('credentials', 'customerName');
    if (statusCol) patch[statusCol] = SLOT_STATUS.selected;
    if (customerCol) patch[customerCol] = sale[this.config.column('sale', 'customerName') ?? ''] ?? '';
    try {
      await this.records.update('credentials', id, patch);
    } catch (err) {
      // The sale itself is saved; don't block the WhatsApp step on the slot update.
      this.snack.open(`Sale saved, but the slot could not be marked as sold: ${(err as Error).message}`, 'OK');
    }
  }

  private resetForm(): void {
    const brand = this.selectedBrand()!;
    const key = (role: FieldRole) => fieldKeyFor(this.fields, role);
    const plan = this.config.plans()[0];
    const today = todayIso();
    const initial: Record<string, string> = {};
    const set = (role: FieldRole, value: string) => {
      const k = key(role);
      if (k) initial[k] = value;
    };
    set('brand', brand.name);
    set('activationDate', today);
    if (plan) {
      set('validity', plan.label);
      set('expiryDate', addPlan(today, plan));
    }
    if (brand.amount) set('amount', String(brand.amount));

    this.group = buildGroup(this.fields, initial);
    this.watchExpiry();
  }

  /** Expiry = activation date + chosen plan; recalculated whenever either changes. */
  private watchExpiry(): void {
    const validity = fieldKeyFor(this.fields, 'validity');
    const activation = fieldKeyFor(this.fields, 'activationDate');
    const expiry = fieldKeyFor(this.fields, 'expiryDate');
    if (!validity || !activation || !expiry) return;
    const c = this.group.controls;
    merge(c[validity].valueChanges, c[activation].valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const plan = this.config.plans().find((p) => p.label === c[validity].value);
        if (plan && c[activation].value) c[expiry].setValue(addPlan(c[activation].value, plan));
      });
  }
}
