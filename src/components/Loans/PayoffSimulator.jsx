import { useEffect, useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatIndianCurrency } from '../../utils/helpers';
import { BUTTON, CARD, INPUT, LABEL, formatDate, formatMonths, formatPercent } from '../../utils/loans';

const Stat = ({ label, value, tone = '' }) => (
  <div>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <p className={`text-lg font-bold ${tone || 'text-gray-800 dark:text-white'}`}>{value}</p>
  </div>
);

/**
 * Prepayment and interest-rate simulator.
 *
 * Everything shown here is computed by the backend and nothing is persisted:
 * the simulator never mutates the loan.
 */
const PayoffSimulator = ({ loan, summary, onRecord }) => {
  const [extraAmount, setExtraAmount] = useState('');
  const [monthlyExtra, setMonthlyExtra] = useState('');
  const [keepEmi, setKeepEmi] = useState(true);
  const [newRate, setNewRate] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const outstanding = summary?.outstandingPrincipal || 0;
  const sliderMax = Math.max(10000, Math.round((outstanding * 0.5) / 1000) * 1000);

  const extra = parseFloat(extraAmount);
  const monthly = parseFloat(monthlyExtra);
  const rate = parseFloat(newRate);

  const hasExtra = Number.isFinite(extra) && extra > 0;
  const hasMonthly = Number.isFinite(monthly) && monthly > 0;
  const hasRate = Number.isFinite(rate) && rate >= 0;
  const canSimulate = hasExtra || hasMonthly || hasRate;

  // Nothing is reset synchronously when the inputs are cleared: the results are
  // simply not rendered unless the inputs can produce them.
  useEffect(() => {
    if (!canSimulate) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const body = {
          extraAmount: hasExtra ? extra : 0,
          monthlyExtra: hasMonthly ? monthly : 0,
          keepEmi,
        };
        if (hasRate) body.newRate = rate;

        const res = await api.post(`/loans/${loan.id}/simulate`, body);
        if (!cancelled) setResult(res.data);
      } catch (error) {
        if (!cancelled) {
          setResult(null);
          toast.error(error.response?.data?.error || 'Simulation failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canSimulate, hasExtra, hasMonthly, hasRate, extra, monthly, rate, keepEmi, loan.id]);

  const prepayment = result?.prepayment;
  const rateChange = result?.rateChange;

  return (
    <div className="space-y-4">
      <div className={CARD}>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
          Prepayment simulator
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Nothing here changes your loan. It projects what an extra payment would
          save from today onwards.
        </p>

        <div className="mb-4">
          <label className={LABEL} htmlFor="sim-extra">
            One-time prepayment (₹)
          </label>
          <input
            id="sim-extra"
            type="number"
            step="1000"
            min="0"
            value={extraAmount}
            onChange={(event) => setExtraAmount(event.target.value)}
            className={INPUT}
            placeholder="e.g. 200000"
          />
          <input
            type="range"
            min="0"
            max={sliderMax}
            step="1000"
            value={Number.isFinite(parseFloat(extraAmount)) ? parseFloat(extraAmount) : 0}
            onChange={(event) => setExtraAmount(event.target.value)}
            className="w-full mt-2 accent-blue-600"
            aria-label="Prepayment amount slider"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Outstanding is {formatIndianCurrency(outstanding)} · drag up to{' '}
            {formatIndianCurrency(sliderMax)}
          </p>
        </div>

        <div className="mb-4">
          <label className={LABEL} htmlFor="sim-monthly">
            Extra every month (₹)
          </label>
          <input
            id="sim-monthly"
            type="number"
            step="500"
            min="0"
            value={monthlyExtra}
            onChange={(event) => setMonthlyExtra(event.target.value)}
            className={INPUT}
            placeholder="e.g. 5000"
          />
        </div>

        <div className="mb-4">
          <span className={LABEL}>If I prepay, I want to</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setKeepEmi(true)}
              className={`px-3 py-2 rounded-lg text-sm transition ${
                keepEmi ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              Reduce my tenure (keep the EMI)
            </button>
            <button
              type="button"
              onClick={() => setKeepEmi(false)}
              className={`px-3 py-2 rounded-lg text-sm transition ${
                !keepEmi ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              Reduce my EMI
            </button>
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="sim-rate">
            What if my interest rate changed to (% per year)
          </label>
          <input
            id="sim-rate"
            type="number"
            step="0.05"
            min="0"
            max="100"
            value={newRate}
            onChange={(event) => setNewRate(event.target.value)}
            className={INPUT}
            placeholder={`current ${formatPercent(summary?.interestRate)}`}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            A rate change only re-prices the periods you have not paid yet.
          </p>
        </div>
      </div>

      {loading && (
        <div className={CARD}>
          <p className="text-sm text-gray-500 dark:text-gray-400">Calculating...</p>
        </div>
      )}

      {!loading && prepayment && (hasExtra || hasMonthly) && (
        <div className={CARD}>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Prepayment result
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <Stat
              label="Interest saved"
              value={formatIndianCurrency(prepayment.interestSaved)}
              tone="text-green-600 dark:text-green-400"
            />
            <Stat label="Tenure reduced" value={formatMonths(prepayment.monthsSaved)} />
            <Stat label="New payoff date" value={formatDate(prepayment.newPayoffDate)} />
            <Stat label="EMI after" value={formatIndianCurrency(prepayment.emiAfter)} />
            <Stat label="Current payoff" value={formatDate(prepayment.baseline.payoffDate)} />
            <Stat
              label="Interest before / after"
              value={`${formatIndianCurrency(prepayment.baseline.totalInterest)} → ${formatIndianCurrency(prepayment.scenario.totalInterest)}`}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Scenario</th>
                  <th className="px-3 py-2 text-right font-medium">Months left</th>
                  <th className="px-3 py-2 text-right font-medium">Total interest</th>
                  <th className="px-3 py-2 text-right font-medium">Payoff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                <tr>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">Do nothing</td>
                  <td className="px-3 py-2 text-right">{prepayment.baseline.months}</td>
                  <td className="px-3 py-2 text-right">
                    {formatIndianCurrency(prepayment.baseline.totalInterest)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatDate(prepayment.baseline.payoffDate)}
                  </td>
                </tr>
                <tr className="bg-green-50 dark:bg-green-900/20">
                  <td className="px-3 py-2 font-medium text-green-900 dark:text-green-200">
                    With prepayment
                  </td>
                  <td className="px-3 py-2 text-right">{prepayment.scenario.months}</td>
                  <td className="px-3 py-2 text-right">
                    {formatIndianCurrency(prepayment.scenario.totalInterest)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatDate(prepayment.scenario.payoffDate)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {onRecord && parseFloat(extraAmount) > 0 && (
            <button type="button" onClick={onRecord} className={`${BUTTON.primary} mt-4`}>
              Record this prepayment
            </button>
          )}
        </div>
      )}

      {!loading && rateChange && hasRate && (
        <div className={CARD}>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
            If the rate became {formatPercent(rateChange.newRatePercent)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Changes from period {rateChange.changedFrom}. The{' '}
            {rateChange.unaffectedPeriods} period(s) before that are already
            recorded history and are untouched.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Stat
              label="Extra interest"
              value={formatIndianCurrency(rateChange.totalInterestDelta)}
              tone={
                rateChange.totalInterestDelta > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }
            />
            <Stat
              label="Tenure change"
              value={
                rateChange.monthsDelta === 0
                  ? 'No change'
                  : `${rateChange.monthsDelta > 0 ? '+' : ''}${rateChange.monthsDelta} months`
              }
            />
            <Stat label="New payoff date" value={formatDate(rateChange.newPayoffDate)} />
            <Stat
              label="Balance at change"
              value={formatIndianCurrency(rateChange.balanceAtChange)}
            />
            <Stat
              label={`EMI to keep the same term`}
              value={formatIndianCurrency(rateChange.emiForSameTenure)}
            />
            <Stat label="Total interest (lifetime)" value={formatIndianCurrency(rateChange.newTotalInterest)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PayoffSimulator;
