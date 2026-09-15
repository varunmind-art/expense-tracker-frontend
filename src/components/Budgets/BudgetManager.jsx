import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatIndianCurrency } from '../../utils/helpers';

const BudgetManager = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [newBudget, setNewBudget] = useState({ categoryId: '', amount: '', period: 'MONTHLY' });

  // Edit modal
  const [editingBudget, setEditingBudget] = useState(null);
  const [editData, setEditData] = useState({ amount: '', period: 'MONTHLY' });
  const [saving, setSaving] = useState(false);

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
      setBudgets(budgets.filter((b) => b.id !== id));
      toast.success('Deleted');
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  // ---- Edit flow ----
  const handleOpenEdit = (b) => {
    setEditingBudget(b);
    setEditData({
      amount: parseFloat(b.amount || 0).toString(),
      period: b.period || 'MONTHLY',
    });
  };

  const handleSaveEdit = async () => {
    if (!editData.amount || parseFloat(editData.amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(`/budgets/${editingBudget.id}`, {
        amount: parseFloat(editData.amount),
        period: editData.period,
      });
      setBudgets(budgets.map((b) => (b.id === editingBudget.id ? res.data : b)));
      toast.success('Budget updated');
      setEditingBudget(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Budgets</h1>

      {/* Set New Budget */}
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
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
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
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
          >
            Set Budget
          </button>
        </form>
      </div>

      {/* Budgets list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 col-span-2 text-center py-10">
            No budgets set
          </p>
        ) : (
          budgets.map((b) => {
            const amount = parseFloat(b.amount || 0);
            return (
              <div
                key={b.id}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {b.category?.icon} {b.category?.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatIndianCurrency(amount)} / {b.period.toLowerCase()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(b)}
                    className="px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="px-2 py-1 text-xs font-medium rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      {editingBudget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
              Edit Budget
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {editingBudget.category?.icon} {editingBudget.category?.name}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEdit();
              }}
            >
              <div className="mb-4">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editData.amount}
                  onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  autoFocus
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Period
                </label>
                <select
                  value={editData.period}
                  onChange={(e) => setEditData({ ...editData, period: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingBudget(null)}
                  className="px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetManager;