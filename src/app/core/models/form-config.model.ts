import { OttBrand } from './brand.model';

export type FieldType =
  | 'text'
  | 'number'
  | 'phone'
  | 'password'
  | 'date'
  | 'select'
  | 'textarea'
  | 'brand'
  | 'validity';

/**
 * A role tells the app what a field *means*, independent of its label or Sheet column,
 * so features like expiry tracking keep working after a seller renames things.
 */
export type FieldRole =
  | 'brand'
  | 'validity'
  | 'activationDate'
  | 'expiryDate'
  | 'accountId'
  | 'password'
  | 'screenNo'
  | 'pin'
  | 'amount'
  | 'deviceName'
  | 'customerName'
  | 'customerPhone'
  | 'accountExpiry'
  | 'status';

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  /** Header name of the Sheet column this field is saved to. */
  column: string;
  required: boolean;
  role?: FieldRole;
  options?: string[];
}

export interface FormConfig {
  /** Sheet tab the records are written to. */
  sheetName: string;
  fields: FormField[];
}

export type FormKind = 'sale' | 'credentials';

export interface ValidityPlan {
  label: string;
  months: number;
  days: number;
}

export interface MessageTemplates {
  sale: string;
  reminder: string;
}

export interface GeneralSettings {
  /** Prepended to 10-digit numbers when opening WhatsApp. */
  countryCode: string;
  /** "Expiring soon" window used by the Expiry screen. */
  reminderDays: number;
  currency: string;
}

export interface AppConfig {
  saleForm: FormConfig;
  credentialsForm: FormConfig;
  plans: ValidityPlan[];
  templates: MessageTemplates;
  settings: GeneralSettings;
  brands: OttBrand[];
}

/** Roles a seller can relabel / remap but never delete, because app logic depends on them. */
export const LOCKED_ROLES: Record<FormKind, FieldRole[]> = {
  sale: ['brand', 'activationDate', 'expiryDate', 'customerName', 'customerPhone'],
  credentials: ['brand', 'accountId', 'status'],
};

export const SLOT_STATUS = { empty: 'Empty', selected: 'Selected' } as const;
