import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import ExpenseChart from './ExpenseChart';
import TrendChart from './TrendChart';
import TopCategories from './TopCategories';
import BudgetProgress from './BudgetProgress';
import ExpenseForm from '../Expenses/ExpenseForm';
import { formatIndianCurrency } from '../../utils/helpers';

const Dashboard = () => {
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('this-month');

  // ✅ State for the Add Expense modal
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        startDate.setHours(0, 0, 0, 0);
      } else if (filter === 'this-month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (filter === 'last-month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      }
      const endDate = new Date();

      const [expRes, budRes, catRes] = await Promise.all([
        api.get('/expenses', {
          params: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        }),
        api.get('/budgets'),
        api.get('/categories'),
      ]);
      setExpenses(expRes.data);
      setBudgets(budRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle adding a new expense from the dashboard
  const handleAddExpense = async (data) => {
    setSubmitting(true);
    try {
      await api.post('/expenses', data);
      toast.success('Expense added!');
      setShowForm(false);
      // Refresh dashboard data so charts & totals update instantly
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-10">Loading dashboard...</div>;

  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none"
          >
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
          </select>
          {/* ✅ Add Expense shortcut */}
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            + Add Expense
          </button>
        </div>
      </div>

      {/* Summary cards */}
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
            {new Set(expenses.map((e) => e.categoryId)).size}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseChart expenses={expenses} />
        <TrendChart expenses={expenses} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopCategories expenses={expenses} />
        <BudgetProgress expenses={expenses} budgets={budgets} />
      </div>

      {/* ✅ Expense Form Modal */}
      <ExpenseForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleAddExpense}
        initialData={null}
        categories={categories}
        isLoading={submitting}
      />
    </div>
  );
};

export default Dashboard;