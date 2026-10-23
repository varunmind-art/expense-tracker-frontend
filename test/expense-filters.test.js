import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_TRANSACTION_FILTERS,
  MONTH_OPTIONS,
  availableYears,
  dateParts,
  filterExpenses,
  hasActiveFilters,
  sortExpenses,
  summarizeTransactions,
} from '../src/utils/expenseFilters.js';

/**
 * Month/Year filtering for the Expenses & Savings listing.
 *
 * Dates are shaped exactly as the API returns them: a calendar date stored as
 * UTC midnight (`2026-10-05T00:00:00.000Z`). Filtering must use that written
 * calendar date so no timezone shift can move a transaction between months.
 */

const groceries = { id: 'c1', name: 'Groceries' };
const transport = { id: 'c2', name: 'Transport' };
const savings = { id: 'c3', name: 'Mutual Funds' };

const tx = (id, date, overrides = {}) => ({
  id,
  date,
  amount: '100.00',
  type: 'EXPENSE',
  note: null,
  merchant: null,
  categoryId: groceries.id,
  category: groceries,
  ...overrides,
});

const DATA = [
  tx('a', '2026-10-01T00:00:00.000Z', { amount: '500.00', note: 'Rent', merchant: 'Landlord' }),
  tx('b', '2026-10-31T00:00:00.000Z', { amount: '250.00', categoryId: transport.id, category: transport }),
  tx('c', '2026-10-15T00:00:00.000Z', { amount: '1000.00', type: 'SAVINGS', categoryId: savings.id, category: savings }),
  tx('d', '2026-09-30T00:00:00.000Z', { amount: '120.00' }),
  tx('e', '2025-10-05T00:00:00.000Z', { amount: '90.00' }),
  tx('f', '2026-01-01T00:00:00.000Z', { amount: '60.00', categoryId: transport.id, category: transport }),
  tx('g', '2025-12-31T00:00:00.000Z', { amount: '70.00' }),
];

const ids = (rows) => rows.map((r) => r.id);
const filter = (overrides) => filterExpenses(DATA, { ...DEFAULT_TRANSACTION_FILTERS, ...overrides });

test('defaults are All Months and All Years and hide nothing', () => {
  assert.equal(DEFAULT_TRANSACTION_FILTERS.month, '');
  assert.equal(DEFAULT_TRANSACTION_FILTERS.year, '');
  assert.equal(MONTH_OPTIONS[0].value, '');
  assert.equal(MONTH_OPTIONS[0].label, 'All Months');
  assert.equal(MONTH_OPTIONS.length, 13);

  // All Months + All Years returns every historical transaction.
  assert.deepEqual(ids(filter({})), ids(DATA));
});

test('Month alone filters across every year', () => {
  // October exists in 2025 and 2026.
  assert.deepEqual(ids(filter({ month: '10' })), ['a', 'b', 'c', 'e']);
});

test('Year alone keeps every month of that year', () => {
  assert.deepEqual(ids(filter({ year: '2026' })), ['a', 'b', 'c', 'd', 'f']);
  assert.deepEqual(ids(filter({ year: '2025' })), ['e', 'g']);
});

test('Month and Year combine', () => {
  assert.deepEqual(ids(filter({ month: '10', year: '2026' })), ['a', 'b', 'c']);
  assert.deepEqual(ids(filter({ month: '10', year: '2025' })), ['e']);
  // A combination with no records yields nothing, not everything.
  assert.deepEqual(ids(filter({ month: '3', year: '2026' })), []);
});

test('Category combines with Month and Year', () => {
  // Groceries + October + 2026
  assert.deepEqual(ids(filter({ categoryId: groceries.id, month: '10', year: '2026' })), ['a']);
  // Groceries + 2026 + All Months
  assert.deepEqual(ids(filter({ categoryId: groceries.id, year: '2026' })), ['a', 'd']);
  // All Categories + October + 2026
  assert.deepEqual(ids(filter({ categoryId: '', month: '10', year: '2026' })), ['a', 'b', 'c']);
});

test('the month boundaries are inclusive at both ends', () => {
  // 1 Oct and 31 Oct are both October.
  assert.ok(ids(filter({ month: '10', year: '2026' })).includes('a'), 'first day excluded');
  assert.ok(ids(filter({ month: '10', year: '2026' })).includes('b'), 'last day excluded');
  // 30 September and 1 November are not.
  assert.ok(!ids(filter({ month: '10', year: '2026' })).includes('d'));
  assert.ok(!ids(filter({ month: '10', year: '2026' })).includes('f'));
});

test('December and January do not bleed into each other', () => {
  assert.deepEqual(ids(filter({ month: '12', year: '2025' })), ['g']);
  assert.deepEqual(ids(filter({ month: '1', year: '2026' })), ['f']);
});

test('a leap-year February includes the 29th', () => {
  const leap = [
    tx('l1', '2024-02-29T00:00:00.000Z'),
    tx('l2', '2024-02-28T00:00:00.000Z'),
    tx('l3', '2024-03-01T00:00:00.000Z'),
    tx('l4', '2023-02-28T00:00:00.000Z'),
  ];
  assert.deepEqual(ids(filterExpenses(leap, { month: '2', year: '2024' })), ['l1', 'l2']);
  assert.deepEqual(ids(filterExpenses(leap, { month: '2', year: '2023' })), ['l4']);
});

test('ISO strings are read as their written date, with no timezone shift', () => {
  // 31 Oct 2026 as UTC midnight. In IST that instant is 05:30 on 31 Oct; in a
  // negative-offset zone it is still 31 Oct, but a naive local getter in, say,
  // UTC-8 would report 30 October. The written date wins.
  assert.deepEqual(dateParts('2026-10-31T00:00:00.000Z'), { year: 2026, month: 10, day: 31 });
  assert.deepEqual(dateParts('2026-11-01T00:00:00.000Z'), { year: 2026, month: 11, day: 1 });
  // An explicit offset is still the calendar date as written.
  assert.deepEqual(dateParts('2026-10-01T00:00:00+05:30'), { year: 2026, month: 10, day: 1 });
  // A date-only string behaves identically.
  assert.deepEqual(dateParts('2026-10-01'), { year: 2026, month: 10, day: 1 });

  const rows = [
    tx('z1', '2026-10-31T00:00:00.000Z'),
    tx('z2', '2026-10-31T23:59:59.999Z'),
    tx('z3', '2026-10-01T00:00:00.000Z'),
  ];
  assert.deepEqual(ids(filterExpenses(rows, { month: '10', year: '2026' })), ['z1', 'z2', 'z3']);
});

test('an unparseable date never matches a month or year filter', () => {
  const rows = [tx('bad', 'not-a-date'), tx('ok', '2026-10-05T00:00:00.000Z')];
  assert.deepEqual(ids(filterExpenses(rows, { month: '10' })), ['ok']);
  assert.deepEqual(ids(filterExpenses(rows, { year: '2026' })), ['ok']);
});

test('Search combines with Month and Year', () => {
  assert.deepEqual(ids(filter({ search: 'rent', month: '10', year: '2026' })), ['a']);
  assert.deepEqual(ids(filter({ search: 'rent', month: '10', year: '2025' })), []);
  // Search still covers notes, merchants and category names.
  assert.deepEqual(ids(filter({ search: 'landlord' })), ['a']);
  assert.deepEqual(ids(filter({ search: 'transport' })), ['b', 'f']);
});

test('the Merchant filter combines with Month and Year', () => {
  assert.deepEqual(ids(filter({ merchant: 'Landlord', month: '10', year: '2026' })), ['a']);
  assert.deepEqual(ids(filter({ merchant: 'Landlord', year: '2025' })), []);
});

test('the Expense / Savings tab combines with Month and Year', () => {
  assert.deepEqual(ids(filter({ typeTab: 'SAVINGS', month: '10', year: '2026' })), ['c']);
  assert.deepEqual(ids(filter({ typeTab: 'EXPENSE', month: '10', year: '2026' })), ['a', 'b']);
  // Legacy rows with no type are treated as expenses, as before.
  assert.deepEqual(ids(filterExpenses([tx('n', '2026-10-02T00:00:00.000Z', { type: undefined, categoryId: transport.id, category: transport })], { typeTab: 'EXPENSE', month: '10' })), ['n']);
});

test('sorting keeps the filtered set and still orders correctly', () => {
  const october = filter({ month: '10', year: '2026' });
  const byAmountDesc = sortExpenses(october, { sortBy: 'amount', sortOrder: 'desc' });
  assert.deepEqual(ids(byAmountDesc), ['c', 'a', 'b']);
  const byAmountAsc = sortExpenses(october, { sortBy: 'amount', sortOrder: 'asc' });
  assert.deepEqual(ids(byAmountAsc), ['b', 'a', 'c']);
  // Sorting never adds rows back.
  assert.equal(byAmountDesc.length, october.length);

  const byDateDesc = sortExpenses(october, { sortBy: 'date', sortOrder: 'desc' });
  assert.equal(byDateDesc[0].id, 'b'); // 31 Oct
  const byDateAsc = sortExpenses(october, { sortBy: 'date', sortOrder: 'asc' });
  assert.equal(byDateAsc[0].id, 'a'); // 1 Oct
});

test('summary cards follow the combined filters', () => {
  const october2026 = sortExpenses(filter({ month: '10', year: '2026' }), {});
  const summary = summarizeTransactions(october2026);
  assert.equal(summary.count, 3);
  assert.equal(summary.total, 1750); // 500 + 250 + 1000
  assert.equal(summary.savings, 1000); // only the SAVINGS row

  const everything = summarizeTransactions(DATA);
  assert.equal(everything.count, DATA.length);

  const none = summarizeTransactions(filter({ month: '3', year: '2026' }));
  assert.deepEqual(none, { count: 0, total: 0, savings: 0 });
});

test('year options come from the data, newest first, without duplicates', () => {
  assert.deepEqual(availableYears(DATA), [2026, 2025]);
  assert.deepEqual(availableYears([]), []);
  assert.deepEqual(availableYears([tx('x', 'not-a-date')]), []);
  // A year appearing many times is listed once.
  assert.deepEqual(availableYears([tx('a', '2026-01-01'), tx('b', '2026-05-05'), tx('c', '2024-05-05')]), [2026, 2024]);
});

test('hasActiveFilters ignores sorting and the type tab', () => {
  assert.equal(hasActiveFilters(DEFAULT_TRANSACTION_FILTERS), false);
  assert.equal(hasActiveFilters({ ...DEFAULT_TRANSACTION_FILTERS, typeTab: 'SAVINGS' }), false);
  assert.equal(hasActiveFilters({ ...DEFAULT_TRANSACTION_FILTERS, month: '10' }), true);
  assert.equal(hasActiveFilters({ ...DEFAULT_TRANSACTION_FILTERS, year: '2026' }), true);
  assert.equal(hasActiveFilters({ ...DEFAULT_TRANSACTION_FILTERS, search: 'x' }), true);
});

test('clearing the filters restores every transaction', () => {
  // Mirrors what the Clear Filters button does: month, year, category, merchant
  // and search return to their defaults.
  const narrowed = { ...DEFAULT_TRANSACTION_FILTERS, month: '10', year: '2026', categoryId: groceries.id, merchant: 'Landlord', search: 'rent' };
  assert.deepEqual(ids(filterExpenses(DATA, narrowed)), ['a']);
  assert.deepEqual(ids(filterExpenses(DATA, { ...DEFAULT_TRANSACTION_FILTERS })), ids(DATA));
});
