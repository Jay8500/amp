import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { OttBrand } from '../../core/models/brand.model';
import { ConfigService } from '../../core/services/config.service';
import { newId } from '../../core/utils/crypto';
import { resizeToDataUrl } from '../../core/utils/image';
import { BrandAvatar } from '../../shared/components/brand-avatar/brand-avatar';
import { confirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';

const PALETTE = ['#E50914', '#00A8E1', '#1F2A7C', '#8230C6', '#1DB954', '#FF6D00', '#00897B', '#455A64'];

@Component({
  selector: 'app-brand-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressBarModule, BrandAvatar],
  template: `
    <h2 mat-dialog-title>{{ existing ? 'Edit ' + existing.name : 'Add custom brand' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="brand-form" (ngSubmit)="save()">
        <div class="logo-row">
          <app-brand-avatar [brand]="preview()" [size]="72" />
          <div class="logo-actions">
            <button mat-stroked-button type="button" (click)="file.click()"><mat-icon>upload</mat-icon> Upload logo</button>
            @if (logo()) {
              <button mat-button type="button" (click)="logo.set(undefined)">Remove logo</button>
            }
            <input #file type="file" accept="image/*" hidden (change)="onFile($event)" />
          </div>
        </div>
        @if (logoError()) {
          <p class="error">{{ logoError() }}</p>
        }

        <mat-form-field>
          <mat-label>Brand name</mat-label>
          <input matInput formControlName="name" [readonly]="!!existing?.builtIn" />
        </mat-form-field>
        <div class="two">
          <mat-form-field>
            <mat-label>Screens</mat-label>
            <input matInput type="number" min="1" max="20" formControlName="screens" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Default amount</mat-label>
            <input matInput type="number" min="0" formControlName="amount" />
          </mat-form-field>
        </div>
        @if (!logo()) {
          <div class="colors" role="radiogroup" aria-label="Tile colour">
            @for (c of palette; track c) {
              <button type="button" [style.background]="c" [class.sel]="form.value.color === c" (click)="form.patchValue({ color: c })" [attr.aria-label]="c"></button>
            }
          </div>
        }
      </form>
      @if (saving()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions>
      @if (existing) {
        <button mat-button class="danger" type="button" (click)="remove()" [disabled]="saving()">{{ existing.builtIn ? 'Hide' : 'Delete' }}</button>
      }
      <span class="spacer"></span>
      <button mat-button mat-dialog-close type="button">Cancel</button>
      <button mat-flat-button type="submit" form="brand-form" [disabled]="saving()">Save</button>
    </mat-dialog-actions>
  `,
  styles: `
    form { display: grid; gap: 12px; padding-top: 4px; }
    .logo-row { display: flex; align-items: center; gap: 16px; }
    .logo-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .colors { display: flex; flex-wrap: wrap; gap: 10px; }
    .colors button { width: 32px; height: 32px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; }
    .colors button.sel { outline: 3px solid var(--mat-sys-primary); outline-offset: 2px; }
    .spacer { flex: 1; }
    .danger { color: var(--mat-sys-error); }
  `,
})
export class BrandDialog {
  private config = inject(ConfigService);
  private dialog = inject(MatDialog);
  private ref = inject(MatDialogRef<BrandDialog>);
  protected existing = inject<OttBrand | null>(MAT_DIALOG_DATA);
  protected palette = PALETTE;

  protected form = inject(FormBuilder).nonNullable.group({
    name: [this.existing?.name ?? '', [Validators.required, Validators.maxLength(40)]],
    screens: [this.existing?.screens ?? 4, [Validators.required, Validators.min(1), Validators.max(20)]],
    amount: [this.existing?.amount ?? 0, [Validators.min(0)]],
    color: [this.existing?.color ?? PALETTE[Math.floor(Math.random() * PALETTE.length)]],
  });
  protected logo = signal<string | undefined>(this.existing?.logo);
  protected logoError = signal('');
  protected saving = signal(false);
  protected error = signal('');

  protected preview = (): OttBrand => ({ ...this.toBrand() });

  async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.logoError.set('');
    try {
      this.logo.set(await resizeToDataUrl(file));
    } catch (err) {
      this.logoError.set((err as Error).message || 'Could not read that image.');
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const name = this.form.getRawValue().name.trim();
    const clash = this.config.brands().some((b) => b.id !== this.existing?.id && b.name.toLowerCase() === name.toLowerCase());
    if (clash) {
      this.error.set('A brand with this name already exists.');
      return;
    }
    await this.run(() => this.config.saveBrand(this.toBrand()));
  }

  async remove(): Promise<void> {
    const b = this.existing!;
    const ok = await confirmDialog(this.dialog, {
      title: b.builtIn ? `Hide ${b.name}?` : `Delete ${b.name}?`,
      message: b.builtIn
        ? 'It will be hidden from the grid. You can show it again from Settings.'
        : 'The brand is removed from the grid. Existing sales and credentials in your Sheet are not changed.',
      confirm: b.builtIn ? 'Hide' : 'Delete',
      danger: true,
    });
    if (ok) await this.run(() => this.config.deleteBrand(b));
  }

  private toBrand(): OttBrand {
    const v = this.form.getRawValue();
    const name = v.name.trim();
    return {
      id: this.existing?.id ?? `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand'}-${newId()}`,
      name,
      logo: this.logo(),
      color: v.color,
      screens: Number(v.screens) || 1,
      amount: Number(v.amount) || 0,
      builtIn: this.existing?.builtIn ?? false,
    };
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    try {
      await action();
      this.ref.close(true);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.saving.set(false);
    }
  }
}
