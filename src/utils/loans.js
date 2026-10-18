// src/utils/loans.js

import { formatIndianCurrency } from './helpers.js';

/**
 * Loan Tracker — presentation helpers.
 *
 * Deliberately contains NO loan mathematics. Every financial number (EMI,
 * interest split, outstanding balance, interest saved, revised payoff date) is
 * computed by the backend in `src/lib/loans.js` and returned by the API, so the
 * screen and the ledger can never disagree. This file only turns those numbers
 * and enums into labels and colours.
 */

export const LOAN_TYPES = [
  { value: 'HOME_LOAN', label: 'Home loan' },
  { value: 'PERSONAL_LOAN', label: 'Personal loan' },
  { value: 'CAR_LOAN', label: 'Car loan' },
  { value: 'EDUCATION_LOAN', label: 'Education loan' },
  { value: 'GOLD_LOAN', label: 'Gold loan' },
  { value: 'BUSINESS_LOAN', label: 'Business loan' },
  { value: 'CREDIT_CARD_LOAN', label: 'Credit card loan' },
  { value: 'OTHER', label: 'Other' },
];

export const PAYMENT_KINDS = [
  { value: 'EMI', label: 'Regular EMI' },
  { value: 'PREPAYMENT', label: 'Prepayment (extra principal)' },
  { value: 'PART_PAYMENT', label: 'Part payment' },
];

const LOAN_TYPE_LABELS = LOAN_TYPES.reduce((acc, type) => {
  acc[type.value] = type.label;
  return acc;
}, {});

const PAYMENT_KIND_LABELS = {
  EMI: 'EMI',
  PREPAYMENT: 'Prepayment',
  PART_PAYMENT: 'Part payment',
  ADJUSTMENT: 'Adjustment',
};

export const loanTypeLabel = (value) => LOAN_TYPE_LABELS[value] || 'Loan';

export const paymentKindLabel = (value) => PAYMENT_KIND_LABELS[value] || value || 'Payment';

const isDate = (value) => value !== null && value !== undefined && value !== '';

/** "05 Feb 2026" — or an em dash when there is no date. */
export const formatDate = (value) => {
  if (!isDate(value)) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/** "Feb 2026" — used for schedule periods. */
export const formatMonth = (value) => {
  if (!isDate(value)) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

/** "1 yr 8 mo" from a month count. */
export const formatMonths = (months) => {
  if (months === null || months === undefined || !Number.isFinite(Number(months))) return '—';
  const total = Math.max(0, Math.round(Number(months)));
  const years = Math.floor(total / 12);
  const rest = total % 12;
  if (years === 0) return `${rest} mo`;
  if (rest === 0) return `${years} yr`;
  return `${years} yr ${rest} mo`;
};

export const formatPercent = (value, digits = 2) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return `${Number(value).toFixed(digits)}%`;
};

/** Clamp a progress percentage into 0-100 for width styling. */
export const progressWidth = (percent) => {
  const value = Number(percent);
  if (!Number.isFinite(value)) return '0%';
  return `${Math.min(100, Math.max(0, value))}%`;
};

/**
 * Colour for a schedule period. History and forecast are visually distinct on
 * purpose: a paid period must never look like a projection.
 */
export const scheduleStatusClasses = (status) => {
  switch (status) {
    case 'PAID':
      return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200';
    case 'PARTIAL':
      return 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200';
    case 'OVERDUE':
      return 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 font-medium';
    case 'UNPAID':
      return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200';
    default:
      return 'text-gray-500 dark:text-gray-400';
  }
};

export const scheduleStatusLabel = (status) => {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'PARTIAL':
      return 'Part paid';
    case 'UNPAID':
      return 'Due';
    case 'OVERDUE':
      return 'Overdue';
    default:
      return 'Forecast';
  }
};

/** Tailwind classes shared by every button variant used in the Loans screens. */
export const BUTTON = {
  primary:
    'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50',
  secondary:
    'px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition',
  danger:
    'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50',
  subtle:
    'px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition',
  subtleDanger:
    'px-2 py-1 text-xs font-medium rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 transition',
  subtleNeutral:
    'px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition',
};

export const INPUT =
  'w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white';

export const CARD = 'bg-white dark:bg-gray-800 p-6 rounded-lg shadow';

export const LABEL = 'block text-sm text-gray-600 dark:text-gray-400 mb-1';

/**
 * The one thing a user needs to see about a loan at a glance, derived from the
 * backend summary rather than recomputed here.
 */
/**
 * A loan's real status. "Settlement pending" means the bank balance has reached
 * zero but the account is not formally closed, so it must not read as ongoing.
 */
export const LOAN_STATUS_LABELS = {
  ACTIVE: 'Active',
  SETTLEMENT_PENDING: 'Settlement pending',
  CLOSED: 'Closed',
  PAUSED: 'Paused',
};

export const loanStatusLabel = (status) => LOAN_STATUS_LABELS[status] || 'Active';

export const loanStatusClasses = (status) => {
  switch (status) {
    case 'SETTLEMENT_PENDING':
      return 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200';
    case 'CLOSED':
      return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200';
    case 'PAUSED':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
    default:
      return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200';
  }
};

/**
 * Outstanding principal is null whenever the bank did not disclose a
 * principal/interest split. Rendering that as 0% repaid or as the disbursed
 * figure would imply a verification that never happened.
 */
export const principalAllocationPending = (summary) =>
  Boolean(summary && (summary.allocationPending || summary.outstandingPrincipal === null));

export const formatPrincipal = (summary, value) => {
  if (principalAllocationPending(summary)) return 'Principal allocation pending';
  return formatIndianCurrency(value);
};

export const formatProgress = (summary) => {
  if (principalAllocationPending(summary)) return 'Principal allocation pending';
  const value = Number(summary?.progressPercent);
  return Number.isFinite(value) ? `${value.toFixed(2)}% repaid` : '—';
};

/** A reconciled bank balance is only meaningful with the date it was read. */
export const formatBalanceAsOf = (summary) => {
  if (!summary || summary.bankBalance === null || summary.bankBalance === undefined) return '—';
  const on = summary.bankBalanceAsOf ? ` as of ${formatDate(summary.bankBalanceAsOf)}` : '';
  return `${formatIndianCurrency(summary.bankBalance)}${on}`;
};

export const loanHeadline = (summary) => {
  if (!summary) return '—';
  if (summary.status === 'SETTLEMENT_PENDING') return 'Settlement pending';
  if (summary.status === 'CLOSED' || summary.isClosed) return 'Fully repaid';
  if (summary.status === 'PAUSED' || summary.isActive === false) return 'Paused';

  const awaiting = Number(summary.scheduledAwaitingConfirmation || 0);
  if (awaiting > 0) {
    return `${awaiting} scheduled instalment${awaiting === 1 ? '' : 's'} awaiting confirmation`;
  }
  if (principalAllocationPending(summary)) return 'Principal allocation pending';
  if (summary.projectionUnavailable) return 'Tenure unavailable';
  if (summary.remainingMonths === null || summary.remainingMonths === undefined) return '—';
  return `${formatMonths(summary.remainingMonths)} left`;
};

/** The next deduction that is genuinely scheduled (never a synthetic timeline). */
export const nextScheduledLabel = (summary) => {
  if (!summary || !summary.nextScheduledDueDate) return '—';
  const amount = summary.nextScheduledAmount === null ? '' : ` · ${formatIndianCurrency(summary.nextScheduledAmount)}`;
  return `${formatDate(summary.nextScheduledDueDate)}${amount}`;
};

/** Shown wherever a money figure is genuinely not computable. */
export const ALLOCATION_PENDING_LABEL = 'Unavailable — allocation pending';

/**
 * Aggregate the My Loans header across loans.
 *
 * A null means "not computable", NOT zero. One unavailable loan makes the
 * aggregate unavailable — summing the rest would silently understate it, which is
 * how a header ends up reporting "Total outstanding ₹0.00" for real debt.
 *
 * Bank balances are never summed: each is stated as of its own date, so they are
 * returned as a list rather than a total.
 */
export const aggregateLoanTotals = (loans = []) => {
  const totals = {
    outstanding: 0,
    repaid: 0,
    outstandingKnown: true,
    repaidKnown: true,
    active: 0,
    settlementPending: 0,
    closed: 0,
    awaiting: 0,
    bankBalances: [],
  };

  for (const loan of loans || []) {
    const summary = (loan && loan.summary) || {};

    if (typeof summary.outstandingPrincipal === 'number') totals.outstanding += summary.outstandingPrincipal;
    else totals.outstandingKnown = false;

    if (typeof summary.principalRepaid === 'number') totals.repaid += summary.principalRepaid;
    else totals.repaidKnown = false;

    if (summary.bankBalance !== null && summary.bankBalance !== undefined) {
      totals.bankBalances.push({
        id: loan.id,
        name: loan.name,
        balance: summary.bankBalance,
        asOf: summary.bankBalanceAsOf,
      });
    }

    if (summary.status === 'ACTIVE') totals.active += 1;
    if (summary.status === 'SETTLEMENT_PENDING') totals.settlementPending += 1;
    if (summary.status === 'CLOSED') totals.closed += 1;
    totals.awaiting += Number(summary.scheduledAwaitingConfirmation || 0);
  }

  return totals;
};
