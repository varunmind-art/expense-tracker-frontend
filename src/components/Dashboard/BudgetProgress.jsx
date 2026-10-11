import { formatIndianCurrency } from '../../utils/helpers';
import { computeBudgetProgress } from '../../utils/budgetProgress';

/**
 * P0-6B — rewritten to fix three defects:
 *
 *   1. `b.period` was ignored (no reference to period anywhere in the old file),
 *      so a WEEKLY or YEARLY budget was measured against whatever window the
 *      dashboard had selected.
 *   2. The parent's filter-scoped expense list was summed directly, so under a
 *      week filter a monthly budget was measured against one week and showed
 *      green even when the month was already overspent.
 *   3. The percentage was clamped with Math.min(..., 100), so 100% and 300%
 *      looked identical and overspending was invisible.
 *
 * Budgets are a deliberately INDEPENDENT period widget: a budget carries its own
 * `period`, so it is measured over its own current period rather than the
 * dashboard's selected range, and that period is printed on every row so the
 * scope is never implicit. `window` is the range the parent actually loaded; if
 * it does not fully cover a budget's period the figure is withheld rather than
 * shown as a misleading under-count.
 */
const BudgetProgress = ({ expenses, budgets, window: availableWindow }) => {
  const { rows, summary } = computeBudgetProgress({
    budgets,
    records: expenses,
    availableWindow,
  });

  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center text-gray-500">
        No budgets set
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Budget Progress</h3>
        {summary.totalPercentage !== null && (
          <span
            className={`text-sm font-medium ${
              summary.overBudgetCount > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {Math.round(summary.totalPercentage)}% of budget
            {summary.overBudgetCount > 0 && ` · ${summary.overBudgetCount} over`}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id}>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                {row.icon} {row.name}
                <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{row.period}</span>
              </span>
              {row.spent === null ? (
                <span
                  className="text-xs text-gray-400 dark:text-gray-500"
                  title={`Not comparable with the loaded range${
                    availableWindow ? ` (${availableWindow.label})` : ''
                  }`}
                >
                  — needs {row.periodLabel}
                </span>
              ) : (
                <span className={row.overBudget ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                  {formatIndianCurrency(row.spent)} / {formatIndianCurrency(row.budgetAmount)}
                </span>
              )}
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${
                  row.overBudget
                    ? 'bg-red-600'
                    : row.percentage > 90
                    ? 'bg-red-500'
                    : row.percentage > 70
                    ? 'bg-yellow-400'
                    : 'bg-green-500'
                }`}
                // Only the drawn bar is capped; the figure below stays accurate.
                style={{ width: `${row.barWidth}%` }}
              />
            </div>

            {row.spent !== null && (
              <div className="flex justify-between text-xs mt-0.5">
                <span className="text-gray-400 dark:text-gray-500">{row.periodLabel}</span>
                <span
                  className={
                    row.overBudget
                      ? 'text-red-600 dark:text-red-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }
                >
                  {Math.round(row.percentage)}%
                  {row.overBudget && ` · over by ${formatIndianCurrency(row.spent - row.budgetAmount)}`}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {summary.skippedCount > 0 && (
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          {summary.skippedCount} budget{summary.skippedCount === 1 ? '' : 's'} need a wider date range to be
          measured accurately.
        </p>
      )}
    </div>
  );
};

export default BudgetProgress;
