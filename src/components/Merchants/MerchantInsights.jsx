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
                        <>
                          {m.primaryCategory.icon} {m.primaryCategory.name}
                        </>
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