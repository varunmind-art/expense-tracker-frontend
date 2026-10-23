// src/utils/expenseTrend.js

/**
 * Expense Trend aggregation for the Expenses & Savings page.
 *
 * Only transactions classified as EXPENSE contribute. Savings are never plotted
 * as spending.
 *
 * Money is summed in integer paise and converted to rupees once, so a year of
 * 100+ rows cannot drift by a paisa.
 *
 * Dates are bucketed from the written calendar date (`dateParts`), never through
 * local getters, so a transaction can never move to an adjacent day or month
 * because of a timezone.
 */

import { dateParts } from './expenseFilters.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Legacy rows carry no `type` and have always been treated as expenses. */
export const isExpenseRow = (expense) => ((expense && expense.type) || 'EXPENSE') === 'EXPENSE';

const toPaise = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
};

const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

const pad2 = (n) => String(n).padStart(2, '0');
const monthKey = (year, month) => `${year}-${pad2(month)}`;
const dayKey = (year, month, day) => `${year}-${pad2(month)}-${pad2(day)}`;

const parseMonth = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
};

const parseYear = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const year = Number(value);
  return Number.isInteger(year) && year > 1900 ? year : null;
};

/** Compact ₹ for axis ticks: ₹1.5k, ₹2.4L, ₹1.1Cr. */
export const compactINR = (value) => {
  const amount = Number(value) || 0;
  const abs = Math.abs(amount);
  if (abs >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${Math.round(amount)}`;
};

/**
 * Group the EXPENSE rows into a chronological series.
 *
 * Granularity follows the selected time filters:
 *   Month + Year -> one point per day of that month (28-31 points)
 *   Year only    -> one point per month (January..December)
 *   Month only   -> that month compared across the years that have data
 *   Neither      -> one point per month across the whole history
 *
 * Missing days/months inside the selected period are filled with zero so the
 * line cannot show a misleading gap. No transaction is ever invented.
 *
 * @returns {{
 *   points: Array<{key:string,label:string,tooltip:string,amount:number,count:number}>,
 *   granularity: 'daily'|'monthly'|'month-across-years'|'monthly-history',
 *   averageLabel: 'daily'|'monthly',
 *   total: number, count: number, average: number,
 *   highest: {label:string, amount:number}|null, isEmpty: boolean
 * }}
 */
export const buildExpenseTrend = (expenses = [], { month = '', year = '' } = {}) => {
  const wantMonth = parseMonth(month);
  const wantYear = parseYear(year);

  // Only expenses inside the selected period contribute.
  const rows = (expenses || []).filter((expense) => {
    if (!isExpenseRow(expense)) return false;
    const parts = dateParts(expense && expense.date);
    if (!parts) return false;
    if (wantYear !== null && parts.year !== wantYear) return false;
    if (wantMonth !== null && parts.month !== wantMonth) return false;
    return true;
  });

  const bucketFor = (parts) => {
    if (wantMonth !== null && wantYear !== null) return dayKey(parts.year, parts.month, parts.day);
    if (wantYear !== null) return monthKey(wantYear, parts.month);
    if (wantMonth !== null) return String(parts.year);
    return monthKey(parts.year, parts.month);
  };

  const buckets = new Map();
  for (const row of rows) {
    const key = bucketFor(dateParts(row.date));
    const current = buckets.get(key) || { paise: 0, count: 0 };
    current.paise += toPaise(row.amount);
    current.count += 1;
    buckets.set(key, current);
  }

  // Build the ordered period list, complete within the selected window.
  const periods = [];

  if (wantMonth !== null && wantYear !== null) {
    const total = daysInMonth(wantYear, wantMonth);
    for (let day = 1; day <= total; day += 1) {
      periods.push({
        key: dayKey(wantYear, wantMonth, day),
        label: String(day),
        tooltip: `${day} ${MONTH_NAMES[wantMonth - 1]} ${wantYear}`,
      });
    }
  } else if (wantYear !== null) {
    for (let m = 1; m <= 12; m += 1) {
      periods.push({
        key: monthKey(wantYear, m),
        label: MONTH_SHORT[m - 1],
        tooltip: `${MONTH_NAMES[m - 1]} ${wantYear}`,
      });
    }
  } else if (wantMonth !== null) {
    const years = [...new Set(rows.map((row) => dateParts(row.date).year))].sort((a, b) => a - b);
    if (years.length > 0) {
      for (let y = years[0]; y <= years[years.length - 1]; y += 1) {
        periods.push({ key: String(y), label: String(y), tooltip: `${MONTH_NAMES[wantMonth - 1]} ${y}` });
      }
    }
  } else {
    const keys = [...new Set(rows.map((row) => {
      const parts = dateParts(row.date);
      return monthKey(parts.year, parts.month);
    }))].sort();

    if (keys.length > 0) {
      const [firstYear, firstMonth] = keys[0].split('-').map(Number);
      const [lastYear, lastMonth] = keys[keys.length - 1].split('-').map(Number);
      let y = firstYear;
      let m = firstMonth;
      while (y < lastYear || (y === lastYear && m <= lastMonth)) {
        periods.push({
          key: monthKey(y, m),
          label: `${MONTH_SHORT[m - 1]} '${String(y).slice(-2)}`,
          tooltip: `${MONTH_NAMES[m - 1]} ${y}`,
        });
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
      }
    }
  }

  const points = periods.map((period) => {
    const bucket = buckets.get(period.key) || { paise: 0, count: 0 };
    return {
      key: period.key,
      label: period.label,
      tooltip: period.tooltip,
      amount: bucket.paise / 100,
      count: bucket.count,
      paise: bucket.paise,
    };
  });

  const totalPaise = points.reduce((sum, point) => sum + point.paise, 0);
  const count = points.reduce((sum, point) => sum + point.count, 0);
  const averagePaise = points.length > 0 ? Math.round(totalPaise / points.length) : 0;

  let highest = null;
  for (const point of points) {
    if (point.paise > 0 && (highest === null || point.paise > highest.paise)) highest = point;
  }

  const granularity =
    wantMonth !== null && wantYear !== null
      ? 'daily'
      : wantYear !== null
        ? 'monthly'
        : wantMonth !== null
          ? 'month-across-years'
          : 'monthly-history';

  return {
    // `paise` stays internal; consumers get rupees only.
    points: points.map((point) => ({
      key: point.key,
      label: point.label,
      tooltip: point.tooltip,
      amount: point.amount,
      count: point.count,
    })),
    granularity,
    averageLabel: granularity === 'daily' ? 'daily' : 'monthly',
    total: totalPaise / 100,
    count,
    average: averagePaise / 100,
    highest: highest === null ? null : { label: highest.tooltip, amount: highest.paise / 100 },
    isEmpty: count === 0,
  };
};

/** A short human description of what the chart is showing. */
export const describeTrend = (trend, { month = '', year = '' } = {}) => {
  const wantMonth = parseMonth(month);
  const wantYear = parseYear(year);

  if (wantMonth !== null && wantYear !== null) {
    return `Daily expenses — ${MONTH_NAMES[wantMonth - 1]} ${wantYear}`;
  }
  if (wantYear !== null) return `Monthly expenses — ${wantYear}`;
  if (wantMonth !== null) return `${MONTH_NAMES[wantMonth - 1]} compared across years`;
  if (!trend || trend.points.length === 0) return 'Monthly expenses — no history yet';
  const first = trend.points[0].tooltip;
  const last = trend.points[trend.points.length - 1].tooltip;
  return `Monthly expenses — ${first} to ${last}`;
};
