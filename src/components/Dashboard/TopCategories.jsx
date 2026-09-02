import React from 'react';
import { formatIndianCurrency } from '../../utils/helpers';

const TopCategories = ({ expenses }) => {
  const catMap = {};
  expenses.forEach(exp => {
    const name = exp.category?.name || 'Uncategorized';
    catMap[name] = (catMap[name] || 0) + parseFloat(exp.amount || 0);
  });

  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (sorted.length === 0) {
    return <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center text-gray-500">No data</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Top Spending Categories</h3>
      <ul className="space-y-2">
        {sorted.map(([name, amount], idx) => (
          <li key={name} className="flex justify-between items-center border-b dark:border-gray-700 pb-1">
            <span className="text-gray-700 dark:text-gray-300">{idx+1}. {name}</span>
            <span className="font-semibold text-gray-800 dark:text-white">{formatIndianCurrency(amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TopCategories;