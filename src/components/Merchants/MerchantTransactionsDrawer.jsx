import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { formatIndianCurrency } from '../../utils/helpers';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_LABELS = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Heatmap cell ────────────────────────────────────────────────
const HeatCell = ({ count, max }) => {
  if (count === 0) {
    return <div className="aspect-square rounded bg-gray-100 dark:bg-gray-700/50" />;
  }
  // Intensity: 1 → light, max → dark
  const intensity = max > 0 ? count / max : 0;
  let bg = 'bg-indigo-200 dark:bg-indigo-900/50';
  if (intensity >= 0.75) bg = 'bg-indigo-600 dark:bg-indigo-400';
  else if (intensity >= 0.5) bg = 'bg-indigo-500 dark:bg-indigo-500';
  else if (intensity >= 0.25) bg = 'bg-indigo-400 dark:bg-indigo-600';
  return (
    <div
      className={`aspect-square rounded ${bg} flex items-center justify-center text-[10px] font-medium text-white`}
      title={`${count} visit${count === 1 ? '' : 's'}`}
    >
      {count}
    </div>
  );
};

// ─── Frequency Tab ──────────────────────────────────────────────
const FrequencyTab = ({ merchantName }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!merchantName) return;
    setLoading(true);
    api.get('/merchants/frequency', { params: { name: merchantName } })
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [merchantName]);

  if (loading) return <div className="text-center py-10 text-gray-500 text-sm">Loading…</div>;
  if (!data || data.totalVisits === 0) {
    return <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">No frequency data yet.</div>;
  }

  const maxCell = Math.max(...data.matrix.flat(), 1);
  const maxDow = Math.max(...data.byDayOfWeek, 1);

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Visits</p>
          <p className="text-lg font-bold text-gray-800 dark:text-white">{data.totalVisits}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Spent</p>
          <p className="text-lg font-bold text-gray-800 dark:text-white">
            {formatIndianCurrency(data.totalAmount)}
          </p>
        </div>
      </div>

      {/* Busiest day callout */}
      {data.busiestDay && (
        <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3 text-sm">
          <span className="text-indigo-600 dark:text-indigo-300 font-medium">
            📅 You visit most often on <span className="font-bold">{data.busiestDay}</span>
          </span>
        </div>
      )}

      {/* Heatmap grid */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          When you shop here
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Rows = week of month · Columns = day of week
        </p>
        <div className="grid grid-cols-8 gap-1">
          <div /> {/* empty top-left corner */}
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-[10px] text-center font-medium text-gray-500 dark:text-gray-400">
              {d}
            </div>
          ))}
          {data.matrix.map((row, wkIdx) => (
            <React.Fragment key={wkIdx}>
              <div className="text-[10px] flex items-center text-gray-500 dark:text-gray-400">
                W{wkIdx + 1}
              </div>
              {row.map((count, dowIdx) => (
                <HeatCell key={dowIdx} count={count} max={maxCell} />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Day-of-week bar chart */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Visits by day of week
        </h4>
        <div className="space-y-1.5">
          {data.byDayOfWeek.map((count, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <span className="w-8 text-gray-500 dark:text-gray-400 shrink-0">{DAY_LABELS[idx]}</span>
              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${(count / maxDow) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right text-gray-700 dark:text-gray-300 font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hour-of-day chart (bonus) */}
      {data.byHour.some((c) => c > 0) && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Visits by hour
          </h4>
          <div className="flex items-end gap-0.5 h-16">
            {data.byHour.map((count, h) => (
              <div
                key={h}
                className="flex-1 bg-indigo-400 dark:bg-indigo-500 rounded-t"
                style={{ height: `${(count / Math.max(...data.byHour, 1)) * 100}%` }}
                title={`${h}:00 — ${count} visit${count === 1 ? '' : 's'}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Categories Tab ─────────────────────────────────────────────
const CategoriesTab = ({ merchantName }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!merchantName) return;
    setLoading(true);
    api.get('/merchants/stats')
      .then((res) => {
        const match = (res.data?.merchants || []).find((m) => m.name === merchantName);
        setData(match || null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [merchantName]);

  if (loading) return <div className="text-center py-10 text-gray-500 text-sm">Loading…</div>;
  if (!data || !data.categoryBreakdown || data.categoryBreakdown.length === 0) {
    return <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">No category data yet.</div>;
  }

  const maxAmount = Math.max(...data.categoryBreakdown.map((c) => c.amount), 1);

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3 text-sm">
        <span className="text-indigo-600 dark:text-indigo-300">
          🏪 This merchant is primarily used for <span className="font-bold">{data.primaryCategory?.name}</span>
        </span>
      </div>

      <div className="space-y-3">
        {data.categoryBreakdown.map((c) => (
          <div key={c.name}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">
                {c.icon} {c.name}
              </span>
              <span className="font-semibold text-gray-800 dark:text-white">
                {formatIndianCurrency(c.amount)}
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                style={{ width: `${(c.amount / maxAmount) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <span>{c.count} transaction{c.count === 1 ? '' : 's'}</span>
              <span>{c.pct.toFixed(1)}% of merchant spend</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Drawer with tabs ──────────────────────────────────────
const MerchantTransactionsDrawer = ({ merchantName, onClose }) => {
  const [activeTab, setActiveTab] = useState('transactions');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!merchantName) return;
    setLoading(true);
    api.get('/merchants/transactions', { params: { name: merchantName, limit: 20 } })
      .then((res) => setData(res.data))
      .catch(() => setData({ merchant: merchantName, aliases: [], transactions: [] }))
      .finally(() => setLoading(false));
  }, [merchantName]);

  // Reset tab when merchant changes
  useEffect(() => { setActiveTab('transactions'); }, [merchantName]);

  if (!merchantName) return null;

  const TABS = [
    { key: 'transactions', label: 'Transactions' },
    { key: 'categories', label: 'Categories' },
    { key: 'frequency', label: 'Frequency' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 h-full w-full max-w-md shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 z-10">
          <div className="p-4 flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white truncate">
                🏪 {merchantName}
              </h2>
              {data?.aliases?.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Also known as: {data.aliases.join(', ')}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none px-2"
            >
              ×
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex border-t dark:border-gray-700">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-2.5 text-xs font-medium transition border-b-2 ${
                  activeTab === t.key
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'transactions' && (
            loading ? (
              <div className="text-center py-10 text-gray-500 text-sm">Loading…</div>
            ) : !data?.transactions?.length ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
                No transactions found for this merchant.
              </div>
            ) : (
              <>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Showing last {data.transactions.length} transaction{data.transactions.length === 1 ? '' : 's'}
                </div>
                <div className="space-y-2">
                  {data.transactions.map((t) => {
                    const amount = parseFloat(t.amount || 0);
                    const isSav = t.type === 'SAVINGS';
                    return (
                      <div
                        key={t.id}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-700 dark:text-gray-300">
                              {t.category?.icon} {t.category?.name}
                            </span>
                            {isSav && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                Savings
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {new Date(t.date).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </div>
                          {t.note && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {t.note}
                            </div>
                          )}
                        </div>
                        <div
                          className={`text-sm font-semibold whitespace-nowrap ${
                            isSav ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-white'
                          }`}
                        >
                          {formatIndianCurrency(amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          )}

          {activeTab === 'categories' && <CategoriesTab merchantName={merchantName} />}
          {activeTab === 'frequency' && <FrequencyTab merchantName={merchantName} />}
        </div>
      </div>
    </div>
  );
};

export default MerchantTransactionsDrawer;