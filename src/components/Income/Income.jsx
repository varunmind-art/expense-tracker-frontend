import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatIndianCurrency } from '../../utils/helpers';

const SOURCE_OPTIONS = [
  { value: 'SALARY', label: '💼 Salary' },
  { value: 'FREELANCE', label: '🧑‍💻 Freelance' },
  { value: 'DIVIDEND', label: '📈 Dividend' },
  { value: 'RENT', label: '🏠 Rental' },
  { value: 'BONUS', label: '🎁 Bonus' },
  { value: 'OTHER', label: '📌 Other' },
];

const Income = () => {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    source: 'SALARY',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [monthFilter, setMonthFilter] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  useEffect(() => {
    fetchIncomes();
  }, [monthFilter]);

  const fetchIncomes = async () => {
    try {
      const res = await api.get('/incomes', { params: { month: monthFilter } });
      setIncomes(res.data);
    } catch (error) {
      toast.error('Failed to load incomes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/incomes', {
        ...form,
        amount: parseFloat(form.amount),
      });
      setIncomes([res.data, ...incomes]);
      setForm({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        source: 'SALARY',
        note: '',
      });
      toast.success('Income added!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this income entry?')) return;
    try {
      await api.delete(`/incomes/${id}`);
      setIncomes(incomes.filter((i) => i.id !== id));
      toast.success('Deleted');
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const total = incomes.reduce((s, i) => s + parseFloat(i.amount || 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Income</h1>
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      {/* Add form */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Add Income</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Source</label>
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Note (optional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Sept salary"
                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                type="submit"
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                {submitting ? '...' : 'Add'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 flex items-center justify-between">
        <span className="text-gray-600 dark:text-gray-400">
          Total income for {monthFilter}
        </span>
        <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
          {formatIndianCurrency(total)}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : incomes.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-10">
          No income logged for this month.
        </p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Source</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Note</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {incomes.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {new Date(i.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {SOURCE_OPTIONS.find((o) => o.value === i.source)?.label || i.source}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{i.note || '-'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-right text-indigo-600 dark:text-indigo-400">
                    {formatIndianCurrency(i.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(i.id)}
                      className="text-red-600 dark:text-red-400 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Income;