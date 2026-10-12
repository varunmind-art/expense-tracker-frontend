import { useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatIndianCurrency } from '../../utils/helpers';
import {
  BUTTON,
  INPUT,
  LABEL,
  formatDate,
  paymentKindLabel,
} from '../../utils/loans';

const toInputDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * Recorded repayments, separate from the forecast schedule.
 *
 * Editing or deleting a row is safe: the API recomputes the whole running
 * balance from the ledger, so the outstanding principal always matches history.
 */
const LoanPayments = ({ loanId, payments = [], totals = null, outstanding = null, onChanged }) => {
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({ amount: '', date: '', note: '' });
  const [saving, setSaving] = useState(false);

  const openEdit = (payment) => {
    setEditing(payment);
    setEditData({
      amount: String(payment.totalAmount ?? ''),
      date: toInputDate(payment.date),
      note: payment.note || '',
    });
  };

  const handleSave = async () => {
    const amount = parseFloat(editData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/loans/${loanId}/payments/${editing.id}`, {
        amount,
        date: editData.date || undefined,
        note: editData.note,
      });
      toast.success('Payment updated');
      setEditing(null);
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (payment) => {
    if (!window.confirm(`Delete the ${formatDate(payment.date)} payment? The balance will be recalculated.`)) {
      return;
    }
    try {
      await api.delete(`/loans/${loanId}/payments/${payment.id}`);
      toast.success('Payment deleted');
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 pb-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Payment history</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Recorded payments only — these are the source of truth for the balance.
        </p>
      </div>

      {totals && (
        <div className="px-6 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total paid</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {formatIndianCurrency(totals.totalPaid)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Principal</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {formatIndianCurrency(totals.totalPrincipal)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Extra principal</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {formatIndianCurrency(totals.totalExtra)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Interest</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {formatIndianCurrency(totals.totalInterest)}
            </p>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <p className="px-6 pb-6 text-gray-500 dark:text-gray-400 text-sm">
          No payments recorded yet. Use “Record payment” to log your first EMI.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-right font-medium">Principal</th>
                <th className="px-3 py-2 text-right font-medium">Interest</th>
                <th className="px-3 py-2 text-right font-medium">Extra</th>
                <th className="px-3 py-2 text-right font-medium">Balance after</th>
                <th className="px-3 py-2 text-left font-medium">Note</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {payments.map((payment) => (
                <tr key={payment.id} className="text-gray-700 dark:text-gray-200">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(payment.date)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {payment.extraPrincipal > 0 && payment.principalAmount === 0
                      ? payment.note === 'Manual balance adjustment'
                        ? 'Adjustment'
                        : 'Prepayment'
                      : paymentKindLabel('EMI')}
                  </td>
                  <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                    {formatIndianCurrency(payment.totalAmount)}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {formatIndianCurrency(payment.principalAmount)}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {formatIndianCurrency(payment.interestAmount)}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {payment.extraPrincipal > 0
                      ? formatIndianCurrency(payment.extraPrincipal)
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {payment.outstandingAfter === null
                      ? '—'
                      : formatIndianCurrency(payment.outstandingAfter)}
                  </td>
                  <td className="px-3 py-2 max-w-[16rem] truncate" title={payment.note || ''}>
                    {payment.note || '—'}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button type="button" onClick={() => openEdit(payment)} className={BUTTON.subtle}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(payment)}
                      className={`${BUTTON.subtleDanger} ml-2`}
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

      {outstanding !== null && outstanding !== undefined && (
        <p className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 border-t dark:border-gray-700">
          Outstanding principal:{' '}
          <span className="font-semibold text-gray-800 dark:text-white">
            {formatIndianCurrency(outstanding)}
          </span>
        </p>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
              Edit payment
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              The interest and principal split is recalculated, and every later
              balance is resynced.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSave();
              }}
            >
              <div className="mb-4">
                <label className={LABEL} htmlFor="pay-amount">
                  Amount paid (₹)
                </label>
                <input
                  id="pay-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editData.amount}
                  onChange={(event) => setEditData({ ...editData, amount: event.target.value })}
                  className={INPUT}
                  autoFocus
                  required
                />
              </div>

              <div className="mb-4">
                <label className={LABEL} htmlFor="pay-date">
                  Payment date
                </label>
                <input
                  id="pay-date"
                  type="date"
                  value={editData.date}
                  onChange={(event) => setEditData({ ...editData, date: event.target.value })}
                  className={INPUT}
                />
              </div>

              <div className="mb-4">
                <label className={LABEL} htmlFor="pay-note">
                  Note
                </label>
                <input
                  id="pay-note"
                  type="text"
                  value={editData.note}
                  onChange={(event) => setEditData({ ...editData, note: event.target.value })}
                  className={INPUT}
                  placeholder="e.g. February EMI"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setEditing(null)} className={BUTTON.secondary}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className={BUTTON.primary}>
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

export default LoanPayments;
