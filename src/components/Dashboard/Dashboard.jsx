import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import ExpenseChart from './ExpenseChart';
import TrendChart from './TrendChart';
import TopCategories from './TopCategories';
import BudgetProgress from './BudgetProgress';
import { formatIndianCurrency } from '../../utils/helpers';

const Dashboard = () => {
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('this-month');

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      const now = new Date();
      let startDate = new Date();
      if (filter === 'this-week') {
        const day = now.getDay();
        startDate.setDate(now.getDate() - day);
        startDate.setHours(0,0,0,0);
      } else if (filter === 'this-month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (filter === 'last-month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      }
      const endDate = new Date();
      
      const [expRes, budRes] = await Promise.all([
        api.get('/expenses', { params: { startDate: startDate.toISOString(), endDate: endDate.toISOString() } }),
        api.get('/budgets'),
      ]);
      setExpenses(expRes.data);
      setBudgets(budRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-10">Loading dashboard...</div>;

  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none"
        >
          <option value="this-week">This Week</option>
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatIndianCurrency(totalSpent)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{expenses.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Categories Used</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">
            {new Set(expenses.map(e => e.categoryId)).size}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseChart expenses={expenses} />
        <TrendChart expenses={expenses} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopCategories expenses={expenses} />
        <BudgetProgress expenses={expenses} budgets={budgets} />
      </div>
    </div>
  );
};

export default Dashboard;