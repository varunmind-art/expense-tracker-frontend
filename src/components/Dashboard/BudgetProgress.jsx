import React from 'react';
import { formatIndianCurrency } from '../../utils/helpers';

const BudgetProgress = ({ expenses, budgets }) => {
  const spentMap = {};
  expenses.forEach(exp => {
    const catId = exp.categoryId;
    spentMap[catId] = (spentMap[catId] || 0) + parseFloat(exp.amount || 0);
  });

  const budgetData = budgets
    .filter(b => b.category)
    .map(b => {
      const spent = spentMap[b.categoryId] || 0;
      const budgetAmount = parseFloat(b.amount || 0);
      const percentage = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;
      return { ...b, spent, budgetAmount, percentage };
    });

  if (budgetData.length === 0) {
    return <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center text-gray-500">No budgets set</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Budget Progress</h3>
      <div className="space-y-3">
        {budgetData.map(b => (
          <div key={b.id}>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{b.category.name}</span>
              <span>{formatIndianCurrency(b.spent)} / {formatIndianCurrency(b.budgetAmount)}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${
                  b.percentage > 90 ? 'bg-red-500' : b.percentage > 70 ? 'bg-yellow-400' : 'bg-green-500'
                }`}
                style={{ width: `${b.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BudgetProgress;