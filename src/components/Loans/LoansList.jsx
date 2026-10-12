import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatIndianCurrency } from '../../utils/helpers';
import {
  BUTTON,
  CARD,
  formatDate,
  formatMonths,
  formatPercent,
  loanTypeLabel,
  progressWidth,
} from '../../utils/loans';

const LoansList = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchLoans = async () => {
    try {
      const res = await api.get('/loans');
      setLoans(res.data);
    } catch {
      toast.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleToggle = async (loan) => {
    try {
      const res = await api.patch(`/loans/${loan.id}/toggle`);
      setLoans((current) =>
        current.map((item) =>
          item.id === loan.id ? { ...item, isActive: res.data.isActive } : item
        )
      );
      toast.success(res.data.isActive ? 'Loan resumed' : 'Loan paused');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update loan');
    }
  };

  const handleDelete = async (loan) => {
    if (
      !window.confirm(
        `Delete "${loan.name}" and its entire payment history? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/loans/${loan.id}`);
      setLoans((current) => current.filter((item) => item.id !== loan.id));
      toast.success('Loan deleted');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete loan');
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  const totals = loans.reduce(
    (acc, loan) => {
      const summary = loan.summary || {};
      acc.outstanding += Number(summary.outstandingPrincipal || 0);
      acc.original += Number(loan.originalPrincipal || 0);
      acc.repaid += Number(summary.principalRepaid || 0);
      if (loan.isActive && !summary.isClosed) {
        acc.active += 1;
        acc.monthlyEmi += Number(loan.emiAmount || 0);
      }
      return acc;
    },
    { outstanding: 0, original: 0, repaid: 0, active: 0, monthlyEmi: 0 }
  );

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">My Loans</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track every loan, its balance and what a prepayment would save you.
          </p>
        </div>
        <Link to="/loans/new" className={BUTTON.primary}>
          + Add Loan
        </Link>
      </div>

      {loans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={CARD}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total outstanding</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {formatIndianCurrency(totals.outstanding)}
            </p>
          </div>
          <div className={CARD}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Principal repaid</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatIndianCurrency(totals.repaid)}
            </p>
          </div>
          <div className={CARD}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Monthly EMIs</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {formatIndianCurrency(totals.monthlyEmi)}
            </p>
          </div>
          <div className={CARD}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Active loans</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{totals.active}</p>
          </div>
        </div>
      )}

      {loans.length === 0 ? (
        <div className={`${CARD} text-center py-12`}>
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            No loans yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-6">
            Add your first loan to see its EMI, amortization schedule and what a
            prepayment would save.
          </p>
          <Link to="/loans/new" className={`${BUTTON.primary} inline-block`}>
            Add your first loan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loans.map((loan) => {
            const summary = loan.summary || {};
            return (
              <div
                key={loan.id}
                className={`${CARD} flex flex-col ${
                  loan.isActive ? '' : 'opacity-75'
                }`}
              >
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div className="min-w-0">
                    <Link
                      to={`/loans/${loan.id}`}
                      className="text-lg font-semibold text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block"
                    >
                      {loan.name}
                    </Link>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {loan.lender || 'No lender'} · {loanTypeLabel(loan.loanType)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        summary.isClosed
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
                          : loan.isActive
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {summary.isClosed ? 'Closed' : loan.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding</p>
                    <p className="text-xl font-bold text-gray-800 dark:text-white">
                      {formatIndianCurrency(summary.outstandingPrincipal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">EMI</p>
                    <p className="text-xl font-bold text-gray-800 dark:text-white">
                      {loan.emiAmount ? formatIndianCurrency(loan.emiAmount) : '—'}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>{formatPercent(summary.progressPercent)} repaid</span>
                    <span>
                      {formatIndianCurrency(summary.principalRepaid)} of{' '}
                      {formatIndianCurrency(loan.originalPrincipal)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all"
                      style={{ width: progressWidth(summary.progressPercent) }}
                    />
                  </div>
                </div>

                <dl className="grid grid-cols-3 gap-2 text-xs mb-4">
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Rate</dt>
                    <dd className="text-gray-800 dark:text-gray-200 font-medium">
                      {formatPercent(loan.interestRate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Remaining</dt>
                    <dd className="text-gray-800 dark:text-gray-200 font-medium">
                      {formatMonths(summary.remainingMonths)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Next EMI</dt>
                    <dd className="text-gray-800 dark:text-gray-200 font-medium">
                      {loan.nextEmiDate ? formatDate(loan.nextEmiDate) : '—'}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center gap-2 mt-auto">
                  <button
                    type="button"
                    onClick={() => navigate(`/loans/${loan.id}`)}
                    className={BUTTON.subtle}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/loans/${loan.id}/edit`)}
                    className={BUTTON.subtleNeutral}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(loan)}
                    className={BUTTON.subtleNeutral}
                  >
                    {loan.isActive ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(loan)}
                    className={`${BUTTON.subtleDanger} ml-auto`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LoansList;
