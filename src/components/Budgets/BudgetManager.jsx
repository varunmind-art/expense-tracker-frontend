import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatIndianCurrency } from '../../utils/helpers';

const BudgetManager = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newBudget, setNewBudget] = useState({ categoryId: '', amount: '', period: 'MONTHLY' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [budRes, catRes] = await Promise.all([
        api.get('/budgets'),
        api.get('/categories'),
      ]);
      setBudgets(budRes.data);
      setCategories(catRes.data);
    } catch (error) {
      toast.error('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newBudget.categoryId || !newBudget.amount) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      const res = await api.post('/budgets', {
        ...newBudget,
        amount: parseFloat(newBudget.amount),
      });
      setBudgets([res.data, ...budgets]);
      setNewBudget({ categoryId: '', amount: '', period: 'MONTHLY' });
      toast.success('Budget set!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      setBudgets(budgets.filter(b => b.id !== id));
      toast.success('Deleted');
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Budgets</h1>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Set New Budget</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-4">
          <select
            value={newBudget.categoryId}
            onChange={(e) => setNewBudget({ ...newBudget, categoryId: e.target.value })}
            className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-1 min-w-[150px]"
            required
          >
            <option value="">Select Category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <input
            type="number"
            placeholder="Amount (₹)"
            value={newBudget.amount}
            onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
            className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-1 min-w-[120px]"
            required
          />
          <select
            value={newBudget.period}
            onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value })}
            className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="MONTHLY">Monthly</option>
            <option value="WEEKLY">Weekly</option>
          </select>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
            Set Budget
          </button>
        </form>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 col-span-2 text-center py-10">No budgets set</p>
        ) : (
          budgets.map(b => {
            const amount = parseFloat(b.amount || 0);
            return (
              <div key={b.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {b.category?.icon} {b.category?.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatIndianCurrency(amount)} / {b.period.toLowerCase()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="text-red-600 dark:text-red-400 hover:underline text-sm"
                >
                  Delete
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BudgetManager;