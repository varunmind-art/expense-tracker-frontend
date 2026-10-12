import { useEffect, useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatIndianCurrency } from '../../utils/helpers';
import { BUTTON, INPUT, LABEL, formatDate, formatMonths } from '../../utils/loans';

const todayInput = () => {
  const date = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const MODES = [
  { value: 'EMI', label: 'Regular EMI' },
  { value: 'PREPAYMENT', label: 'Prepayment' },
  { value: 'ADJUSTMENT', label: 'Balance adjustment' },
];

/**
 * Record an EMI, a prepayment or a labelled balance adjustment.
 *
 * The prepayment impact is fetched from the server rather than calculated here,
 * so the number the user sees before saving is the same number the API reports
 * afterwards.
 */
const AddPaymentModal = ({ loan, summary, onClose, onRecorded }) => {
  const [mode, setMode] = useState('EMI');
  const [amount, setAmount] = useState(
    loan?.emiAmount ? String(loan.emiAmount) : ''
  );
  const [date, setDate] = useState(todayInput());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const previewAmount = parseFloat(amount);
  const canPreview =
    mode === 'PREPAYMENT' && Number.isFinite(previewAmount) && previewAmount > 0;

  // Live prepayment impact: interest saved, tenure reduced, revised payoff date.
  // The preview is only shown when it is meaningful, so nothing has to be reset
  // synchronously when the amount is cleared.
  useEffect(() => {
    if (!canPreview) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        const res = await api.post(`/loans/${loan.id}/simulate`, {
          extraAmount: previewAmount,
        });
        if (!cancelled) setPreview(res.data.prepayment);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canPreview, previewAmount, loan.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter an amount greater than zero');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'ADJUSTMENT') {
        await api.post(`/loans/${loan.id}/adjust`, {
          amount: value,
          date: date || undefined,
          note: note || 'Manual balance adjustment',
        });
      } else {
        await api.post(`/loans/${loan.id}/payments`, {
          amount: value,
          kind: mode,
          date: date || undefined,
          note: note || undefined,
        });
      }
      toast.success(mode === 'PREPAYMENT' ? 'Prepayment recorded' : 'Payment recorded');
      onRecorded?.();
      onClose?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const outstanding = summary?.outstandingPrincipal;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
          Record payment
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {loan.name} · outstanding {formatIndianCurrency(outstanding)}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              className={`px-3 py-1 rounded-lg text-sm transition ${
                mode === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className={LABEL} htmlFor="modal-amount">
              Amount (₹)
            </label>
            <input
              id="modal-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={INPUT}
              autoFocus
              required
            />
            {mode === 'EMI' && loan.emiAmount ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The scheduled EMI is {formatIndianCurrency(loan.emiAmount)}. The
                interest and principal split is calculated by the server.
              </p>
            ) : null}
            {mode === 'PREPAYMENT' ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                A prepayment goes entirely to principal and leaves your EMI
                unchanged — it shortens the loan instead.
              </p>
            ) : null}
            {mode === 'ADJUSTMENT' ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Use this to correct the balance. It is recorded as a labelled
                principal adjustment, never as interest.
              </p>
            ) : null}
          </div>

          <div className="mb-4">
            <label className={LABEL} htmlFor="modal-date">
              Date
            </label>
            <input
              id="modal-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={INPUT}
            />
          </div>

          <div className="mb-4">
            <label className={LABEL} htmlFor="modal-note">
              Note
            </label>
            <input
              id="modal-note"
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={INPUT}
              placeholder={mode === 'PREPAYMENT' ? 'e.g. Annual bonus' : 'e.g. February EMI'}
            />
          </div>

          {canPreview && (
            <div className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Impact of this prepayment
              </p>
              {previewing ? (
                <p className="text-sm text-blue-800 dark:text-blue-300">Calculating...</p>
              ) : preview ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-blue-800 dark:text-blue-300">Interest saved</p>
                    <p className="font-bold text-blue-900 dark:text-blue-100">
                      {formatIndianCurrency(preview.interestSaved)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-800 dark:text-blue-300">Tenure reduced</p>
                    <p className="font-bold text-blue-900 dark:text-blue-100">
                      {formatMonths(preview.monthsSaved)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-800 dark:text-blue-300">New payoff</p>
                    <p className="font-bold text-blue-900 dark:text-blue-100">
                      {formatDate(preview.newPayoffDate)}
                    </p>
                  </div>
                  <div className="sm:col-span-3">
                    <p className="text-xs text-blue-800 dark:text-blue-300">EMI after prepayment</p>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      {formatIndianCurrency(preview.emiAfter)} (unchanged)
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Enter an amount to see the interest and time you would save.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className={BUTTON.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={BUTTON.primary}>
              {saving ? 'Recording...' : 'Record payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPaymentModal;
