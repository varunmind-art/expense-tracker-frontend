// src/utils/expenseFilters.js

/**
 * Transaction filtering for the Expenses & Savings listing.
 *
 * All filters combine with AND. Filtering happens entirely client-side, on the
 * transaction's OCCURRENCE date (`expense.date`) — never on a created/updated
 * timestamp.
 *
 * Date handling is deliberately timezone-free. The API returns dates such as
 * `2026-10-05T00:00:00.000Z`, which is the calendar date the user picked, stored
 * as UTC midnight. Running that through `new Date(...)` and local getters shifts
 * the day for anyone west of UTC, so the leading `YYYY-MM-DD` is read straight
 * from the string instead. A genuine timestamp still resolves through the local
 * calendar, which is how the table renders it.
 */

export const MONTH_OPTIONS = [
  { value: '', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

/** The defaults that must never hide a previously visible record. */
export const DEFAULT_TRANSACTION_FILTERS = {
  typeTab: 'ALL',
  search: '',
  categoryId: '',
  merchant: '',
  month: '',
  year: '',
};

const ISO_CALENDAR = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Calendar parts of a transaction date.
 *
 * An ISO string yields the date exactly as written (no timezone conversion); any
 * other value falls back to the local calendar.
 *
 * @returns {{year:number, month:number, day:number}|null} month is 1-12
 */
export const dateParts = (value) => {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    const match = ISO_CALENDAR.exec(value.trim());
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { year, month, day };
    }
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return { year: parsed.getFullYear(), month: parsed.getMonth() + 1, day: parsed.getDate() };
};

/** Transaction years, newest first, derived from the data rather than hardcoded. */
export const availableYears = (expenses = []) => {
  const years = new Set();
  for (const expense of expenses || []) {
    const parts = dateParts(expense && expense.date);
    if (parts) years.add(parts.year);
  }
  return [...years].sort((a, b) => b - a);
};

/** '' (any) or a 1-12 month number. */
const toMonth = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
};

/** '' (any) or a four-digit year. */
const toYear = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const year = Number(value);
  return Number.isInteger(year) && year > 1900 ? year : null;
};

/**
 * Apply every active filter with AND logic.
 *
 * @param {Array} expenses
 * @param {{typeTab?:string, search?:string, categoryId?:string,
 *          merchant?:string, month?:string, year?:string}} filters
 * @returns {Array} the matching expenses, in their original order
 */
export const filterExpenses = (expenses = [], filters = {}) => {
  const {
    typeTab = 'ALL',
    search = '',
    categoryId = '',
    merchant = '',
    month = '',
    year = '',
  } = filters || {};

  const needle = String(search || '').toLowerCase();
  const wantMonth = toMonth(month);
  const wantYear = toYear(year);

  return (expenses || []).filter((expense) => {
    if (!expense) return false;

    // Expense / Savings / All tab.
    if (typeTab !== 'ALL' && (expense.type || 'EXPENSE') !== typeTab) return false;

    if (categoryId && expense.categoryId !== categoryId) return false;
    if (merchant && expense.merchant !== merchant) return false;

    if (needle) {
      const matches =
        expense.note?.toLowerCase().includes(needle) ||
        expense.merchant?.toLowerCase().includes(needle) ||
        expense.category?.name.toLowerCase().includes(needle);
      // An absent note/merchant/category is simply not a match, as before.
      if (!matches) return false;
    }

    if (wantMonth !== null || wantYear !== null) {
      const parts = dateParts(expense.date);
      if (!parts) return false;
      if (wantMonth !== null && parts.month !== wantMonth) return false;
      if (wantYear !== null && parts.year !== wantYear) return false;
    }

    return true;
  });
};

/**
 * The existing sort, unchanged: same fields, same comparator, same defaults.
 */
export const sortExpenses = (rows = [], { sortBy = 'date', sortOrder = 'desc' } = {}) => {
  return [...(rows || [])].sort((a, b) => {
    let valA;
    let valB;

    if (sortBy === 'date') {
      valA = new Date(a.date);
      valB = new Date(b.date);
    } else if (sortBy === 'amount') {
      valA = parseFloat(a.amount || 0);
      valB = parseFloat(b.amount || 0);
    } else if (sortBy === 'merchant') {
      valA = a.merchant || '';
      valB = b.merchant || '';
    } else {
      valA = a.category?.name || '';
      valB = b.category?.name || '';
    }

    if (sortOrder === 'asc') return valA > valB ? 1 : -1;
    return valA < valB ? 1 : -1;
  });
};

/**
 * The summary cards. `savings` keeps its existing meaning: the total of rows
 * whose type is SAVINGS, a subset of `total`.
 */
export const summarizeTransactions = (rows = []) => {
  let total = 0;
  let savings = 0;

  for (const expense of rows || []) {
    const amount = parseFloat((expense && expense.amount) || 0);
    if (!Number.isFinite(amount)) continue;
    total += amount;
    if ((expense.type || 'EXPENSE') === 'SAVINGS') savings += amount;
  }

  return { count: (rows || []).length, total, savings };
};

/** True when any filter other than sorting/type is narrowing the list. */
export const hasActiveFilters = (filters = {}) => {
  const { search = '', categoryId = '', merchant = '', month = '', year = '' } = filters || {};
  return Boolean(search) || Boolean(categoryId) || Boolean(merchant) || Boolean(month) || Boolean(year);
};
