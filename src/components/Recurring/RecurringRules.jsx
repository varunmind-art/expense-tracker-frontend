import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatIndianCurrency } from '../../utils/helpers';

const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

const RecurringRules = () => {
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    description: '',
    amount: '',
    frequency: 'MONTHLY',
    dayOfMonth: new Date().getDate(),
    dayOfWeek: 1,
    categoryId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [editingRule, setEditingRule] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [rulesRes, catRes] = await Promise.all([
        api.get('/recurring-rules'),
        api.get('/categories'),
      ]);
      setRules(rulesRes.data);
      setCategories(catRes.data);
      if (catRes.data.length > 0 && !form.categoryId) {
        setForm((f) => ({ ...f, categoryId: catRes.data[0].id }));
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.amount || !form.categoryId) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        description: form.description,
        amount: parseFloat(form.amount),
        frequency: form.frequency,
        categoryId: form.categoryId,
        dayOfMonth: form.frequency === 'MONTHLY' ? parseInt(form.dayOfMonth) : null,
        dayOfWeek: form.frequency === 'WEEKLY' ? parseInt(form.dayOfWeek) : null,
      };
      const res = await api.post('/recurring-rules', payload);
      setRules([...rules, res.data]);
      setForm({
        description: '',
        amount: '',
        frequency: 'MONTHLY',
        dayOfMonth: new Date().getDate(),
        dayOfWeek: 1,
        categoryId: categories[0]?.id || '',
      });
      toast.success('Recurring rule created!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/recurring-rules/${id}/toggle`);
      setRules(rules.map((r) => (r.id === id ? res.data : r)));
      toast.success(res.data.isActive ? 'Activated' : 'Paused');
    } catch (error) {
      toast.error('Failed to toggle');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recurring rule?')) return;
    try {
      await api.delete(`/recurring-rules/${id}`);
      setRules(rules.filter((r) => r.id !== id));
      toast.success('Deleted');
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleOpenEdit = (rule) => {
    setEditingRule(rule);
    setEditData({
      description: rule.description,
      amount: parseFloat(rule.amount || 0).toString(),
      frequency: rule.frequency,
      dayOfMonth: rule.dayOfMonth || new Date().getDate(),
      dayOfWeek: rule.dayOfWeek !== null && rule.dayOfWeek !== undefined ? rule.dayOfWeek : 1,
    });
  };

  const handleSaveEdit = async () => {
    if (!editData.description?.trim() || !editData.amount) {
      toast.error('Please fill all fields');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        description: editData.description,
        amount: parseFloat(editData.amount),
        frequency: editData.frequency,
        dayOfMonth: editData.frequency === 'MONTHLY' ? parseInt(editData.dayOfMonth) : null,
        dayOfWeek: editData.frequency === 'WEEKLY' ? parseInt(editData.dayOfWeek) : null,
      };
      const res = await api.put(`/recurring-rules/${editingRule.id}`, payload);
      setRules(rules.map((r) => (r.id === editingRule.id ? res.data : r)));
      toast.success('Updated');
      setEditingRule(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const getFrequencyLabel = (rule) => {
    if (rule.frequency === 'MONTHLY' && rule.dayOfMonth) return `Monthly on day ${rule.dayOfMonth}`;
    if (rule.frequency === 'WEEKLY' && rule.dayOfWeek !== null && rule.dayOfWeek !== undefined)
      return `Weekly on ${WEEKDAYS.find((d) => d.value === rule.dayOfWeek)?.label || 'day'}`;
    return FREQUENCIES.find((f) => f.value === rule.frequency)?.label || rule.frequency;
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Recurring Rules</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Automate SIPs, rent, subscriptions and any recurring entry. Category type determines whether it books as <span className="text-blue-600 dark:text-blue-400 font-medium">Expense</span> or <span className="text-green-600 dark:text-green-400 font-medium">Savings</span>.
        </p>
      </div>

      {/* Create form */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Add Recurring Rule</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Description</label>
              <input
                type="text"
                placeholder="e.g., Monthly SIP – Axis Bluechip"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>
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
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <optgroup label="💰 Expense Categories">
                  {categories
                    .filter((c) => (c.type || 'EXPENSE') === 'EXPENSE')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="🏦 Savings Categories">
                  {categories
                    .filter((c) => c.type === 'SAVINGS')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            {form.frequency === 'MONTHLY' && (
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Day of Month</label>
                <select
                  value={form.dayOfMonth}
                  onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {DAYS_OF_MONTH.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {form.frequency === 'WEEKLY' && (
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Day of Week</label>
                <select
                  value={form.dayOfWeek}
                  onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>

      {/* Rules list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 col-span-2 text-center py-10">
            No recurring rules yet. Add one above.
          </p>
        ) : (
          rules.map((r) => {
            const isSavings = r.category?.type === 'SAVINGS';
            const amount = parseFloat(r.amount || 0);
            return (
              <div
                key={r.id}
                className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 ${
                  r.isActive ? (isSavings ? 'border-green-500' : 'border-blue-500') : 'border-gray-300 dark:border-gray-600'
                } ${!r.isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-white">{r.description}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {r.category?.icon} {r.category?.name}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      isSavings
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    }`}
                  >
                    {isSavings ? '🏦 Savings' : '💰 Expense'}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-bold text-gray-800 dark:text-white">
                    {formatIndianCurrency(amount)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {getFrequencyLabel(r)}
                  </span>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Next run: <span className="font-medium">{formatDate(r.nextExecution)}</span>
                  {!r.isActive && <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">· Paused</span>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleToggle(r.id)}
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      r.isActive
                        ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800'
                        : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                    } transition`}
                  >
                    {r.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleOpenEdit(r)}
                    className="px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
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

      {/* Edit modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Edit Recurring Rule</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEdit();
              }}
            >
              <div className="mb-4">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editData.amount}
                  onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Frequency</label>
                <select
                  value={editData.frequency}
                  onChange={(e) => setEditData({ ...editData, frequency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              {editData.frequency === 'MONTHLY' && (
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Day of Month</label>
                  <select
                    value={editData.dayOfMonth}
                    onChange={(e) => setEditData({ ...editData, dayOfMonth: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {DAYS_OF_MONTH.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {editData.frequency === 'WEEKLY' && (
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Day of Week</label>
                  <select
                    value={editData.dayOfWeek}
                    onChange={(e) => setEditData({ ...editData, dayOfWeek: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
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

export default RecurringRules;