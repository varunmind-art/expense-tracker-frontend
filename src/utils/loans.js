// src/utils/loans.js

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
export const loanHeadline = (summary) => {
  if (!summary) return '—';
  if (summary.isClosed) return 'Fully repaid';
  if (summary.isActive === false) return 'Paused';
  const overdue = Number(summary.overdueInstallments || 0);
  if (overdue > 0) return `${overdue} instalment${overdue === 1 ? '' : 's'} overdue`;
  return `${formatMonths(summary.remainingMonths)} left`;
};

/**
 * The next instalment the borrower actually owes. It is derived from the loan's
 * own timeline, so it can legitimately be in the past — a scheduled instalment
 * with no payment recorded is overdue, not "upcoming".
 */
export const nextDueLabel = (summary) => {
  if (!summary || !summary.nextDueDate) return '—';
  const overdue = Number(summary.overdueInstallments || 0);
  return overdue > 0
    ? `${formatDate(summary.nextDueDate)} (${overdue} overdue)`
    : formatDate(summary.nextDueDate);
};
