import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import ExpenseForm from './ExpenseForm';
import { formatIndianCurrency } from '../../utils/helpers';

const ExpenseList = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // ⭐ NEW: filter tab
  const [typeTab, setTypeTab] = useState('ALL'); // ALL | EXPENSE | SAVINGS

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [expRes, catRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/categories'),
      ]);
      setExpenses(expRes.data);
      setCategories(catRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Deleted');
      setExpenses(expenses.filter((e) => e.id !== id));
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editingExpense) {
        const res = await api.put(`/expenses/${editingExpense.id}`, data);
        setExpenses(expenses.map((e) => (e.id === res.data.id ? res.data : e)));
        toast.success('Updated');
      } else {
        const res = await api.post('/expenses', data);
        setExpenses([res.data, ...expenses]);
        toast.success(data.type === 'SAVINGS' ? 'Savings added!' : 'Expense added!');
      }
      setShowForm(false);
      setEditingExpense(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'expenses_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV downloaded');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const filtered = expenses.filter((e) => {
    const matchType = typeTab === 'ALL' ? true : (e.type || 'EXPENSE') === typeTab;
    const matchSearch =
      e.note?.toLowerCase().includes(search.toLowerCase()) ||
      e.category?.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory ? e.categoryId === filterCategory : true;
    return matchType && matchSearch && matchCategory;
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA, valB;
    if (sortBy === 'date') {
      valA = new Date(a.date);
      valB = new Date(b.date);
    } else if (sortBy === 'amount') {
      valA = parseFloat(a.amount || 0);
      valB = parseFloat(b.amount || 0);
    } else {
      valA = a.category?.name || '';
      valB = b.category?.name || '';
    }
    if (sortOrder === 'asc') return valA > valB ? 1 : -1;
    return valA < valB ? 1 : -1;
  });

  if (loading) return <div className="text-center py-10">Loading...</div>;

  const totalShown = sorted.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const savingsShown = sorted
    .filter((e) => (e.type || 'EXPENSE') === 'SAVINGS')
    .reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Expenses & Savings</h1>
        <button
          onClick={() => {
            setEditingExpense(null);
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          + Add
        </button>
      </div>

      {/* ⭐ NEW: Type filter tabs */}
      <div className="flex rounded-lg overflow-hidden border dark:border-gray-600 mb-4 w-fit">
        {[
          { key: 'ALL', label: 'All', color: 'bg-gray-700' },
          { key: 'EXPENSE', label: '💰 Expenses', color: 'bg-blue-600' },
          { key: 'SAVINGS', label: '🏦 Savings', color: 'bg-green-600' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTypeTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition ${
              typeTab === tab.key
                ? `${tab.color} text-white`
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <input
          type="text"
          placeholder="Search notes or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-1 min-w-[200px]"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="date">Sort by Date</option>
          <option value="amount">Sort by Amount</option>
          <option value="category">Sort by Category</option>
        </select>
        <button
          onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
          className="px-3 py-2 border rounded-lg dark:border-gray-600 dark:text-white"
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
        >
          Export CSV
        </button>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow text-sm">
          <span className="text-gray-500 dark:text-gray-400">Entries shown: </span>
          <span className="font-semibold text-gray-800 dark:text-white">{sorted.length}</span>
        </div>
        <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow text-sm">
          <span className="text-gray-500 dark:text-gray-400">Total: </span>
          <span className="font-semibold text-gray-800 dark:text-white">
            {formatIndianCurrency(totalShown)}
          </span>
        </div>
        <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow text-sm">
          <span className="text-gray-500 dark:text-gray-400">Savings: </span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatIndianCurrency(savingsShown)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Note</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No entries found
                  </td>
                </tr>
              ) : (
                sorted.map((e) => {
                  const amount = parseFloat(e.amount || 0);
                  const isSav = (e.type || 'EXPENSE') === 'SAVINGS';
                  return (
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {new Date(e.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {isSav ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            🏦 Savings
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            💰 Expense
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {e.category?.icon} {e.category?.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {e.note || '-'}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-semibold text-right ${
                          isSav ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-white'
                        }`}
                      >
                        {formatIndianCurrency(amount)}
                      </td>
                      <td className="px-4 py-3 text-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingExpense(e);
                            setShowForm(true);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-red-600 dark:text-red-400 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ExpenseForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingExpense(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingExpense}
        categories={categories}
        isLoading={submitting}
      />
    </div>
  );
};

export default ExpenseList;