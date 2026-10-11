/**
 * P0-6B — budget progress calculation.
 *
 * Defects being fixed (all in BudgetProgress.jsx before this module):
 *   1. `b.period` was ignored entirely (grep -c period → 0), so a WEEKLY or
 *      YEARLY budget was measured against whatever window the dashboard had
 *      selected. A ₹5,000 weekly budget was compared with a full month of spend.
 *   2. The parent passed a filter-scoped expense list, so under a "this week"
 *      filter a monthly budget was measured against one week and showed green.
 *   3. `Math.min(spent / amount * 100, 100)` capped the percentage, so 100% and
 *      300% rendered identically and overspending was invisible.
 *
 * Pure and dependency-free, so the arithmetic is unit testable with synthetic
 * records and independently calculated expectations.
 */

import { budgetPeriodWindow, isWithinWindow } from './dateWindow.js';

/** Records only ever count against a budget if they are real expenses. */
const isExpense = (record) => (record && (record.type || 'EXPENSE')) === 'EXPENSE';

const toAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Is the budget's own window fully inside the range the caller actually loaded?
 * If not, the spend figure would be an under-count, so it is reported as
 * unavailable rather than as a misleading number.
 */
const isCoveredBy = (budgetWindow, availableWindow) => {
  if (!budgetWindow || !availableWindow) return false;
  return (
    budgetWindow.start.getTime() >= availableWindow.start.getTime() &&
    budgetWindow.end.getTime() <= availableWindow.end.getTime()
  );
};

/**
 * @param {object} input
 * @param {Array} input.budgets rows with { id, amount, period, category, categoryId }
 * @param {Array} input.records expense rows with { date, amount, type, categoryId }
 * @param {object|null} input.availableWindow the range `records` was loaded for
 * @param {Date} [input.reference] anchor for period windows (defaults to now)
 * @returns {{rows: Array, summary: object}}
 */
export const computeBudgetProgress = ({
  budgets = [],
  records = [],
  availableWindow = null,
  reference = new Date(),
  offsetMinutes,
} = {}) => {
  const rows = budgets
    .filter((budget) => budget && budget.category)
    .map((budget) => {
      const budgetWindow = budgetPeriodWindow(budget.period, reference, offsetMinutes);
      const budgetAmount = toAmount(budget.amount);
      const covered = isCoveredBy(budgetWindow, availableWindow);

      const spent = covered
        ? records.reduce((total, record) => {
            if (!isExpense(record)) return total;
            if (budget.categoryId && record.categoryId !== budget.categoryId) return total;
            if (!isWithinWindow(budgetWindow, record.date)) return total;
            return total + toAmount(record.amount);
          }, 0)
        : null;

      // The true percentage is never capped. The bar may cap its width, but the
      // number shown to the user stays accurate.
      const percentage =
        spent !== null && budgetAmount > 0 ? (spent / budgetAmount) * 100 : null;

      return {
        id: budget.id,
        name: budget.category.name,
        icon: budget.category.icon || '📌',
        period: String(budget.period || 'MONTHLY').toUpperCase(),
        periodLabel: budgetWindow ? budgetWindow.label : 'unknown period',
        budgetAmount,
        spent,
        percentage,
        barWidth: percentage === null ? 0 : Math.min(percentage, 100),
        overBudget: percentage !== null && percentage > 100,
        // Only a budget with a positive amount and loaded data can be judged.
        comparable: covered && budgetAmount > 0,
        insufficientData: !covered,
      };
    });

  const comparableRows = rows.filter((row) => row.comparable);
  const totalBudget = comparableRows.reduce((total, row) => total + row.budgetAmount, 0);
  const totalSpent = comparableRows.reduce((total, row) => total + row.spent, 0);

  return {
    rows,
    summary: {
      totalBudget,
      totalSpent,
      // Uncapped, so the summary can show "112% of budget".
      totalPercentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : null,
      overBudgetCount: comparableRows.filter((row) => row.overBudget).length,
      skippedCount: rows.length - comparableRows.length,
    },
  };
};
