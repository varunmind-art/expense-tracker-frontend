import { useMemo, useState } from 'react';
import { formatIndianCurrency } from '../../utils/helpers';
import {
  BUTTON,
  INPUT,
  formatMonth,
  scheduleStatusClasses,
  scheduleStatusLabel,
} from '../../utils/loans';

const PAGE_SIZE = 24;

const Cell = ({ children, className = '' }) => (
  <td className={`px-3 py-2 whitespace-nowrap ${className}`}>{children}</td>
);

/**
 * The amortization schedule.
 *
 * Actual periods and forecast periods are deliberately different colours and are
 * labelled: a projection must never be mistaken for a recorded payment.
 */
const AmortizationTable = ({ rows = [], planned = null, title = 'Amortization schedule' }) => {
  const [page, setPage] = useState(0);
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);

  const visible = useMemo(() => {
    if (!onlyUnpaid) return rows;
    return rows.filter((row) => row.status !== 'PAID');
  }, [rows, onlyUnpaid]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = visible.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No schedule yet. Set an EMI, a start date and an end date on the loan to
          generate one.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 pb-3 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Green periods are recorded payments. Everything else is a forecast from
            the current balance and is not stored.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={onlyUnpaid}
            onChange={(event) => {
              setOnlyUnpaid(event.target.checked);
              setPage(0);
            }}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Hide paid periods
        </label>
      </div>

      {planned && (
        <div className="px-6 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Periods</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{planned.periods}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total interest</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {formatIndianCurrency(planned.totalInterest)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total principal</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {formatIndianCurrency(planned.totalPrincipal)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total payable</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {formatIndianCurrency(planned.totalPayments)}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
            <tr>
              <th className="px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Due</th>
              <th className="px-3 py-2 text-right font-medium">Opening</th>
              <th className="px-3 py-2 text-right font-medium">Interest</th>
              <th className="px-3 py-2 text-right font-medium">Principal</th>
              <th className="px-3 py-2 text-right font-medium">Extra</th>
              <th className="px-3 py-2 text-right font-medium">Instalment</th>
              <th className="px-3 py-2 text-right font-medium">Closing</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {slice.map((row) => (
              <tr key={row.period} className={scheduleStatusClasses(row.status)}>
                <Cell>{row.period}</Cell>
                <Cell>{formatMonth(row.date)}</Cell>
                <Cell className="text-right">{formatIndianCurrency(row.openingBalance)}</Cell>
                <Cell className="text-right">{formatIndianCurrency(row.interest)}</Cell>
                <Cell className="text-right">{formatIndianCurrency(row.principal)}</Cell>
                <Cell className="text-right">
                  {row.extraPrincipal > 0 ? formatIndianCurrency(row.extraPrincipal) : '—'}
                </Cell>
                <Cell className="text-right font-medium">{formatIndianCurrency(row.emi)}</Cell>
                <Cell className="text-right">{formatIndianCurrency(row.closingBalance)}</Cell>
                <Cell>
                  <span className="text-xs font-medium">
                    {scheduleStatusLabel(row.status)}
                    {row.actual?.count > 1 ? ` ×${row.actual.count}` : ''}
                  </span>
                  {row.actual && (
                    <span className="block text-xs opacity-80">
                      paid {formatIndianCurrency(row.actual.totalAmount)}
                    </span>
                  )}
                </Cell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {safePage + 1} of {pageCount} · {visible.length} periods
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              className={`${BUTTON.subtleNeutral} disabled:opacity-40`}
            >
              Previous
            </button>
            <input
              type="number"
              min="1"
              max={pageCount}
              value={safePage + 1}
              onChange={(event) => {
                const next = Number(event.target.value) - 1;
                if (Number.isFinite(next)) setPage(Math.min(pageCount - 1, Math.max(0, next)));
              }}
              className={`${INPUT} w-20 py-1`}
              aria-label="Page number"
            />
            <button
              type="button"
              onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
              disabled={safePage >= pageCount - 1}
              className={`${BUTTON.subtleNeutral} disabled:opacity-40`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmortizationTable;
