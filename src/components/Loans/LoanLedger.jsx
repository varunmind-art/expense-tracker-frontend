import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatIndianCurrency } from '../../utils/helpers';
import { BUTTON, CARD, INPUT, LABEL, formatDate } from '../../utils/loans';

const Stat = ({ label, value, hint = null, tone = '' }) => (
  <div>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <p className={`text-lg font-bold ${tone || 'text-gray-800 dark:text-white'}`}>{value}</p>
    {hint ? <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{hint}</p> : null}
  </div>
);

/**
 * Disbursements, bank-posted interest/charges, and the account reconciliation.
 *
 * The reconciliation is deliberately shown separately from outstanding principal:
 * a construction loan's bank balance includes interest the borrower has not yet
 * paid, so the two numbers legitimately differ.
 */
const LoanLedger = ({ loanId }) => {
  const [ledger, setLedger] = useState(null);
  const [reconciliation, setReconciliation] = useState(null);
  const [loading, setLoading] = useState(true);

  const [disbursement, setDisbursement] = useState({ amount: '', date: '', reference: '', note: '' });
  const [posting, setPosting] = useState({ amount: '', date: '', kind: 'INTEREST', reference: '', note: '' });
  const [stated, setStated] = useState({ asOf: '', balance: '' });

  const load = useCallback(async () => {
    try {
      const [disb, post, recon] = await Promise.all([
        api.get(`/loans/${loanId}/disbursements`),
        api.get(`/loans/${loanId}/interest-postings`),
        api.get(`/loans/${loanId}/reconciliation`),
      ]);
      setLedger({ disbursements: disb.data, postings: post.data });
      setReconciliation(recon.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load the loan ledger');
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    load();
  }, [load]);

  const compareStated = async () => {
    const params = new URLSearchParams();
    if (stated.asOf) params.set('asOf', stated.asOf);
    if (stated.balance !== '') params.set('statedBalance', stated.balance);
    try {
      const res = await api.get(`/loans/${loanId}/reconciliation?${params.toString()}`);
      setReconciliation(res.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Reconciliation failed');
    }
  };

  const addDisbursement = async (event) => {
    event.preventDefault();
    try {
      await api.post(`/loans/${loanId}/disbursements`, {
        amount: parseFloat(disbursement.amount),
        date: disbursement.date || undefined,
        reference: disbursement.reference || undefined,
        note: disbursement.note || undefined,
      });
      toast.success('Disbursement recorded');
      setDisbursement({ amount: '', date: '', reference: '', note: '' });
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to record the disbursement');
    }
  };

  const addPosting = async (event) => {
    event.preventDefault();
    try {
      await api.post(`/loans/${loanId}/interest-postings`, {
        amount: parseFloat(posting.amount),
        date: posting.date || undefined,
        kind: posting.kind,
        reference: posting.reference || undefined,
        note: posting.note || undefined,
      });
      toast.success('Posting recorded');
      setPosting({ amount: '', date: '', kind: 'INTEREST', reference: '', note: '' });
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to record the posting');
    }
  };

  const remove = async (kind, id) => {
    if (!window.confirm('Remove this entry? The reconciliation will be recalculated.')) return;
    try {
      await api.delete(`/loans/${loanId}/${kind}/${id}`);
      toast.success('Removed');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to remove');
    }
  };

  if (loading) return <div className={CARD}>Loading ledger...</div>;

  const disbursements = ledger?.disbursements;
  const postings = ledger?.postings;
  const recon = reconciliation;

  return (
    <div className="space-y-4">
      {/* ---------- reconciliation ---------- */}
      <div className={CARD}>
        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Bank account reconciliation
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              bank balance = disbursed + interest posted + charges − repayments
            </p>
          </div>
          {recon?.reconciled === true && (
            <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200">
              Reconciled
            </span>
          )}
          {recon?.reconciled === false && (
            <span className="text-xs font-medium px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">
              Off by {formatIndianCurrency(recon.variance)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat
            label="Sanctioned limit"
            value={recon?.sanctionedLimit === null ? '—' : formatIndianCurrency(recon?.sanctionedLimit)}
            hint={recon?.undrawnLimit === null ? null : `${formatIndianCurrency(recon.undrawnLimit)} undrawn`}
          />
          <Stat label="Disbursed" value={formatIndianCurrency(recon?.disbursedPrincipal)} />
          <Stat
            label="Interest + charges posted"
            value={formatIndianCurrency(recon?.totalInterestAndCharges)}
            hint={`${formatIndianCurrency(recon?.totalInterestPosted)} interest · ${formatIndianCurrency(recon?.totalChargesPosted)} charges`}
          />
          <Stat label="Repaid" value={formatIndianCurrency(recon?.totalRepaid)} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t dark:border-gray-700">
          <Stat
            label="Bank balance"
            value={formatIndianCurrency(recon?.bankBalance)}
            hint="what the loan account shows"
            tone="text-blue-700 dark:text-blue-300"
          />
          <Stat
            label="Outstanding principal"
            value={formatIndianCurrency(recon?.outstandingPrincipal)}
            hint="principal only, no interest"
            tone="text-gray-800 dark:text-white"
          />
          <Stat
            label="Stated bank balance"
            value={recon?.statedBankBalance === null ? 'not entered' : formatIndianCurrency(recon?.statedBankBalance)}
            hint={recon?.variance === null ? 'enter one to compare' : `variance ${formatIndianCurrency(recon.variance)}`}
          />
          <Stat
            label="Ledger vs principal"
            value={formatIndianCurrency(recon?.disbursementVariance)}
            hint="disbursement ledger − principal"
            tone={recon?.disbursementVariance === 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}
          />
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">{recon?.explanation}</p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label className={LABEL} htmlFor="recon-asof">As of</label>
            <input id="recon-asof" type="date" value={stated.asOf}
              onChange={(e) => setStated({ ...stated, asOf: e.target.value })} className={INPUT} />
          </div>
          <div className="w-40">
            <label className={LABEL} htmlFor="recon-stated">Statement balance</label>
            <input id="recon-stated" type="number" step="0.01" value={stated.balance}
              onChange={(e) => setStated({ ...stated, balance: e.target.value })} className={INPUT} placeholder="e.g. 4478991" />
          </div>
          <button type="button" onClick={compareStated} className={BUTTON.secondary}>Compare</button>
        </div>
      </div>

      {/* ---------- disbursements ---------- */}
      <div className={CARD}>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Disbursements</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          The sanctioned limit is what was approved; this ledger is what the builder actually drew.
        </p>

        <form onSubmit={addDisbursement} className="flex flex-wrap items-end gap-3 mb-4">
          <div className="w-36">
            <label className={LABEL} htmlFor="d-amount">Amount (₹)</label>
            <input id="d-amount" type="number" step="0.01" min="0.01" value={disbursement.amount} required
              onChange={(e) => setDisbursement({ ...disbursement, amount: e.target.value })} className={INPUT} />
          </div>
          <div className="w-40">
            <label className={LABEL} htmlFor="d-date">Date</label>
            <input id="d-date" type="date" value={disbursement.date}
              onChange={(e) => setDisbursement({ ...disbursement, date: e.target.value })} className={INPUT} />
          </div>
          <div className="w-40">
            <label className={LABEL} htmlFor="d-ref">Bank reference</label>
            <input id="d-ref" type="text" value={disbursement.reference} placeholder="UTR / tranche"
              onChange={(e) => setDisbursement({ ...disbursement, reference: e.target.value })} className={INPUT} />
          </div>
          <button type="submit" className={BUTTON.primary}>Add</button>
        </form>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          Total disbursed:{' '}
          <span className="font-semibold text-gray-800 dark:text-white">
            {formatIndianCurrency(disbursements?.totalDisbursed)}
          </span>
          {disbursements?.undrawnLimit !== null && disbursements?.undrawnLimit !== undefined ? (
            <span className="text-gray-500 dark:text-gray-400">
              {' '}· {formatIndianCurrency(disbursements.undrawnLimit)} of the limit undrawn
            </span>
          ) : null}
        </p>

        {disbursements?.disbursements?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 text-left font-medium">Reference</th>
                  <th className="px-3 py-2 text-left font-medium">Note</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {disbursements.disbursements.map((row) => (
                  <tr key={row.id} className="text-gray-700 dark:text-gray-200">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{formatIndianCurrency(row.amount)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.reference || '—'}</td>
                    <td className="px-3 py-2 max-w-[14rem] truncate">{row.note || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => remove('disbursements', row.id)} className={BUTTON.subtleDanger}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No disbursements recorded yet.</p>
        )}
      </div>

      {/* ---------- interest and charges ---------- */}
      <div className={CARD}>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Interest &amp; charges</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Posted by the bank, independently of repayments. Keeping these separate is what lets the
          statement balance reconcile without inventing a split on the repayment side.
        </p>

        <form onSubmit={addPosting} className="flex flex-wrap items-end gap-3 mb-4">
          <div className="w-36">
            <label className={LABEL} htmlFor="p-amount">Amount (₹)</label>
            <input id="p-amount" type="number" step="0.01" min="0.01" value={posting.amount} required
              onChange={(e) => setPosting({ ...posting, amount: e.target.value })} className={INPUT} />
          </div>
          <div className="w-40">
            <label className={LABEL} htmlFor="p-date">Date</label>
            <input id="p-date" type="date" value={posting.date}
              onChange={(e) => setPosting({ ...posting, date: e.target.value })} className={INPUT} />
          </div>
          <div className="w-36">
            <label className={LABEL} htmlFor="p-kind">Kind</label>
            <select id="p-kind" value={posting.kind} onChange={(e) => setPosting({ ...posting, kind: e.target.value })} className={INPUT}>
              <option value="INTEREST">Interest</option>
              <option value="CHARGE">Charge</option>
            </select>
          </div>
          <div className="w-40">
            <label className={LABEL} htmlFor="p-ref">Bank reference</label>
            <input id="p-ref" type="text" value={posting.reference}
              onChange={(e) => setPosting({ ...posting, reference: e.target.value })} className={INPUT} />
          </div>
          <button type="submit" className={BUTTON.primary}>Add</button>
        </form>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          Interest posted:{' '}
          <span className="font-semibold text-gray-800 dark:text-white">{formatIndianCurrency(postings?.totalInterest)}</span>
          {' · '}charges:{' '}
          <span className="font-semibold text-gray-800 dark:text-white">{formatIndianCurrency(postings?.totalCharges)}</span>
        </p>

        {postings?.postings?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Kind</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 text-left font-medium">Reference</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {postings.postings.map((row) => (
                  <tr key={row.id} className="text-gray-700 dark:text-gray-200">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-3 py-2">
                      {row.kind === 'CHARGE_SETTLEMENT' ? 'Charge settlement' : row.kind}
                    </td>
                    <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{formatIndianCurrency(row.amount)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.reference || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => remove('interest-postings', row.id)} className={BUTTON.subtleDanger}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No interest or charges recorded yet.</p>
        )}
      </div>
    </div>
  );
};

export default LoanLedger;
