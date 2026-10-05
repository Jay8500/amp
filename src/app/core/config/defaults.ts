import { OttBrand } from '../models/brand.model';
import { AppConfig, FormConfig, SLOT_STATUS } from '../models/form-config.model';

export const DEFAULT_SALE_FORM: FormConfig = {
  sheetName: 'Sales',
  fields: [
    { key: 'brand', role: 'brand', label: 'OTT', type: 'brand', column: 'OTT', required: true },
    { key: 'validity', role: 'validity', label: 'Validity', type: 'validity', column: 'Validity', required: true },
    { key: 'activationDate', role: 'activationDate', label: 'Activation Date', type: 'date', column: 'Activation Date', required: true },
    { key: 'expiryDate', role: 'expiryDate', label: 'Expiry Date', type: 'date', column: 'Expiry Date', required: true },
    { key: 'accountId', role: 'accountId', label: 'ID', type: 'text', column: 'ID', required: true },
    { key: 'password', role: 'password', label: 'Password', type: 'password', column: 'Password', required: true },
    { key: 'screenNo', role: 'screenNo', label: 'Screen No', type: 'text', column: 'Screen No', required: false },
    { key: 'pin', role: 'pin', label: 'PIN', type: 'text', column: 'PIN', required: false },
    { key: 'amount', role: 'amount', label: 'Amount', type: 'number', column: 'Amount', required: true },
    { key: 'deviceName', role: 'deviceName', label: 'Device Name', type: 'text', column: 'Device', required: false },
    { key: 'customerName', role: 'customerName', label: 'Customer Name', type: 'text', column: 'Customer Name', required: true },
    { key: 'customerPhone', role: 'customerPhone', label: 'Customer Number', type: 'phone', column: 'Customer Number', required: true },
  ],
};

export const DEFAULT_CREDENTIALS_FORM: FormConfig = {
  sheetName: 'Credentials',
  fields: [
    { key: 'brand', role: 'brand', label: 'OTT', type: 'brand', column: 'OTT', required: true },
    { key: 'accountId', role: 'accountId', label: 'ID', type: 'text', column: 'ID', required: true },
    { key: 'password', role: 'password', label: 'Password', type: 'password', column: 'Password', required: true },
    { key: 'screenNo', role: 'screenNo', label: 'Screen No', type: 'text', column: 'Screen No', required: false },
    { key: 'pin', role: 'pin', label: 'PIN', type: 'text', column: 'PIN', required: false },
    { key: 'accountExpiry', role: 'accountExpiry', label: 'Account Validity', type: 'date', column: 'Account Expiry', required: false },
    {
      key: 'status', role: 'status', label: 'Status', type: 'select', column: 'Status', required: true,
      options: [SLOT_STATUS.empty, SLOT_STATUS.selected],
    },
    { key: 'customerName', role: 'customerName', label: 'Customer', type: 'text', column: 'Customer', required: false },
  ],
};

export const BUILT_IN_BRANDS: OttBrand[] = [
  { id: 'netflix', name: 'Netflix', color: '#E50914', screens: 4, amount: 0, builtIn: true },
  { id: 'prime-video', name: 'Prime Video', color: '#00A8E1', screens: 3, amount: 0, builtIn: true },
  { id: 'jiohotstar', name: 'JioHotstar', color: '#1F2A7C', screens: 4, amount: 0, builtIn: true },
  { id: 'disney-plus', name: 'Disney+', color: '#113CCF', screens: 4, amount: 0, builtIn: true },
  { id: 'sonyliv', name: 'SonyLIV', color: '#1A1A1A', screens: 2, amount: 0, builtIn: true },
  { id: 'zee5', name: 'ZEE5', color: '#8230C6', screens: 3, amount: 0, builtIn: true },
  { id: 'youtube-premium', name: 'YouTube Premium', color: '#FF0033', screens: 6, amount: 0, builtIn: true },
  { id: 'spotify', name: 'Spotify', color: '#1DB954', screens: 6, amount: 0, builtIn: true },
];

export const DEFAULT_CONFIG: AppConfig = {
  saleForm: DEFAULT_SALE_FORM,
  credentialsForm: DEFAULT_CREDENTIALS_FORM,
  plans: [
    { label: '1 Month', months: 1, days: 0 },
    { label: '3 Months', months: 3, days: 0 },
    { label: '6 Months', months: 6, days: 0 },
    { label: '1 Year', months: 12, days: 0 },
  ],
  templates: {
    sale:
      'Hi {Customer Name} 👋\n' +
      'Your *{OTT}* subscription is active ✅\n\n' +
      'ID: {ID}\n' +
      'Password: {Password}\n' +
      'Screen: {Screen No}\n' +
      'PIN: {PIN}\n\n' +
      'Plan: {Validity}\n' +
      'Activated: {Activation Date}\n' +
      'Expires: {Expiry Date}\n' +
      'Amount: {Amount}\n\n' +
      'Please use only your assigned screen. Thank you! 🙏',
    reminder:
      'Hi {Customer Name},\n' +
      'Your *{OTT}* subscription {Expiry Status} ({Expiry Date}).\n\n' +
      'Reply here to renew and keep watching without interruption. 🙂',
  },
  settings: { countryCode: '91', reminderDays: 2, currency: '₹' },
  brands: [],
};
