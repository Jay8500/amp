import { addPlan, daysUntil, displayDate, parseDate, toIsoDate } from './dates';

describe('dates', () => {
  it('parses ISO and hand-typed dd/MM/yyyy dates', () => {
    expect(toIsoDate(parseDate('2026-03-07')!)).toBe('2026-03-07');
    expect(toIsoDate(parseDate('07/03/2026')!)).toBe('2026-03-07');
    expect(toIsoDate(parseDate('7-3-2026')!)).toBe('2026-03-07');
    expect(parseDate('not a date')).toBeNull();
  });

  it('adds months, clamping to the end of shorter months', () => {
    expect(addPlan('2026-01-31', { label: '1M', months: 1, days: 0 })).toBe('2026-02-28');
    expect(addPlan('2026-01-15', { label: '3M', months: 3, days: 0 })).toBe('2026-04-15');
    expect(addPlan('2026-11-30', { label: '1Y', months: 12, days: 0 })).toBe('2027-11-30');
    expect(addPlan('2026-01-15', { label: '7D', months: 0, days: 7 })).toBe('2026-01-22');
  });

  it('counts whole days from today', () => {
    const today = new Date();
    const shift = (n: number) => toIsoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));
    expect(daysUntil(shift(0))).toBe(0);
    expect(daysUntil(shift(2))).toBe(2);
    expect(daysUntil(shift(-3))).toBe(-3);
    expect(daysUntil('')).toBeNull();
  });

  it('formats for messages as dd-MM-yyyy', () => {
    expect(displayDate('2026-03-07')).toBe('07-03-2026');
  });
});
