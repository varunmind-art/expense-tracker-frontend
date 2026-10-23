import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_TRANSACTION_FILTERS, filterExpenses } from '../src/utils/expenseFilters.js';
import {
  buildExpenseTrend,
  compactINR,
  describeTrend,
  isExpenseRow,
} from '../src/utils/expenseTrend.js';

/**
 * Expense Trend aggregation.
 *
 * Dates are shaped as the API returns them: a calendar date stored as UTC
 * midnight (`2026-10-05T00:00:00.000Z`). Grouping must use that written date so
 * no timezone can move a transaction into an adjacent day or month.
 */

const groceries = { id: 'c1', name: 'Groceries' };
const transport = { id: 'c2', name: 'Transport' };
const mutualFunds = { id: 'c3', name: 'Mutual Funds' };

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
  // October 2026 — includes the first and last day.
  tx('o1', '2026-10-01T00:00:00.000Z', { amount: '500.00', note: 'Rent', merchant: 'Landlord' }),
  tx('o2', '2026-10-15T00:00:00.000Z', { amount: '250.50', categoryId: transport.id, category: transport }),
  tx('o3', '2026-10-31T00:00:00.000Z', { amount: '99.50', merchant: 'Shop' }),
  // A savings row inside the same month must never be plotted as spending.
  tx('o4', '2026-10-10T00:00:00.000Z', { amount: '1000.00', type: 'SAVINGS', categoryId: mutualFunds.id, category: mutualFunds }),
  // September must not leak into October.
  tx('s1', '2026-09-30T00:00:00.000Z', { amount: '120.00' }),
  // Other months of 2026.
  tx('j1', '2026-01-15T00:00:00.000Z', { amount: '60.00' }),
  tx('d1', '2026-12-31T00:00:00.000Z', { amount: '40.00' }),
  // October in earlier years, for the month-across-years view.
  tx('p25', '2025-10-05T00:00:00.000Z', { amount: '200.00' }),
  tx('p24', '2024-10-20T00:00:00.000Z', { amount: '300.00' }),
];

const october2026 = DATA.filter((e) => e.date.startsWith('2026-10'));

test('a complete year aggregates into twelve monthly points with gaps at zero', () => {
  const trend = buildExpenseTrend(DATA, { year: '2026' });

  assert.equal(trend.granularity, 'monthly');
  assert.equal(trend.averageLabel, 'monthly');
  assert.equal(trend.points.length, 12);
  assert.deepEqual(trend.points.map((p) => p.label), [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]);

  const byLabel = Object.fromEntries(trend.points.map((p) => [p.label, p.amount]));
  assert.equal(byLabel.Oct, 850); // 500 + 250.50 + 99.50
  assert.equal(byLabel.Jan, 60);
  assert.equal(byLabel.Sep, 120);
  assert.equal(byLabel.Dec, 40);
  // Months with no transactions are present and zero, not missing.
  assert.equal(byLabel.Feb, 0);
  assert.equal(byLabel.Mar, 0);
});

test('a selected month aggregates into one point per day, inclusive at both ends', () => {
  const trend = buildExpenseTrend(october2026, { month: '10', year: '2026' });

  assert.equal(trend.granularity, 'daily');
  assert.equal(trend.averageLabel, 'daily');
  assert.equal(trend.points.length, 31, 'October has 31 points');

  const byDay = Object.fromEntries(trend.points.map((p) => [p.label, p]));
  assert.equal(byDay['1'].amount, 500, 'the 1st must be included');
  assert.equal(byDay['31'].amount, 99.5, 'the 31st must be included');
  assert.equal(byDay['15'].amount, 250.5);
  // An empty day is present at zero.
  assert.equal(byDay['2'].amount, 0);
  assert.equal(byDay['2'].count, 0);
  // The savings row on the 10th is not plotted as spending.
  assert.equal(byDay['10'].amount, 0);
  assert.equal(byDay['10'].count, 0);
});

test('February respects leap and non-leap lengths', () => {
  const rows = [tx('l1', '2024-02-29T00:00:00.000Z', { amount: '50.00' })];

  const leap = buildExpenseTrend(rows, { month: '2', year: '2024' });
  assert.equal(leap.points.length, 29, '2024 is a leap year');
  assert.equal(leap.points[28].label, '29');
  assert.equal(leap.points[28].amount, 50);

  const common = buildExpenseTrend(rows, { month: '2', year: '2025' });
  assert.equal(common.points.length, 28, '2025 is not a leap year');
  assert.equal(common.count, 0);
});

test('Month + Year + Category uses the same filtered dataset as the table', () => {
  const filters = { ...DEFAULT_TRANSACTION_FILTERS, month: '10', year: '2026', categoryId: transport.id };
  const filtered = filterExpenses(DATA, filters);
  assert.deepEqual(filtered.map((e) => e.id), ['o2']);

  const trend = buildExpenseTrend(filtered, { month: filters.month, year: filters.year });
  assert.equal(trend.total, 250.5);
  assert.equal(trend.count, 1);
  assert.equal(trend.points.length, 31);
  assert.equal(trend.points.find((p) => p.label === '15').amount, 250.5);
});

test('Merchant and Search filters feed the chart through the same pipeline', () => {
  const byMerchant = filterExpenses(DATA, { ...DEFAULT_TRANSACTION_FILTERS, merchant: 'Landlord' });
  const merchantTrend = buildExpenseTrend(byMerchant, {});
  assert.equal(merchantTrend.total, 500);
  assert.equal(merchantTrend.count, 1);

  const bySearch = filterExpenses(DATA, { ...DEFAULT_TRANSACTION_FILTERS, search: 'rent' });
  const searchTrend = buildExpenseTrend(bySearch, {});
  assert.equal(searchTrend.total, 500);

  const withMonth = filterExpenses(DATA, { ...DEFAULT_TRANSACTION_FILTERS, search: 'rent', month: '9' });
  assert.equal(buildExpenseTrend(withMonth, { month: '9' }).count, 0, 'search and month combine with AND');
});

test('the Expense/Savings tab separates spending from savings', () => {
  const savingsOnly = filterExpenses(DATA, { ...DEFAULT_TRANSACTION_FILTERS, typeTab: 'SAVINGS' });
  const savingsTrend = buildExpenseTrend(savingsOnly, {});
  assert.equal(savingsTrend.isEmpty, true, 'the savings tab has no expenses to plot');
  assert.equal(savingsTrend.total, 0);
  assert.equal(savingsTrend.points.length, 0);

  const expensesOnly = filterExpenses(DATA, { ...DEFAULT_TRANSACTION_FILTERS, typeTab: 'EXPENSE' });
  const expensesTrend = buildExpenseTrend(expensesOnly, {});
  assert.equal(expensesTrend.count, 8, 'the savings row is excluded');
  assert.equal(expensesTrend.isEmpty, false);

  // Even if a savings row leaks into the input, it is never counted.
  const mixed = buildExpenseTrend([tx('x', '2026-10-05T00:00:00.000Z', { amount: '10.00' }), tx('y', '2026-10-06T00:00:00.000Z', { amount: '99.00', type: 'SAVINGS' })], { month: '10', year: '2026' });
  assert.equal(mixed.total, 10);
});

test('totals and averages are correct and labelled by granularity', () => {
  const daily = buildExpenseTrend(october2026, { month: '10', year: '2026' });
  assert.equal(daily.total, 850);
  assert.equal(daily.averageLabel, 'daily');
  // 850 / 31 days = 27.419354... -> 27.42
  assert.equal(daily.average, 27.42);

  const monthly = buildExpenseTrend(DATA, { year: '2026' });
  assert.equal(monthly.averageLabel, 'monthly');
  // 2026 expenses: 60 + 120 + 850 + 40 = 1070, over 12 months
  assert.equal(monthly.total, 1070);
  assert.equal(monthly.average, 89.17);
});

test('amounts are summed in paise, so no floating-point drift accumulates', () => {
  const rows = [
    tx('f1', '2026-10-01T00:00:00.000Z', { amount: '0.10' }),
    tx('f2', '2026-10-01T00:00:00.000Z', { amount: '0.20' }),
    tx('f3', '2026-10-02T00:00:00.000Z', { amount: '0.70' }),
  ];
  const trend = buildExpenseTrend(rows, { month: '10', year: '2026' });
  // 0.1 + 0.2 naively yields 0.30000000000000004
  assert.equal(trend.total, 1);
  assert.equal(trend.points.find((p) => p.label === '1').amount, 0.3);
});

test('non-contiguous history is filled with zero months', () => {
  const rows = [
    tx('a', '2026-01-10T00:00:00.000Z', { amount: '10.00' }),
    tx('b', '2026-04-10T00:00:00.000Z', { amount: '20.00' }),
  ];
  const trend = buildExpenseTrend(rows, {});
  assert.equal(trend.granularity, 'monthly-history');
  assert.equal(trend.points.length, 4, 'January through April, inclusive');
  assert.deepEqual(trend.points.map((p) => p.amount), [10, 0, 0, 20]);
  assert.equal(trend.total, 30);
});

test('Month only compares that month across years, filling gaps', () => {
  const trend = buildExpenseTrend(DATA, { month: '10' });
  assert.equal(trend.granularity, 'month-across-years');
  assert.deepEqual(trend.points.map((p) => p.label), ['2024', '2025', '2026']);
  assert.deepEqual(trend.points.map((p) => p.amount), [300, 200, 850]);
  assert.equal(trend.total, 1350);
  assert.equal(trend.averageLabel, 'monthly');
});

test('the highest spending period is reported', () => {
  const daily = buildExpenseTrend(october2026, { month: '10', year: '2026' });
  assert.equal(daily.highest.label, '1 October 2026');
  assert.equal(daily.highest.amount, 500);

  const monthly = buildExpenseTrend(DATA, { year: '2026' });
  assert.equal(monthly.highest.label, 'October 2026');
  assert.equal(monthly.highest.amount, 850);
});

test('an empty result is reported as empty rather than as zero spending', () => {
  const trend = buildExpenseTrend([], { month: '10', year: '2026' });
  assert.equal(trend.isEmpty, true);
  assert.equal(trend.count, 0);
  assert.equal(trend.total, 0);
  assert.equal(trend.highest, null);
  // The period still exists, so the axis is complete rather than blank.
  assert.equal(trend.points.length, 31);

  const emptyHistory = buildExpenseTrend([], {});
  assert.equal(emptyHistory.isEmpty, true);
  assert.equal(emptyHistory.points.length, 0);
});

test('month boundaries exclude adjacent months in every direction', () => {
  const rows = [
    tx('sep', '2026-09-30T00:00:00.000Z', { amount: '10.00' }),
    tx('oct1', '2026-10-01T00:00:00.000Z', { amount: '20.00' }),
    tx('oct31', '2026-10-31T00:00:00.000Z', { amount: '30.00' }),
    tx('nov', '2026-11-01T00:00:00.000Z', { amount: '40.00' }),
  ];
  const trend = buildExpenseTrend(rows, { month: '10', year: '2026' });
  assert.equal(trend.total, 50);
  assert.equal(trend.count, 2);
  assert.equal(trend.points[0].amount, 20);
  assert.equal(trend.points[30].amount, 30);
});

test('timezone offsets never shift a transaction into another day or month', () => {
  const rows = [
    tx('z1', '2026-10-31T23:59:59.999Z', { amount: '10.00' }),
    tx('z2', '2026-11-01T00:00:00.000Z', { amount: '20.00' }),
    tx('z3', '2026-10-01T00:00:00+05:30', { amount: '30.00' }),
  ];
  const trend = buildExpenseTrend(rows, { month: '10', year: '2026' });
  assert.equal(trend.count, 2, 'the November row is excluded');
  assert.equal(trend.points[0].amount, 30, 'the 1st keeps its written date');
  assert.equal(trend.points[30].amount, 10, '11:59:59 pm on the 31st stays on the 31st');
});

test('sorting the table does not change the chronological chart order', () => {
  const shuffled = [...october2026].reverse();
  const fromSorted = buildExpenseTrend(october2026, { month: '10', year: '2026' });
  const fromShuffled = buildExpenseTrend(shuffled, { month: '10', year: '2026' });

  assert.deepEqual(fromShuffled.points.map((p) => p.key), fromSorted.points.map((p) => p.key));
  assert.deepEqual(fromShuffled.points.map((p) => p.amount), fromSorted.points.map((p) => p.amount));
  assert.equal(fromShuffled.total, fromSorted.total);
});

test('the chart follows create, edit and delete', () => {
  const base = [
    tx('a', '2026-10-05T00:00:00.000Z', { amount: '100.00' }),
    tx('b', '2026-10-06T00:00:00.000Z', { amount: '200.00' }),
  ];
  const before = buildExpenseTrend(base, { month: '10', year: '2026' });
  assert.equal(before.total, 300);

  // Create
  const created = [...base, tx('c', '2026-10-07T00:00:00.000Z', { amount: '50.00' })];
  assert.equal(buildExpenseTrend(created, { month: '10', year: '2026' }).total, 350);

  // Edit
  const edited = base.map((e) => (e.id === 'a' ? { ...e, amount: '125.00' } : e));
  assert.equal(buildExpenseTrend(edited, { month: '10', year: '2026' }).total, 325);

  // Delete
  const deleted = base.filter((e) => e.id !== 'b');
  assert.equal(buildExpenseTrend(deleted, { month: '10', year: '2026' }).total, 100);
});

test('legacy rows without a type count as expenses', () => {
  assert.equal(isExpenseRow({ amount: '10' }), true);
  assert.equal(isExpenseRow({ type: 'SAVINGS' }), false);
  const trend = buildExpenseTrend([tx('legacy', '2026-10-05T00:00:00.000Z', { type: undefined })], { month: '10', year: '2026' });
  assert.equal(trend.total, 100);
});

test('axis labels stay compact in Indian units', () => {
  assert.equal(compactINR(0), '₹0');
  assert.equal(compactINR(999), '₹999');
  assert.equal(compactINR(1500), '₹1.5k');
  assert.equal(compactINR(240000), '₹2.4L');
  assert.equal(compactINR(12500000), '₹1.3Cr');
});

test('the chart subtitle describes the active granularity', () => {
  assert.match(describeTrend(buildExpenseTrend(DATA, { month: '10', year: '2026' }), { month: '10', year: '2026' }), /Daily expenses — October 2026/);
  assert.match(describeTrend(buildExpenseTrend(DATA, { year: '2026' }), { year: '2026' }), /Monthly expenses — 2026/);
  assert.match(describeTrend(buildExpenseTrend(DATA, { month: '10' }), { month: '10' }), /October compared across years/);
});
