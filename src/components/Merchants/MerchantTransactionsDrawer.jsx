import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { formatIndianCurrency } from '../../utils/helpers';

const MerchantTransactionsDrawer = ({ merchantName, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!merchantName) return;
    setLoading(true);
    api.get('/merchants/transactions', { params: { name: merchantName, limit: 10 } })
      .then((res) => setData(res.data))
      .catch(() => setData({ merchant: merchantName, aliases: [], transactions: [] }))
      .finally(() => setLoading(false));
  }, [merchantName]);

  if (!merchantName) return null;

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
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex items-center justify-between">
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

        {/* Content */}
        <div className="p-4">
          {loading ? (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default MerchantTransactionsDrawer;