import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import AddPaymentModal from './AddPaymentModal';
import AmortizationTable from './AmortizationTable';
import LoanPayments from './LoanPayments';
import PayoffSimulator from './PayoffSimulator';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'payments', label: 'Payments' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'simulator', label: 'Prepayment simulator' },
];

const LoanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loan, setLoan] = useState(null);
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [schedule, setSchedule] = useState(null);
  const [scheduleError, setScheduleError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [detailRes, paymentsRes] = await Promise.all([
        api.get(`/loans/${id}`),
        api.get(`/loans/${id}/payments`),
      ]);

      setLoan(detailRes.data);
      setSummary(detailRes.data.summary);
      setPayments(detailRes.data.payments || []);
      setTotals(paymentsRes.data.totals);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Loan not found');
        navigate('/loans');
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to load loan');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  // The schedule is only fetched when its tab is opened: it is a full
  // amortization table and there is no reason to compute it up front.
  useEffect(() => {
    if (tab !== 'schedule' || schedule || scheduleError) return undefined;

    let cancelled = false;

    api
      .get(`/loans/${id}/schedule`)
      .then((res) => {
        if (!cancelled) setSchedule(res.data);
      })
      .catch((error) => {
        if (cancelled) return;
        // Without this the tab would show "Loading schedule..." forever, because
        // the loading flag is derived from the schedule being absent.
        setScheduleError(error.response?.data?.error || 'Failed to load the schedule.');
      });

    return () => {
      cancelled = true;
    };
  }, [tab, id, schedule, scheduleError]);

  const handleChanged = async () => {
    setSchedule(null);
    setScheduleError(null);
    await load();
  };

  const handleToggle = async () => {
    try {
      const res = await api.patch(`/loans/${id}/toggle`);
      setLoan((current) => ({ ...current, isActive: res.data.isActive }));
      setSummary(res.data.summary);
      toast.success(res.data.isActive ? 'Loan resumed' : 'Loan paused');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update loan');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${loan.name}" and its entire payment history?`)) return;
    try {
      await api.delete(`/loans/${id}`);
      toast.success('Loan deleted');
      navigate('/loans');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete loan');
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (!loan) {
    return (
      <div className={`${CARD} text-center py-10`}>
        <p className="text-gray-600 dark:text-gray-300">This loan is no longer available.</p>
        <Link to="/loans" className={`${BUTTON.primary} inline-block mt-4`}>
          Back to My Loans
        </Link>
      </div>
    );
  }

  const activeSummary = summary || loan.summary || {};
  // Derived, so there is no loading flag to keep in sync with the request.
  const scheduleLoading = tab === 'schedule' && !schedule && !scheduleError;

  return (
    <div>
      <div className="mb-4">
        <Link to="/loans" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← My Loans
        </Link>
      </div>

      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{loan.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {loan.lender || 'No lender'} · {loanTypeLabel(loan.loanType)}
            {loan.isActive ? '' : ' · Paused'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className={BUTTON.primary}
            disabled={activeSummary.isClosed}
          >
            Record payment
          </button>
          <Link to={`/loans/${loan.id}/edit`} className={BUTTON.secondary}>
            Edit
          </Link>
          <button type="button" onClick={handleToggle} className={BUTTON.secondary}>
            {loan.isActive ? 'Pause' : 'Resume'}
          </button>
          <button type="button" onClick={handleDelete} className={BUTTON.danger}>
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={CARD}>
          <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding principal</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">
            {formatIndianCurrency(activeSummary.outstandingPrincipal)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            of {formatIndianCurrency(loan.originalPrincipal)} borrowed
          </p>
        </div>
        <div className={CARD}>
          <p className="text-sm text-gray-500 dark:text-gray-400">EMI</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">
            {loan.emiAmount ? formatIndianCurrency(loan.emiAmount) : '—'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            at {formatPercent(loan.interestRate)} per year
          </p>
        </div>
        <div className={CARD}>
          <p className="text-sm text-gray-500 dark:text-gray-400">Remaining tenure</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">
            {activeSummary.isClosed ? 'Closed' : formatMonths(activeSummary.remainingMonths)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {loan.nextEmiDate ? `Next EMI ${formatDate(loan.nextEmiDate)}` : 'No EMI date set'}
          </p>
        </div>
        <div className={CARD}>
          <p className="text-sm text-gray-500 dark:text-gray-400">Estimated payoff</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">
            {formatDate(activeSummary.estimatedPayoffDate)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatIndianCurrency(activeSummary.totalInterestPaid)} interest paid so far
          </p>
        </div>
      </div>

      <div className={`${CARD} mb-6`}>
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
          <span className="font-medium">
            {formatPercent(activeSummary.progressPercent)} repaid
          </span>
          <span>
            {formatIndianCurrency(activeSummary.principalRepaid)} of{' '}
            {formatIndianCurrency(loan.originalPrincipal)}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all"
            style={{ width: progressWidth(activeSummary.progressPercent) }}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Payments recorded</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {activeSummary.paymentCount ?? payments.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total paid</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {formatIndianCurrency(activeSummary.totalAmountPaid)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Start date</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {formatDate(loan.startDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Stated end date</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {formatDate(loan.endDate)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 border-b dark:border-gray-700">
        {TABS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTab(option.value)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition ${
              tab === option.value
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className={CARD}>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Recent payments
          </h2>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No payments recorded yet. Use “Record payment” to log your first EMI.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {[...payments]
                .reverse()
                .slice(0, 5)
                .map((payment) => (
                  <li key={payment.id} className="py-3 flex justify-between gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {formatDate(payment.date)}
                        {payment.extraPrincipal > 0 ? ' · extra principal' : ''}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {payment.note || 'No note'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {formatIndianCurrency(payment.totalAmount)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        principal {formatIndianCurrency(payment.principalAmount)} · interest{' '}
                        {formatIndianCurrency(payment.interestAmount)}
                      </p>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'payments' && (
        <LoanPayments
          loanId={loan.id}
          payments={payments}
          totals={totals}
          outstanding={activeSummary.outstandingPrincipal}
          onChanged={handleChanged}
        />
      )}

      {tab === 'schedule' && (
        <div className="space-y-4">
          {scheduleLoading && <div className={CARD}>Loading schedule...</div>}

          {scheduleError && (
            <div className={CARD}>
              <p className="text-sm text-red-600 dark:text-red-400">{scheduleError}</p>
              <button
                type="button"
                onClick={() => setScheduleError(null)}
                className={`${BUTTON.secondary} mt-3`}
              >
                Try again
              </button>
            </div>
          )}

          {!scheduleLoading && !scheduleError && schedule && (
            <>
              <AmortizationTable
                rows={schedule.schedule.rows}
                planned={schedule.schedule.planned}
                title="Full amortization schedule"
              />
              <div className={CARD}>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  What is left from today
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Rebuilt from the current balance, so every prepayment you have
                  already made is reflected here.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Balance now</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {formatIndianCurrency(schedule.projection.fromBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Periods left</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {schedule.projection.periods}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Future interest</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {formatIndianCurrency(schedule.projection.totalInterest)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Payoff date</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {formatDate(schedule.projection.estimatedPayoffDate)}
                    </p>
                  </div>
                </div>
                {!schedule.projection.amortizes && schedule.projection.periods > 0 && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-4">
                    At the current EMI this loan does not fully amortize — the
                    instalment does not cover the monthly interest.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'simulator' && (
        <PayoffSimulator
          loan={loan}
          summary={activeSummary}
          onRecord={() => setShowPaymentModal(true)}
        />
      )}

      {showPaymentModal && (
        <AddPaymentModal
          loan={loan}
          summary={activeSummary}
          onClose={() => setShowPaymentModal(false)}
          onRecorded={handleChanged}
        />
      )}
    </div>
  );
};

export default LoanDetail;
