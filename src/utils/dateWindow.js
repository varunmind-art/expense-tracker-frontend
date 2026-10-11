/**
 * P0-6B — one date-window resolver for the whole dashboard.
 *
 * Before this module `Dashboard.jsx` computed the month label TWICE and
 * differently: once from the filter's start date (for `/dashboard/summary`) and
 * once from `new Date()` (for `TopMerchants`). On a week that straddles a month
 * boundary the two disagreed, so the summary cards, the merchant card and the
 * expense charts could each show a different period.
 *
 * This mirrors the backend calculation in `src/lib/dateRange.js` (the frontend
 * cannot import that CommonJS module), using the same fixed application offset so
 * a calendar day means the same day on both sides. India has no DST, so a fixed
 * offset is exact; a full IANA timezone library is the correct long-term answer
 * for other regions and is noted rather than pretended.
 *
 * Pure and dependency-free, so it is unit testable without rendering.
 */

/** Application timezone: IST (UTC+05:30), matching the backend. */
export const APP_UTC_OFFSET_MINUTES = 330;

export const FILTERS = Object.freeze({
  THIS_WEEK: 'this-week',
  THIS_MONTH: 'this-month',
  LAST_MONTH: 'last-month',
  CUSTOM: 'custom',
});

const pad = (n) => String(n).padStart(2, '0');

const toAppLocal = (instant, offsetMinutes) =>
  new Date(instant.getTime() + offsetMinutes * 60000);

const fromAppLocal = (year, monthIndex, day, offsetMinutes) =>
  new Date(Date.UTC(year, monthIndex, day) - offsetMinutes * 60000);

export const daysInMonth = (year, monthIndex) =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/** "YYYY-MM-DD" for an instant, in application-local time. */
export const appLocalDateString = (instant, offsetMinutes = APP_UTC_OFFSET_MINUTES) => {
  const local = toAppLocal(new Date(instant), offsetMinutes);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
};

/** The "YYYY-MM" label for an instant, in application-local time. */
export const appLocalMonthLabel = (instant, offsetMinutes = APP_UTC_OFFSET_MINUTES) => {
  const local = toAppLocal(new Date(instant), offsetMinutes);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}`;
};

export const parseMonthLabel = (label) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(label || '').trim());
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(match[1]), monthIndex: month - 1 };
};

/** Half-open month window [start, end) in application-local time. */
export const monthWindow = (label, offsetMinutes = APP_UTC_OFFSET_MINUTES) => {
  const parsed = parseMonthLabel(label);
  if (!parsed) return null;
  return {
    key: label,
    label,
    monthLabel: label,
    granularity: 'month',
    start: fromAppLocal(parsed.year, parsed.monthIndex, 1, offsetMinutes),
    end: fromAppLocal(parsed.year, parsed.monthIndex + 1, 1, offsetMinutes),
  };
};

export const previousMonthWindow = (window, offsetMinutes = APP_UTC_OFFSET_MINUTES) => {
  const parsed = parseMonthLabel(window && window.monthLabel);
  if (!parsed) return null;
  const prevLabel =
    parsed.monthIndex === 0
      ? `${parsed.year - 1}-12`
      : `${parsed.year}-${pad(parsed.monthIndex)}`;
  return monthWindow(prevLabel, offsetMinutes);
};

/**
 * Resolve the selected dashboard period into one window object.
 *
 * `monthLabel` is always supplied so the month-granular summary endpoint keeps
 * its contract; `granularity` tells the UI what the window actually represents,
 * which is how a month-only widget can be labelled honestly instead of silently
 * showing a different period.
 *
 * @returns {{key,label,monthLabel,start,end,granularity}|null} null when invalid
 */
export const resolveWindow = (filter, options = {}, offsetMinutes = APP_UTC_OFFSET_MINUTES) => {
  const now = options.now ? new Date(options.now) : new Date();
  if (Number.isNaN(now.getTime())) return null;

  if (filter === FILTERS.THIS_WEEK) {
    const local = toAppLocal(now, offsetMinutes);
    const year = local.getUTCFullYear();
    const monthIndex = local.getUTCMonth();
    const day = local.getUTCDate();
    // Monday-based, matching the backend week window.
    const weekday = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
    const backToMonday = (weekday + 6) % 7;
    const start = fromAppLocal(year, monthIndex, day - backToMonday, offsetMinutes);
    return {
      key: 'this-week',
      label: `${appLocalDateString(start, offsetMinutes)} (week)`,
      monthLabel: appLocalMonthLabel(now, offsetMinutes),
      granularity: 'week',
      start,
      end: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  if (filter === FILTERS.LAST_MONTH) {
    const current = monthWindow(appLocalMonthLabel(now, offsetMinutes), offsetMinutes);
    const previous = previousMonthWindow(current, offsetMinutes);
    return { ...previous, key: 'last-month', label: previous.label };
  }

  if (filter === FILTERS.CUSTOM) {
    const custom = options.custom;
    if (!custom || !custom.start || !custom.end) return null;
    const start = new Date(custom.start);
    const end = new Date(custom.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    if (end <= start) return null; // empty or inverted
    return {
      key: 'custom',
      label: `${appLocalDateString(start, offsetMinutes)}..${appLocalDateString(
        new Date(end.getTime() - 1),
        offsetMinutes
      )}`,
      monthLabel: appLocalMonthLabel(start, offsetMinutes),
      granularity: 'custom',
      start,
      end,
    };
  }

  // Default: the current month.
  const month = monthWindow(appLocalMonthLabel(now, offsetMinutes), offsetMinutes);
  return { ...month, key: 'this-month', label: month.label };
};

/** The window immediately before `window`, for comparisons. */
export const previousWindow = (window, offsetMinutes = APP_UTC_OFFSET_MINUTES) => {
  if (!window) return null;

  if (window.granularity === 'month') {
    return previousMonthWindow(window, offsetMinutes);
  }

  if (window.granularity === 'week') {
    const start = new Date(window.start.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      ...window,
      key: `${window.key}:previous`,
      start,
      end: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  const span = window.end.getTime() - window.start.getTime();
  const start = new Date(window.start.getTime() - span);
  return { ...window, key: `${window.key}:previous`, start, end: new Date(window.start.getTime()) };
};

/** In-memory equivalent of a half-open Prisma range. */
export const isWithinWindow = (window, instant) => {
  if (!window) return false;
  const time = new Date(instant).getTime();
  return !Number.isNaN(time) && time >= window.start.getTime() && time < window.end.getTime();
};

/** Sum a numeric field over the records that fall inside the window. */
export const sumInWindow = (records, window, valueOf) => {
  if (!Array.isArray(records) || !window) return 0;
  return records.reduce((total, record) => {
    if (!isWithinWindow(window, record && record.date)) return total;
    const value = Number(valueOf ? valueOf(record) : record.amount);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
};

/**
 * The window for one budget's own `period`, anchored on `reference`.
 *
 * Budget `period` is stored as a free string ('MONTHLY', 'WEEKLY', 'YEARLY').
 * An unrecognised period returns null so the caller can say "not comparable"
 * rather than silently treating it as monthly.
 */
export const budgetPeriodWindow = (
  period,
  reference = new Date(),
  offsetMinutes = APP_UTC_OFFSET_MINUTES
) => {
  const normalised = String(period || 'MONTHLY').trim().toUpperCase();
  const now = new Date(reference);
  if (Number.isNaN(now.getTime())) return null;

  if (normalised === 'MONTHLY') {
    return monthWindow(appLocalMonthLabel(now, offsetMinutes), offsetMinutes);
  }

  if (normalised === 'WEEKLY') {
    const local = toAppLocal(now, offsetMinutes);
    const year = local.getUTCFullYear();
    const monthIndex = local.getUTCMonth();
    const day = local.getUTCDate();
    const weekday = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
    const backToMonday = (weekday + 6) % 7;
    const start = fromAppLocal(year, monthIndex, day - backToMonday, offsetMinutes);
    return {
      key: 'budget-week',
      label: appLocalDateString(start, offsetMinutes),
      monthLabel: appLocalMonthLabel(now, offsetMinutes),
      granularity: 'week',
      start,
      end: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  if (normalised === 'YEARLY') {
    const local = toAppLocal(now, offsetMinutes);
    const year = local.getUTCFullYear();
    return {
      key: `budget-year-${year}`,
      label: String(year),
      monthLabel: `${year}-01`,
      granularity: 'year',
      start: fromAppLocal(year, 0, 1, offsetMinutes),
      end: fromAppLocal(year + 1, 0, 1, offsetMinutes),
    };
  }

  return null;
};
