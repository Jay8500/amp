import { SheetRecord } from '../models/record.model';
import { toIsoDate } from '../utils/dates';

/** Pseudo "Apps Script URL" that routes bridge calls to this in-memory fake instead of Google. */
export const DEMO_URL = 'demo';

/**
 * Stand-in for apps-script/Code.gs used by Demo mode: same actions, same reply shapes,
 * but everything lives in memory and is gone on reload. Lets people try the app (or a
 * client see it) without creating a Google Sheet.
 */
export class DemoBridge {
  private seq = 0;
  private config: Record<string, unknown> = {};
  private sheets: Record<string, SheetRecord[]> = seed(() => this.id());

  handle(body: Record<string, unknown>): unknown {
    const sheet = body['sheet'] as string;
    const rows = () => (this.sheets[sheet] ??= []);
    switch (body['action']) {
      case 'ping':
        return { name: 'Demo Sheet (sample data)', timeZone: 'Asia/Kolkata', version: 1 };
      case 'getConfig':
        return structuredClone(this.config);
      case 'setConfig':
        this.config[body['key'] as string] = structuredClone(body['value']);
        return true;
      case 'deleteConfig':
        delete this.config[body['key'] as string];
        return true;
      case 'headers':
        return [...new Set(rows().flatMap((r) => Object.keys(r)))].filter((k) => !k.startsWith('_'));
      case 'list':
        return structuredClone(rows());
      case 'append':
        return this.append(rows(), body['record'] as Record<string, string>);
      case 'appendMany':
        return (body['records'] as Record<string, string>[]).map((r) => this.append(rows(), r));
      case 'update': {
        const row = rows().find((r) => r._id === body['id']);
        if (!row) throw new Error('Record not found');
        Object.assign(row, body['record']);
        return true;
      }
      case 'remove':
        this.sheets[sheet] = rows().filter((r) => r._id !== body['id']);
        return true;
      default:
        throw new Error(`Unknown action: ${body['action']}`);
    }
  }

  private append(rows: SheetRecord[], record: Record<string, string>): SheetRecord {
    const row: SheetRecord = { ...record, _id: this.id(), _createdAt: new Date().toISOString() };
    rows.push(row);
    return structuredClone(row);
  }

  private id(): string {
    return `demo-${++this.seq}`;
  }
}

function seed(id: () => string): Record<string, SheetRecord[]> {
  const day = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return toIsoDate(d);
  };
  const netflixCustomers = ['Ravi Kumar', 'Anitha'];

  const credentials: SheetRecord[] = [
    ...[1, 2, 3, 4].map((s) => ({
      _id: id(), OTT: 'Netflix', ID: 'netflix.demo@gmail.com', Password: 'Demo@1234', 'Screen No': String(s),
      PIN: s % 2 ? '1234' : '', 'Account Expiry': day(20),
      Status: s <= 2 ? 'Selected' : 'Empty', Customer: netflixCustomers[s - 1] ?? '',
    })),
    ...[1, 2, 3].map((s) => ({
      _id: id(), OTT: 'Prime Video', ID: 'prime.demo@outlook.com', Password: 'Prime#2026', 'Screen No': String(s),
      PIN: '', 'Account Expiry': day(1), Status: s === 1 ? 'Selected' : 'Empty', Customer: s === 1 ? 'Suresh' : '',
    })),
  ];

  // [OTT, customer, phone, started (days ago), expires (days from now), plan, amount]
  const sales: [string, string, string, number, number, string, number][] = [
    ['Netflix', 'Ravi Kumar', '9876543210', -27, 3, '1 Month', 199],
    ['Netflix', 'Anitha', '9123456780', -30, 0, '1 Month', 199],
    ['Prime Video', 'Suresh', '9988776655', -29, 1, '1 Month', 149],
    ['JioHotstar', 'Irfan Shaikh', '9000011111', -88, 2, '3 Months', 399],
    ['SonyLIV', 'Lakshmi', '9000022222', -33, -3, '1 Month', 129],
    ['ZEE5', 'Deepak', '9000033333', -180, -10, '6 Months', 499],
    ['YouTube Premium', 'Priya', '9000044444', -5, 360, '1 Year', 999],
    ['Spotify', 'Karthik', '9000055555', -2, 28, '1 Month', 59],
  ];

  return {
    Credentials: credentials,
    Sales: sales.map(([ott, name, phone, start, end, plan, amount]) => ({
      _id: id(),
      _createdAt: new Date(Date.now() + start * 86_400_000).toISOString(),
      OTT: ott, Validity: plan, 'Activation Date': day(start), 'Expiry Date': day(end),
      ID: `${ott.toLowerCase().replace(/\W+/g, '.')}.demo@gmail.com`, Password: 'Demo@1234', 'Screen No': '1', PIN: '',
      Amount: String(amount), Device: 'Android TV', 'Customer Name': name, 'Customer Number': phone,
    })),
  };
}
