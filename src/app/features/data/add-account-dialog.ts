import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { OttBrand } from '../../core/models/brand.model';
import { SLOT_STATUS } from '../../core/models/form-config.model';
import { ConfigService } from '../../core/services/config.service';
import { RecordsService } from '../../core/services/records.service';
import { buildGroup, fieldKeyFor, toRecord } from '../../shared/components/dynamic-fields/dynamic-form';
import { DynamicFields } from '../../shared/components/dynamic-fields/dynamic-fields';

/** Adds one account as N rows (one per screen), all starting as Empty slots. */
@Component({
  selector: 'app-add-account-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressBarModule, DynamicFields],
  template: `
    <h2 mat-dialog-title>Add {{ brand.name }} account</h2>
    <mat-dialog-content>
      <form id="add-account" [formGroup]="group" (ngSubmit)="save()" novalidate>
        <app-dynamic-fields [fields]="fields" [group]="group" [brands]="config.brands()" [hidden]="hiddenKeys" />
        <mat-form-field class="screens">
          <mat-label>Number of screens</mat-label>
          <input matInput type="number" min="1" max="20" [formControl]="screens" />
          <mat-hint>Creates one row per screen (Screen 1, 2, …) marked {{ empty }}</mat-hint>
        </mat-form-field>
      </form>
      @if (saving()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancel</button>
      <button mat-flat-button type="submit" form="add-account" [disabled]="saving()">Add</button>
    </mat-dialog-actions>
  `,
  styles: `.screens { width: 100%; margin-top: 12px; }`,
})
export class AddAccountDialog {
  protected config = inject(ConfigService);
  private records = inject(RecordsService);
  private ref = inject(MatDialogRef<AddAccountDialog>);
  protected brand = inject<OttBrand>(MAT_DIALOG_DATA);
  protected empty = SLOT_STATUS.empty;

  protected fields = this.config.credentialsForm().fields;
  private keys = {
    brand: fieldKeyFor(this.fields, 'brand'),
    screenNo: fieldKeyFor(this.fields, 'screenNo'),
    status: fieldKeyFor(this.fields, 'status'),
    customer: fieldKeyFor(this.fields, 'customerName'),
  };
  /** Filled automatically per row, so not shown. */
  protected hiddenKeys = [this.keys.brand, this.keys.screenNo, this.keys.status, this.keys.customer].filter((k): k is string => !!k);

  protected group = buildGroup(this.fields, { ...(this.keys.brand ? { [this.keys.brand]: this.brand.name } : {}), ...(this.keys.status ? { [this.keys.status]: SLOT_STATUS.empty } : {}) });
  protected screens = new FormControl(this.brand.screens || 1, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(20)] });
  protected saving = signal(false);
  protected error = signal('');

  async save(): Promise<void> {
    if (this.group.invalid || this.screens.invalid) {
      this.group.markAllAsTouched();
      return;
    }
    const base = this.group.getRawValue();
    const rows = Array.from({ length: Number(this.screens.value) }, (_, i) => {
      const value = { ...base };
      if (this.keys.screenNo) value[this.keys.screenNo] = String(i + 1);
      return toRecord(this.fields, value);
    });
    this.saving.set(true);
    this.error.set('');
    try {
      await this.records.addMany('credentials', rows);
      this.ref.close(true);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.saving.set(false);
    }
  }
}
