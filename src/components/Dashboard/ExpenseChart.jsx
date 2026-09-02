import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#E67E22', '#2ECC71', '#95A5A6'];

const ExpenseChart = ({ expenses }) => {
  const categoryMap = {};
  expenses.forEach(exp => {
    const catName = exp.category?.name || 'Uncategorized';
    // ✅ Parse amount to float to avoid string concatenation
    categoryMap[catName] = (categoryMap[catName] || 0) + parseFloat(exp.amount || 0);
  });

  const data = Object.keys(categoryMap).map((name, index) => ({
    name,
    value: categoryMap[name],
    color: COLORS[index % COLORS.length],
  }));

  if (data.length === 0) {
    return <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center text-gray-500">No data</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Expenses by Category</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ExpenseChart;