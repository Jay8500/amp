import { fillTemplate } from './template';

describe('fillTemplate', () => {
  it('fills placeholders case-insensitively', () => {
    expect(fillTemplate('Hi {customer name}, {OTT}', { 'Customer Name': 'Ravi', OTT: 'Netflix' })).toBe('Hi Ravi, Netflix');
  });

  it('drops lines whose placeholders are all empty and keeps static lines', () => {
    const t = 'ID: {ID}\nPIN: {PIN}\n\nThanks!';
    expect(fillTemplate(t, { ID: 'a@b.com', PIN: '' })).toBe('ID: a@b.com\n\nThanks!');
  });

  it('keeps a line if at least one placeholder has a value', () => {
    expect(fillTemplate('Screen {Screen No} PIN {PIN}', { 'Screen No': '2' })).toBe('Screen 2 PIN');
  });
});
