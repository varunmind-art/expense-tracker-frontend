import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatIndianCurrency } from '../../utils/helpers';

const TrendBadge = ({ trend }) => {
  if (trend === 'up') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">▲ Up</span>;
  if (trend === 'down') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">▼ Down</span>;
  if (trend === 'new') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">★ New</span>;
  return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">— Flat</span>;
};

// ⭐ NEW: Manage Regular Merchants panel
const ManageMerchantsPanel = () => {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [importing, setImporting] = useState(false);

  const fetchMerchants = async () => {
    try {
      const res = await api.get('/merchant-list');
      setMerchants(res.data || []);
    } catch (err) {
      toast.error('Failed to load merchants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMerchants(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post('/merchant-list', { name: newName.trim() });
      setMerchants([res.data, ...merchants]);
      setNewName('');
      toast.success('Merchant added');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (m) => {
    try {
      const res = await api.put(`/merchant-list/${m.id}`, { isActive: !m.isActive });
      setMerchants(merchants.map((x) => (x.id === m.id ? res.data : x)));
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const handleSaveEdit = async (id) => {
    if (!editName.trim()) return;
    try {
      const res = await api.put(`/merchant-list/${id}`, { name: editName.trim() });
      setMerchants(merchants.map((x) => (x.id === id ? res.data : x)));
      setEditingId(null);
      toast.success('Renamed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`Remove "${m.name}" from the list? Existing expenses will keep the merchant name.`)) return;
    try {
      await api.delete(`/merchant-list/${m.id}`);
      setMerchants(merchants.filter((x) => x.id !== m.id));
      toast.success('Removed');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleImportExisting = async () => {
    if (!window.confirm('Import all merchant names already used in your expenses?')) return;
    setImporting(true);
    try {
      const res = await api.post('/merchant-list/import-existing');
      toast.success(`Imported ${res.data.added} new merchant${res.data.added === 1 ? '' : 's'}`);
      await fetchMerchants();
    } catch (err) {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Manage Regular Merchants
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            These will appear as a dropdown when you add or edit an expense.
          </p>
        </div>
        <button
          onClick={handleImportExisting}
          disabled={importing}
          className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
        >
          {importing ? 'Importing…' : '⬇ Import from existing expenses'}
        </button>
      </div>

      {/* Add new */}
      <form onSubmit={handleCreate} className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Add a new merchant…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
        />
        <button
          type="submit"
          disabled={submitting || !newName.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm disabled:opacity-50"
        >
          {submitting ? '…' : '+ Add'}
        </button>
      </form>

      {/* List */}
      {loading ? (
        <div className="text-center py-4 text-gray-500 text-sm">Loading…</div>
      ) : merchants.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No merchants yet. Add one above or import from existing expenses.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {merchants.map((m) => (
            <div
              key={m.id}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${
                m.isActive
                  ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200'
                  : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 line-through'
              }`}
            >
              {editingId === m.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(m.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="bg-transparent border-b border-blue-500 outline-none text-sm w-32"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(m.id)}
                    className="text-green-600 hover:text-green-700 text-xs font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-gray-400 hover:text-gray-600 text-xs"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <span>🏪 {m.name}</span>
                  <button
                    onClick={() => { setEditingId(m.id); setEditName(m.name); }}
                    className="text-blue-500 hover:text-blue-700 text-xs"
                    title="Rename"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleToggleActive(m)}
                    className="text-amber-500 hover:text-amber-700 text-xs"
                    title={m.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {m.isActive ? '◐' : '○'}
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    className="text-red-500 hover:text-red-700 text-xs"
                    title="Remove"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MerchantInsights = () => {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('monthSpent');

  useEffect(() => {
    fetchStats();
  }, [monthFilter]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/merchants/stats', { params: { month: monthFilter } });
      setMerchants(res.data?.merchants || []);
    } catch (error) {
      toast.error('Failed to load merchant insights');
    } finally {
      setLoading(false);
    }
  };

  const filtered = merchants
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'monthSpent') return b.monthSpent - a.monthSpent;
      if (sortBy === 'allTimeSpent') return b.allTimeSpent - a.allTimeSpent;
      if (sortBy === 'count') return b.monthCount - a.monthCount;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  const totalMonth = filtered.reduce((s, m) => s + m.monthSpent, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Merchant Insights</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            See where your money actually goes — by shop, brand, or website.
          </p>
        </div>
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      {/* ⭐ NEW: Manage Merchants Panel */}
      <ManageMerchantsPanel />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Merchants Active</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{filtered.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">
            {formatIndianCurrency(totalMonth)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg Per Merchant</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">
            {formatIndianCurrency(filtered.length > 0 ? totalMonth / filtered.length : 0)}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <input
          type="text"
          placeholder="Search merchant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-1 min-w-[200px]"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="monthSpent">Sort by This Month</option>
          <option value="allTimeSpent">Sort by All Time</option>
          <option value="count">Sort by Frequency</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            No merchant data for this month.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Add a merchant name to your expenses to see insights here.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">#</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Merchant</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Primary Category</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">This Month</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Txns</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Avg</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">All Time</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Trend</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((m, idx) => (
                  <tr key={m.name} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-gray-400">🏪</span>
                        {m.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {m.primaryCategory ? (
                        <>{m.primaryCategory.icon} {m.primaryCategory.name}</>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right text-gray-800 dark:text-white">
                      {formatIndianCurrency(m.monthSpent)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">
                      {m.monthCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                      {formatIndianCurrency(m.monthAvg)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">
                      {formatIndianCurrency(m.allTimeSpent)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <TrendBadge trend={m.trend} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        to={`/expenses?merchant=${encodeURIComponent(m.name)}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantInsights;