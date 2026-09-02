import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TrendChart = ({ expenses }) => {
  const days = {};
  expenses.forEach(exp => {
    const date = new Date(exp.date).toISOString().split('T')[0];
    // ✅ Parse amount to float
    days[date] = (days[date] || 0) + parseFloat(exp.amount || 0);
  });

  const data = Object.keys(days).sort().map(date => ({
    date,
    amount: days[date],
  }));

  if (data.length === 0) {
    return <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center text-gray-500">No trend data</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Spending Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;