import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { formatIndianCurrency } from '../../utils/helpers';
import MerchantTransactionsDrawer from '../Merchants/MerchantTransactionsDrawer';

const TrendIcon = ({ trend }) => {
  if (trend === 'up') return <span className="text-red-500 text-xs" title="Increased vs previous month">▲</span>;
  if (trend === 'down') return <span className="text-green-500 text-xs" title="Decreased vs previous month">▼</span>;
  if (trend === 'new') return <span className="text-blue-500 text-xs" title="New this month">★</span>;
  return <span className="text-gray-400 text-xs" title="Same as previous month">–</span>;
};

const TopMerchants = ({ month = null }) => {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMerchant, setSelectedMerchant] = useState(null); // ⭐

  useEffect(() => {
    setLoading(true);
    const params = month ? { month } : {};
    api.get('/merchants/stats', { params })
      .then((res) => setMerchants((res.data?.merchants || []).slice(0, 5)))
      .catch(() => setMerchants([]))
      .finally(() => setLoading(false));
  }, [month]);

  const monthLabel = month
    ? new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : 'This Month';

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center text-gray-500">
        Loading merchants...
      </div>
    );
  }

  if (merchants.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Top Merchants ({monthLabel})
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
          No merchant data for {monthLabel}. Add a merchant to your next expense to see insights here.
        </p>
      </div>
    );
  }

  const topAmount = Math.max(...merchants.map((m) => m.monthSpent), 1);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Top Merchants ({monthLabel})
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">Click to expand</span>
        </div>
        <ul className="space-y-3">
          {merchants.map((m, idx) => {
            const pct = (m.monthSpent / topAmount) * 100;
            return (
              <li
                key={m.name}
                onClick={() => setSelectedMerchant(m.name)}
                className="cursor-pointer rounded-lg p-2 -m-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                title={`View recent ${m.name} transactions`}
              >
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-gray-500 dark:text-gray-400 w-4 shrink-0">{idx + 1}.</span>
                    <span className="text-gray-800 dark:text-white font-medium truncate">
                      {m.name}
                    </span>
                    <TrendIcon trend={m.trend} />
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-white shrink-0">
                    {formatIndianCurrency(m.monthSpent)}
                  </span>
                </div>
                <div
                  className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 ml-6"
                  style={{ width: 'calc(100% - 1.5rem)' }}
                >
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-6 mt-0.5">
                  {m.monthCount} visit{m.monthCount === 1 ? '' : 's'} · Avg {formatIndianCurrency(m.monthAvg)}
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ⭐ Drawer */}
      <MerchantTransactionsDrawer
        merchantName={selectedMerchant}
        onClose={() => setSelectedMerchant(null)}
      />
    </>
  );
};

export default TopMerchants;