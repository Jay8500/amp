import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DEFAULT_CREDENTIALS_FORM, DEFAULT_SALE_FORM } from '../../../core/config/defaults';
import { FieldType, FormConfig, FormField, FormKind, LOCKED_ROLES } from '../../../core/models/form-config.model';
import { ConfigService } from '../../../core/services/config.service';
import { RecordsService } from '../../../core/services/records.service';
import { SheetsApiService } from '../../../core/services/sheets-api.service';
import { newId } from '../../../core/utils/crypto';
import { confirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../shared/components/page-header/page-header';

const CUSTOM_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'phone', label: 'Phone number' },
  { value: 'password', label: 'Password (hidden)' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'textarea', label: 'Long text' },
];

/** Built-in fields whose input type is part of how the app works. */
const FIXED_TYPE_ROLES = new Set(['brand', 'validity', 'activationDate', 'expiryDate', 'accountExpiry', 'status']);

@Component({
  selector: 'app-form-builder-page',
  imports: [
    FormsModule, DragDropModule, MatExpansionModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule,
    MatButtonModule, MatIconModule, MatAutocompleteModule, MatProgressBarModule, PageHeader,
  ],
  templateUrl: './form-builder-page.html',
  styleUrl: './form-builder-page.scss',
})
export class FormBuilderPage implements OnInit {
  readonly kind = input.required<FormKind>();

  private config = inject(ConfigService);
  private records = inject(RecordsService);
  private api = inject(SheetsApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  protected types = CUSTOM_TYPES;
  protected draft = signal<FormConfig>({ sheetName: '', fields: [] });
  protected headers = signal<string[]>([]);
  protected saving = signal(false);
  protected dirty = signal(false);
  protected title = computed(() => (this.kind() === 'sale' ? 'Sale Form' : 'Credentials Form'));

  ngOnInit(): void {
    if (this.kind() !== 'sale' && this.kind() !== 'credentials') {
      void this.router.navigateByUrl('/settings', { replaceUrl: true });
      return;
    }
    this.draft.set(structuredClone(this.config.form(this.kind())));
    void this.loadHeaders();
  }

  protected isLocked(f: FormField): boolean {
    return !!f.role && LOCKED_ROLES[this.kind()].includes(f.role);
  }

  protected typeFixed(f: FormField): boolean {
    return !!f.role && FIXED_TYPE_ROLES.has(f.role);
  }

  protected typeLabel(f: FormField): string {
    if (f.type === 'brand') return 'OTT picker';
    if (f.type === 'validity') return 'Plan picker';
    return CUSTOM_TYPES.find((t) => t.value === f.type)?.label ?? f.type;
  }

  /** Sheet columns not yet mapped to any field, for the column autocomplete. */
  protected freeHeaders(current: string): string[] {
    const used = new Set(this.draft().fields.map((f) => f.column));
    return this.headers().filter((h) => h === current || !used.has(h));
  }

  protected update(field: FormField, patch: Partial<FormField>): void {
    this.draft.update((d) => ({ ...d, fields: d.fields.map((f) => (f.key === field.key ? { ...f, ...patch } : f)) }));
    this.dirty.set(true);
  }

  protected setOptions(field: FormField, text: string): void {
    this.update(field, { options: text.split(',').map((o) => o.trim()).filter(Boolean) });
  }

  protected setSheetName(name: string): void {
    this.draft.update((d) => ({ ...d, sheetName: name }));
    this.dirty.set(true);
  }

  protected drop(event: CdkDragDrop<FormField[]>): void {
    const fields = [...this.draft().fields];
    moveItemInArray(fields, event.previousIndex, event.currentIndex);
    this.draft.update((d) => ({ ...d, fields }));
    this.dirty.set(true);
  }

  protected addField(): void {
    const n = this.draft().fields.length + 1;
    const field: FormField = { key: newId('f_'), label: `New field ${n}`, column: `New field ${n}`, type: 'text', required: false };
    this.draft.update((d) => ({ ...d, fields: [...d.fields, field] }));
    this.dirty.set(true);
  }

  protected async removeField(field: FormField): Promise<void> {
    const ok = await confirmDialog(this.dialog, {
      title: `Remove “${field.label}”?`,
      message: 'The field disappears from the form. The column and existing data stay in your Sheet.',
      confirm: 'Remove',
      danger: true,
    });
    if (!ok) return;
    this.draft.update((d) => ({ ...d, fields: d.fields.filter((f) => f.key !== field.key) }));
    this.dirty.set(true);
  }

  protected async resetDefaults(): Promise<void> {
    const ok = await confirmDialog(this.dialog, {
      title: 'Reset to default fields?',
      message: 'Your custom fields and column mapping for this form will be replaced. Nothing in the Sheet is deleted.',
      confirm: 'Reset',
      danger: true,
    });
    if (!ok) return;
    this.draft.set(structuredClone(this.kind() === 'sale' ? DEFAULT_SALE_FORM : DEFAULT_CREDENTIALS_FORM));
    this.dirty.set(true);
  }

  protected async save(): Promise<void> {
    const problem = this.validate(this.draft());
    if (problem) {
      this.snack.open(problem, 'OK', { duration: 6000 });
      return;
    }
    const form: FormConfig = {
      sheetName: this.draft().sheetName.trim(),
      fields: this.draft().fields.map((f) => ({ ...f, label: f.label.trim(), column: f.column.trim() })),
    };
    const sheetChanged = form.sheetName !== this.config.form(this.kind()).sheetName;
    this.saving.set(true);
    try {
      await this.config.saveForm(this.kind(), form);
      if (sheetChanged) this.records.clear(this.kind());
      this.dirty.set(false);
      this.snack.open('Form saved');
      void this.loadHeaders();
    } catch (err) {
      this.snack.open((err as Error).message, 'OK', { duration: 6000 });
    } finally {
      this.saving.set(false);
    }
  }

  private validate(form: FormConfig): string | null {
    const name = form.sheetName.trim();
    if (!name) return 'Enter the Sheet tab name.';
    if (name.startsWith('_')) return 'Sheet tab name cannot start with "_".';
    const other = this.config.form(this.kind() === 'sale' ? 'credentials' : 'sale').sheetName;
    if (name.toLowerCase() === other.toLowerCase()) return 'Sale and Credentials must use different Sheet tabs.';
    const columns = new Set<string>();
    for (const f of form.fields) {
      if (!f.label.trim()) return 'Every field needs a label.';
      const col = f.column.trim();
      if (!col) return `“${f.label}” needs a Sheet column.`;
      if (col.startsWith('_')) return `Column “${col}” cannot start with "_".`;
      if (columns.has(col.toLowerCase())) return `Two fields use the column “${col}”.`;
      columns.add(col.toLowerCase());
      if (f.type === 'select' && !f.options?.length) return `Add options for the dropdown “${f.label}”.`;
    }
    return null;
  }

  protected async loadHeaders(): Promise<void> {
    try {
      this.headers.set(await this.api.headers(this.draft().sheetName));
    } catch {
      this.headers.set([]); // suggestions are optional
    }
  }
}
