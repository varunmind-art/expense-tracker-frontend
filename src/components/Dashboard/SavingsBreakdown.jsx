import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatIndianCurrency } from '../../utils/helpers';

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];

const SavingsBreakdown = ({ summary }) => {
  const data = (summary?.savingsByCategory || []).map((item, idx) => ({
    name: item.name,
    value: item.amount,
    color: COLORS[idx % COLORS.length],
  }));

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex flex-col">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Savings Breakdown
        </h3>
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 py-8">
          No savings logged this month
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Savings Breakdown</h3>
        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
          {formatIndianCurrency(total)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatIndianCurrency(value)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SavingsBreakdown;