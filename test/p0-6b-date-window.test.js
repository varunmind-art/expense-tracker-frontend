/**
 * P0-6B — dashboard date windows and budget arithmetic.
 *
 * Expectations here are INDEPENDENTLY calculated from the fixtures (written out
 * in the comments) rather than copied from whatever the implementation returns.
 * Times are chosen so the application-local (IST) calendar day is unambiguous.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FILTERS,
  resolveWindow,
  previousWindow,
  isWithinWindow,
  sumInWindow,
  budgetPeriodWindow,
  appLocalDateString,
  appLocalMonthLabel,
  monthWindow,
} from '../src/utils/dateWindow.js';

import { computeBudgetProgress } from '../src/utils/budgetProgress.js';

const utc = (s) => new Date(s);
const day = (d) => appLocalDateString(d);

// ─────────────────────────────────────────────────────────────────────────────
// resolveWindow — one resolver for every widget
// ─────────────────────────────────────────────────────────────────────────────

test('this-month resolves to the application-local month, with a matching label', () => {
  const window = resolveWindow(FILTERS.THIS_MONTH, { now: utc('2026-03-15T10:00:00Z') });
  assert.equal(window.monthLabel, '2026-03');
  assert.equal(day(window.start), '2026-03-01');
  // End is exclusive: 1 April, IST.
  assert.equal(day(new Date(window.end.getTime() - 1)), '2026-03-31');
  assert.equal(window.granularity, 'month');
});

test('last-month resolves to the previous month and labels it', () => {
  const window = resolveWindow(FILTERS.LAST_MONTH, { now: utc('2026-03-15T10:00:00Z') });
  assert.equal(window.monthLabel, '2026-02');
  assert.equal(day(window.start), '2026-02-01');
  assert.equal(day(new Date(window.end.getTime() - 1)), '2026-02-28');
});

test('last-month across a year boundary is January of the previous year', () => {
  const window = resolveWindow(FILTERS.LAST_MONTH, { now: utc('2026-01-10T10:00:00Z') });
  assert.equal(window.monthLabel, '2025-12');
  assert.equal(day(window.start), '2025-12-01');
});

test('this-week is Monday-based and exactly seven days', () => {
  // 2026-03-15 is a Sunday; IST local date is 2026-03-15.
  const window = resolveWindow(FILTERS.THIS_WEEK, { now: utc('2026-03-15T10:00:00Z') });
  assert.equal(window.granularity, 'week');
  assert.equal(day(window.start), '2026-03-09', 'the Monday of that week');
  assert.equal(day(new Date(window.end.getTime() - 1)), '2026-03-15');
});

test('a custom range is validated: empty, inverted and malformed are rejected', () => {
  const valid = resolveWindow(FILTERS.CUSTOM, {
    custom: { start: utc('2026-03-01T00:00:00Z'), end: utc('2026-04-01T00:00:00Z') },
  });
  assert.ok(valid);
  assert.equal(valid.granularity, 'custom');

  assert.equal(resolveWindow(FILTERS.CUSTOM, { custom: undefined }), null);
  assert.equal(
    resolveWindow(FILTERS.CUSTOM, { custom: { start: utc('2026-03-10T00:00:00Z'), end: utc('2026-03-10T00:00:00Z') } }),
    null,
    'zero-length range'
  );
  assert.equal(
    resolveWindow(FILTERS.CUSTOM, { custom: { start: utc('2026-03-10T00:00:00Z'), end: utc('2026-03-01T00:00:00Z') } }),
    null,
    'inverted range'
  );
  assert.equal(
    resolveWindow(FILTERS.CUSTOM, { custom: { start: new Date('nonsense'), end: utc('2026-03-01T00:00:00Z') } }),
    null,
    'unparseable date'
  );
});

test('an invalid reference clock yields null rather than a wrong window', () => {
  assert.equal(resolveWindow(FILTERS.THIS_MONTH, { now: new Date('nonsense') }), null);
});

test('the window never shifts a calendar day because of the timezone', () => {
  // 2026-03-31T18:30Z is exactly 2026-04-01 00:00 IST, so it belongs to April.
  assert.equal(appLocalDateString(utc('2026-03-31T18:30:00Z')), '2026-04-01');
  assert.equal(appLocalDateString(utc('2026-03-31T18:29:59.999Z')), '2026-03-31');

  const march = monthWindow('2026-03');
  const april = monthWindow('2026-04');
  assert.equal(isWithinWindow(march, utc('2026-03-31T18:30:00Z')), false);
  assert.equal(isWithinWindow(april, utc('2026-03-31T18:30:00Z')), true);
});

test('previousWindow gives the immediately preceding period for each granularity', () => {
  const month = resolveWindow(FILTERS.THIS_MONTH, { now: utc('2026-03-15T10:00:00Z') });
  const prevMonth = previousWindow(month);
  assert.equal(prevMonth.monthLabel, '2026-02');
  assert.equal(prevMonth.end.getTime(), month.start.getTime(), 'adjacent, no gap');

  const week = resolveWindow(FILTERS.THIS_WEEK, { now: utc('2026-03-15T10:00:00Z') });
  const prevWeek = previousWindow(week);
  assert.equal(day(prevWeek.start), '2026-03-02');
  assert.equal(prevWeek.end.getTime(), week.start.getTime());

  const custom = resolveWindow(FILTERS.CUSTOM, {
    custom: { start: utc('2026-03-01T00:00:00Z'), end: utc('2026-03-11T00:00:00Z') },
  });
  const prevCustom = previousWindow(custom);
  assert.equal(prevCustom.end.getTime(), custom.start.getTime());
  assert.equal(prevCustom.start.getTime(), custom.start.getTime() - 10 * 86400000);
});

test('sumInWindow uses the same half-open rule as the API filter', () => {
  const window = monthWindow('2026-03');
  const records = [
    { date: utc('2026-02-28T18:29:59.999Z'), amount: 10 }, // 28 Feb IST -> excluded
    { date: utc('2026-02-28T18:30:00.000Z'), amount: 20 }, // 1 Mar IST  -> included
    { date: utc('2026-03-31T18:29:59.999Z'), amount: 30 }, // 31 Mar IST -> included
    { date: utc('2026-03-31T18:30:00.000Z'), amount: 40 }, // 1 Apr IST  -> excluded
  ];
  // 20 + 30 = 50
  assert.equal(sumInWindow(records, window), 50);
  assert.equal(sumInWindow([], window), 0);
  assert.equal(sumInWindow(null, window), 0);
  assert.equal(sumInWindow(records, null), 0);
  assert.equal(sumInWindow([{ date: utc('2026-03-05T00:00:00Z'), amount: 'not a number' }], window), 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// budgetPeriodWindow — the period that was previously ignored
// ─────────────────────────────────────────────────────────────────────────────

test('each budget period resolves to its own window', () => {
  const ref = utc('2026-03-15T10:00:00Z'); // Sunday

  assert.equal(day(budgetPeriodWindow('MONTHLY', ref).start), '2026-03-01');
  assert.equal(day(budgetPeriodWindow('WEEKLY', ref).start), '2026-03-09');
  assert.equal(day(budgetPeriodWindow('YEARLY', ref).start), '2026-01-01');
  assert.equal(day(new Date(budgetPeriodWindow('YEARLY', ref).end.getTime() - 1)), '2026-12-31');

  // Case and whitespace are tolerated; an unknown period is not guessed at.
  assert.equal(budgetPeriodWindow('monthly', ref).granularity, 'month');
  assert.equal(budgetPeriodWindow('  yearly  ', ref).granularity, 'year');
  assert.equal(budgetPeriodWindow('FORTNIGHTLY', ref), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// computeBudgetProgress — independently calculated expectations
// ─────────────────────────────────────────────────────────────────────────────

const marchWindow = monthWindow('2026-03');
const c1 = { id: 'c1', name: 'Groceries', icon: '🛒' };
const c2 = { id: 'c2', name: 'Transport', icon: '🚗' };

const records = [
  { date: utc('2026-03-05T06:00:00Z'), amount: 2000, type: 'EXPENSE', categoryId: 'c1' },
  { date: utc('2026-03-20T06:00:00Z'), amount: 3000, type: 'EXPENSE', categoryId: 'c1' },
  { date: utc('2026-04-02T06:00:00Z'), amount: 5000, type: 'EXPENSE', categoryId: 'c1' }, // April, out of window
  { date: utc('2026-03-10T06:00:00Z'), amount: 1000, type: 'SAVINGS', categoryId: 'c1' }, // savings, not spending
  { date: utc('2026-03-12T06:00:00Z'), amount: 700, type: 'EXPENSE', categoryId: 'c2' }, // another category
];

test('monthly budget spend counts only this month, this category, expenses only', () => {
  // Independently: 2000 + 3000 = 5000. April excluded, SAVINGS excluded, c2 excluded.
  const { rows } = computeBudgetProgress({
    budgets: [{ id: 'b1', amount: 10000, period: 'MONTHLY', categoryId: 'c1', category: c1 }],
    records,
    availableWindow: marchWindow,
    reference: utc('2026-03-15T10:00:00Z'),
  });

  assert.equal(rows[0].spent, 5000);
  assert.equal(rows[0].percentage, 50);
  assert.equal(rows[0].barWidth, 50);
  assert.equal(rows[0].overBudget, false);
  assert.equal(rows[0].periodLabel, '2026-03');
});

test('overspending is reported accurately above 100% and is not capped', () => {
  // Independently: 5000 / 4000 = 125%.
  const { rows, summary } = computeBudgetProgress({
    budgets: [{ id: 'b1', amount: 4000, period: 'MONTHLY', categoryId: 'c1', category: c1 }],
    records,
    availableWindow: marchWindow,
    reference: utc('2026-03-15T10:00:00Z'),
  });

  assert.equal(rows[0].spent, 5000);
  assert.equal(rows[0].percentage, 125, 'the true percentage must not be capped');
  assert.equal(rows[0].barWidth, 100, 'only the drawn bar is capped');
  assert.equal(rows[0].overBudget, true);
  assert.equal(summary.overBudgetCount, 1);
  assert.equal(summary.totalPercentage, 125);
});

test('a WEEKLY budget is measured over its own week, not the dashboard month', () => {
  // Reference 2026-03-11 (Wed) -> week Mon 9 Mar .. Sun 15 Mar IST.
  // Independently: the c1 expenses fall on 5 Mar (before the week) and 20 Mar
  // (after it), so the weekly spend is 0. The c2 expense on 12 Mar is inside the
  // week but a different category, and the SAVINGS row is not spending at all.
  const reference = utc('2026-03-11T10:00:00Z');
  const { rows } = computeBudgetProgress({
    budgets: [{ id: 'bw', amount: 4000, period: 'WEEKLY', categoryId: 'c1', category: c1 }],
    records,
    availableWindow: marchWindow,
    reference,
  });

  assert.equal(rows[0].period, 'WEEKLY');
  assert.equal(rows[0].periodLabel, '2026-03-09', 'the window is the week, not the month');
  assert.equal(rows[0].spent, 0);

  // The contrast is the actual proof that `period` is now honoured: the same
  // fixtures give 5000 over the month and 0 over the week.
  const monthly = computeBudgetProgress({
    budgets: [{ id: 'bm', amount: 4000, period: 'MONTHLY', categoryId: 'c1', category: c1 }],
    records,
    availableWindow: marchWindow,
    reference,
  });
  assert.equal(monthly.rows[0].spent, 5000);
});

test('a YEARLY budget is measured over the year, not the month', () => {
  // 2026: 2000 + 3000 + 5000 (April is still 2026) = 10000; savings excluded.
  const { rows } = computeBudgetProgress({
    budgets: [{ id: 'by', amount: 40000, period: 'YEARLY', categoryId: 'c1', category: c1 }],
    records,
    availableWindow: budgetPeriodWindow('YEARLY', utc('2026-03-15T10:00:00Z')),
    reference: utc('2026-03-15T10:00:00Z'),
  });

  assert.equal(rows[0].spent, 10000);
  assert.equal(rows[0].percentage, 25);
});

test('a budget whose period is not covered by the loaded range reports no figure', () => {
  // The parent loaded only one week, so a monthly budget cannot be computed.
  const weekWindow = budgetPeriodWindow('WEEKLY', utc('2026-03-11T10:00:00Z'));
  const { rows, summary } = computeBudgetProgress({
    budgets: [{ id: 'bm', amount: 10000, period: 'MONTHLY', categoryId: 'c1', category: c1 }],
    records,
    availableWindow: weekWindow,
    reference: utc('2026-03-11T10:00:00Z'),
  });

  assert.equal(rows[0].insufficientData, true);
  assert.equal(rows[0].spent, null, 'must not show a misleading under-count');
  assert.equal(rows[0].percentage, null);
  assert.equal(rows[0].comparable, false);
  assert.equal(summary.skippedCount, 1);
});

test('an unknown budget period is not silently treated as monthly', () => {
  const { rows } = computeBudgetProgress({
    budgets: [{ id: 'bx', amount: 1000, period: 'FORTNIGHTLY', categoryId: 'c1', category: c1 }],
    records,
    availableWindow: marchWindow,
    reference: utc('2026-03-15T10:00:00Z'),
  });
  assert.equal(rows[0].insufficientData, true);
  assert.equal(rows[0].spent, null);
});

test('budgets without a category are skipped, and zero amounts are not comparable', () => {
  const { rows } = computeBudgetProgress({
    budgets: [
      { id: 'orphan', amount: 500, period: 'MONTHLY', categoryId: 'gone', category: null },
      { id: 'zero', amount: 0, period: 'MONTHLY', categoryId: 'c1', category: c1 },
    ],
    records,
    availableWindow: marchWindow,
    reference: utc('2026-03-15T10:00:00Z'),
  });

  assert.equal(rows.length, 1, 'the category-less budget is skipped entirely');
  assert.equal(rows[0].comparable, false, 'a zero budget cannot be a percentage of anything');
  assert.equal(rows[0].percentage, null);
});

test('an empty budget list and empty records are handled without throwing', () => {
  const empty = computeBudgetProgress({ budgets: [], records: [], availableWindow: marchWindow });
  assert.deepEqual(empty.rows, []);
  assert.equal(empty.summary.totalPercentage, null);

  const noRecords = computeBudgetProgress({
    budgets: [{ id: 'b1', amount: 1000, period: 'MONTHLY', categoryId: 'c1', category: c1 }],
    records: [],
    availableWindow: marchWindow,
    reference: utc('2026-03-15T10:00:00Z'),
  });
  assert.equal(noRecords.rows[0].spent, 0);
  assert.equal(noRecords.rows[0].percentage, 0);
  assert.equal(noRecords.rows[0].overBudget, false);
});

test('missing input does not throw', () => {
  assert.doesNotThrow(() => computeBudgetProgress());
  assert.doesNotThrow(() => computeBudgetProgress({ budgets: [null], records: [null], availableWindow: null }));
});

test('the displayed totals agree with the records that fall in the window', () => {
  // Two budgets in different categories; independently:
  //  c1 March = 5000, c2 March = 700 => total 5700 against 11000 budget.
  const { summary } = computeBudgetProgress({
    budgets: [
      { id: 'b1', amount: 10000, period: 'MONTHLY', categoryId: 'c1', category: c1 },
      { id: 'b2', amount: 1000, period: 'MONTHLY', categoryId: 'c2', category: c2 },
    ],
    records,
    availableWindow: marchWindow,
    reference: utc('2026-03-15T10:00:00Z'),
  });

  assert.equal(summary.totalBudget, 11000);
  assert.equal(summary.totalSpent, 5700);
  assert.equal(Math.round(summary.totalPercentage), 52);
});
