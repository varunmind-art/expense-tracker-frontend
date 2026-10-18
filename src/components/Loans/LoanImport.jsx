import { useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatIndianCurrency } from '../../utils/helpers';
import { BUTTON, CARD, LABEL, formatDate } from '../../utils/loans';

const STATUS_STYLE = {
  NEW: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200',
  DUPLICATE: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  INVALID: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200',
  CONFLICT: 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200',
};

const SAMPLE = `Date,Narration,Amount,Principal,Interest,Reference
20/05/2026,Disbursement tranche 1,186474,,,SBI-T1
01/06/2026,Interest charged,4798,,,SBI-I1
14/10/2026,Repayment received,191271.99,186473.99,4798,SBI-R1`;

/**
 * Historical import: CSV dry run first, then an explicit commit.
 *
 * The preview is the whole point. Nothing is written until you press Import, and
 * a file containing an unreadable row cannot be committed at all - a silently
 * skipped row is exactly how a historical import goes wrong.
 */
const LoanImport = ({ loanId, onImported }) => {
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [committing, setCommitting] = useState(false);

  const runPreview = async () => {
    if (!csv.trim()) {
      toast.error('Paste the statement rows first');
      return;
    }
    setBusy(true);
    setPreview(null);
    try {
      const res = await api.post(`/loans/${loanId}/import/preview`, { csv });
      setPreview(res.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Preview failed');
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!preview) return;
    if (preview.blocking) {
      toast.error('Fix the unreadable rows before importing');
      return;
    }
    if (
      !window.confirm(
        `Import ${preview.summary.new} new row(s)? ${preview.summary.duplicates} duplicate(s) will be skipped.`
      )
    ) {
      return;
    }
    setCommitting(true);
    try {
      const res = await api.post(`/loans/${loanId}/import/commit`, { csv, confirm: true });
      toast.success(
        `Imported ${res.data.imported.disbursements} disbursement(s), ` +
          `${res.data.imported.interestPostings} posting(s), ${res.data.imported.payments} repayment(s)`
      );
      setPreview(null);
      setCsv('');
      onImported?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Import failed');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={CARD}>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
          Import historical transactions
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Paste CSV exported from the statement. Dates are read <strong>day-first</strong>
          (DD/MM/YYYY). Add Principal and Interest columns only when the bank actually
          gave you the split — otherwise the repayment is stored with
          <code className="mx-1">allocationVerified = false</code> and no split is invented.
        </p>

        <div className="mb-3">
          <label className={LABEL} htmlFor="csv">Statement rows (CSV)</label>
          <textarea
            id="csv"
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            rows={8}
            spellCheck={false}
            placeholder={SAMPLE}
            className="w-full px-3 py-2 border rounded-lg font-mono text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Recognised columns: Date, Narration/Description, Amount/Debit, Reference,
            Principal, Interest, Extra Principal.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={runPreview} disabled={busy} className={BUTTON.primary}>
            {busy ? 'Checking...' : 'Preview import (dry run)'}
          </button>
          <button type="button" onClick={() => setCsv(SAMPLE)} className={BUTTON.secondary}>
            Paste sample
          </button>
        </div>
      </div>

      {preview && (
        <div className={CARD}>
          <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Dry run</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Nothing has been saved. Review every row, then import.
              </p>
            </div>
            {preview.blocking && (
              <span className="text-xs font-medium px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">
                Blocked: unreadable rows
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm mb-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Rows</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200">{preview.summary.total}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">New</p>
              <p className="font-semibold text-green-600 dark:text-green-400">{preview.summary.new}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Duplicates</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200">{preview.summary.duplicates}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Unreadable</p>
              <p className={`font-semibold ${preview.summary.invalid > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                {preview.summary.invalid}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Projected bank balance</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                {formatIndianCurrency(preview.reconciliation?.bankBalance)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Row</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 text-left font-medium">Reference</th>
                  <th className="px-3 py-2 text-left font-medium">Reconciliation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {preview.rows.map((row, index) => (
                  <tr key={`${row.index}-${index}`} className={STATUS_STYLE[row.status] || ''}>
                    <td className="px-3 py-2">{(row.index ?? index) + 1}</td>
                    <td className="px-3 py-2 font-medium">{row.status}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.date ? formatDate(row.date) : '—'}</td>
                    <td className="px-3 py-2">{row.kind || '—'}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {row.amount === undefined ? '—' : formatIndianCurrency(row.amount)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.reference || '—'}</td>
                    <td className="px-3 py-2 max-w-[22rem] whitespace-normal text-xs">{row.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={commit}
              disabled={committing || preview.blocking || preview.summary.new === 0}
              className={BUTTON.primary}
            >
              {committing ? 'Importing...' : `Import ${preview.summary.new} row(s)`}
            </button>
            <button type="button" onClick={() => setPreview(null)} className={BUTTON.secondary}>
              Discard
            </button>
            {preview.summary.new === 0 && !preview.blocking && (
              <span className="text-sm text-gray-500 dark:text-gray-400">Every row is already recorded.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanImport;
