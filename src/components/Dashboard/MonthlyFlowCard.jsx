import React from 'react';
import { formatIndianCurrency } from '../../utils/helpers';

const MonthlyFlowCard = ({ summary }) => {
  const income = summary?.income || 0;
  const spent = summary?.spent || 0;
  const saved = summary?.saved || 0;
  const unspent = summary?.unspent || 0;

  // Percentages relative to income (guard against divide-by-zero)
  const pctOf = (v) => (income > 0 ? Math.max(0, Math.min(100, (v / income) * 100)) : 0);

  const spentPct = pctOf(spent);
  const savedPct = pctOf(saved);
  const unspentPct = income > 0 ? Math.max(0, 100 - spentPct - savedPct) : 0;

  const hasIncome = income > 0;

  return (
    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[2px] rounded-xl shadow-lg">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Monthly Flow</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {summary?.month || 'Current month'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Savings Rate</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {hasIncome ? `${summary.savingsRate.toFixed(1)}%` : '—'}
            </p>
          </div>
        </div>

        {!hasIncome && (
          <div className="mb-4 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
            ⚠️ No income logged for this month. Add your salary to see the full flow.
          </div>
        )}

        {/* Stacked bar */}
        <div className="w-full h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${spentPct}%` }}
            title={`Spent ${spentPct.toFixed(1)}%`}
          />
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${savedPct}%` }}
            title={`Saved ${savedPct.toFixed(1)}%`}
          />
          <div
            className="h-full bg-gray-400 dark:bg-gray-500 transition-all"
            style={{ width: `${unspentPct}%` }}
            title={`Unspent ${unspentPct.toFixed(1)}%`}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Spent</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">
                {formatIndianCurrency(spent)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Saved</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">
                {formatIndianCurrency(saved)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Unspent</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">
                {formatIndianCurrency(unspent)}
              </p>
            </div>
          </div>
        </div>

        {/* Total income row */}
        <div className="mt-4 pt-4 border-t dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">Total Income</span>
          <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
            {formatIndianCurrency(income)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MonthlyFlowCard;