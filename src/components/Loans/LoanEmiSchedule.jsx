import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatIndianCurrency } from '../../utils/helpers';
import { BUTTON, CARD, INPUT, LABEL, formatDate } from '../../utils/loans';

const STATUS_STYLE = {
  SCHEDULED: 'text-gray-800 dark:text-gray-200',
  CONFIRMED: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200',
  STOPPED: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 line-through',
  SKIPPED: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
};

/**
 * The deduction schedule.
 *
 * These rows are descriptions of deductions that are expected to happen. Nothing
 * here ever instructs a bank to move money. A row becomes CONFIRMED only when a
 * real payment is recorded against it, and a confirmed row can never be
 * confirmed again — that is the duplicate-posting guard.
 */
const LoanEmiSchedule = ({ loanId, loan, onChanged }) => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    firstDueDate: '',
    installments: '',
    amount: loan?.emiAmount ? String(loan.emiAmount) : '',
    kind: 'EMI',
  });

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/loans/${loanId}/emi-schedule`);
      setSchedule(res.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load the schedule');
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async (event) => {
    event.preventDefault();
    try {
      await api.post(`/loans/${loanId}/emi-schedule/generate`, {
        firstDueDate: form.firstDueDate || undefined,
        installments: Number(form.installments),
        amount: parseFloat(form.amount),
        kind: form.kind,
      });
      toast.success('Deduction schedule built');
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to build the schedule');
    }
  };

  const confirmRow = async (row) => {
    if (!window.confirm(`Confirm instalment #${row.sequence} of ${formatIndianCurrency(row.amount)} as actually paid?`)) return;
    try {
      await api.post(`/loans/${loanId}/emi-schedule/${row.id}/confirm`, { amount: row.amount });
      toast.success('Instalment confirmed and recorded as a payment');
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to confirm');
    }
  };

  const reprice = async (row) => {
    const next = window.prompt(`New deduction amount for instalment #${row.sequence}?`, String(row.amount));
    if (next === null) return;
    const amount = parseFloat(next);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      await api.patch(`/loans/${loanId}/emi-schedule/${row.id}`, { amount });
      toast.success('Future deduction re-priced');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to re-price');
    }
  };

  const stopAll = async () => {
    if (!window.confirm('Stop all future deductions? Recorded payments and confirmed instalments are preserved.')) return;
    try {
      const res = await api.post(`/loans/${loanId}/emi-schedule/stop`, {
        reason: 'Stopped by user',
      });
      toast.success(res.data.message);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to stop the schedule');
    }
  };

  if (loading) return <div className={CARD}>Loading schedule...</div>;

  const rows = schedule?.rows || [];
  const next = schedule?.nextDeduction;

  return (
    <div className="space-y-4">
      <div className={CARD}>
        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Deduction schedule</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Scheduled deductions are expectations, not bank instructions. Confirm one only when
              the money has actually left your account.
            </p>
          </div>
          {rows.length > 0 && (
            <button type="button" onClick={stopAll} className={BUTTON.danger}>
              Stop future deductions
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Rows</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{rows.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Still scheduled</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{formatIndianCurrency(schedule?.totalScheduled)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Next deduction</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {next ? `${formatDate(next.dueDate)} · ${formatIndianCurrency(next.amount)}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Confirmed</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {rows.filter((r) => r.status === 'CONFIRMED').length}
            </p>
          </div>
        </div>

        <form onSubmit={generate} className="flex flex-wrap items-end gap-3 mb-4 pt-4 border-t dark:border-gray-700">
          <div className="w-40">
            <label className={LABEL} htmlFor="s-first">First due date</label>
            <input id="s-first" type="date" value={form.firstDueDate}
              onChange={(e) => setForm({ ...form, firstDueDate: e.target.value })} className={INPUT} />
          </div>
          <div className="w-32">
            <label className={LABEL} htmlFor="s-count">Instalments</label>
            <input id="s-count" type="number" min="1" value={form.installments} required
              onChange={(e) => setForm({ ...form, installments: e.target.value })} className={INPUT} />
          </div>
          <div className="w-36">
            <label className={LABEL} htmlFor="s-amount">Amount (₹)</label>
            <input id="s-amount" type="number" step="0.01" min="0.01" value={form.amount} required
              onChange={(e) => setForm({ ...form, amount: e.target.value })} className={INPUT} />
          </div>
          <div className="w-36">
            <label className={LABEL} htmlFor="s-kind">Kind</label>
            <select id="s-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={INPUT}>
              <option value="EMI">EMI</option>
              <option value="PRE_EMI">Pre-EMI (interest only)</option>
            </select>
          </div>
          <button type="submit" className={BUTTON.primary}>Build schedule</button>
        </form>

        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No schedule yet. Build one to track expected deductions — nothing is ever sent to the bank.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Due</th>
                  <th className="px-3 py-2 text-left font-medium">Kind</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((row) => (
                  <tr key={row.id} className={STATUS_STYLE[row.status] || ''}>
                    <td className="px-3 py-2">{row.sequence}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.dueDate)}</td>
                    <td className="px-3 py-2">{row.kind}</td>
                    <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{formatIndianCurrency(row.amount)}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {row.status === 'SCHEDULED' && (
                        <>
                          <button type="button" onClick={() => confirmRow(row)} className={BUTTON.subtle}>Confirm paid</button>
                          <button type="button" onClick={() => reprice(row)} className={`${BUTTON.subtleNeutral} ml-2`}>Re-price</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanEmiSchedule;
