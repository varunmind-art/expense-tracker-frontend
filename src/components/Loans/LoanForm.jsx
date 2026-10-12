import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatIndianCurrency } from '../../utils/helpers';
import { BUTTON, CARD, INPUT, LABEL, LOAN_TYPES } from '../../utils/loans';

/** "2026-01-01" for a date input, from anything the API returns. */
const toInputDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const emptyForm = {
  name: '',
  lender: '',
  loanType: 'HOME_LOAN',
  originalPrincipal: '',
  currentPrincipal: '',
  interestRate: '',
  emiAmount: '',
  startDate: '',
  endDate: '',
  emiDay: '',
  paymentAccountId: '',
};

const LoanForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const accountRes = await api.get('/accounts');
        if (cancelled) return;
        setAccounts(accountRes.data);
      } catch {
        // A missing account list must not block creating a loan.
        if (!cancelled) setAccounts([]);
      }

      if (!isEdit) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const res = await api.get(`/loans/${id}`);
        if (cancelled) return;
        const loan = res.data;
        setForm({
          name: loan.name || '',
          lender: loan.lender || '',
          loanType: loan.loanType || 'HOME_LOAN',
          originalPrincipal: loan.originalPrincipal ?? '',
          currentPrincipal: loan.currentPrincipal ?? '',
          interestRate: loan.interestRate ?? '',
          emiAmount: loan.emiAmount ?? '',
          startDate: toInputDate(loan.startDate),
          endDate: toInputDate(loan.endDate),
          emiDay: loan.emiDay ?? '',
          paymentAccountId: loan.paymentAccountId || '',
        });
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to load loan');
        navigate('/loans');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, navigate]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error('Loan name is required');
      return;
    }
    const principal = parseFloat(form.originalPrincipal);
    if (!Number.isFinite(principal) || principal <= 0) {
      toast.error('Enter a valid original principal');
      return;
    }
    if (form.interestRate !== '' && (!Number.isFinite(parseFloat(form.interestRate)) || parseFloat(form.interestRate) < 0)) {
      toast.error('Enter a valid interest rate');
      return;
    }
    if (form.emiDay !== '' && (Number(form.emiDay) < 1 || Number(form.emiDay) > 31)) {
      toast.error('EMI day must be between 1 and 31');
      return;
    }
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      toast.error('End date must be after the start date');
      return;
    }

    const payload = {
      name: form.name.trim(),
      lender: form.lender.trim() || null,
      loanType: form.loanType,
      originalPrincipal: principal,
      interestRate: form.interestRate === '' ? 0 : parseFloat(form.interestRate),
      emiAmount: form.emiAmount === '' ? null : parseFloat(form.emiAmount),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      emiDay: form.emiDay === '' ? null : Number(form.emiDay),
      paymentAccountId: form.paymentAccountId || null,
    };

    // A balance the user has deliberately set is only meaningful on create; on
    // edit the ledger owns the balance, so it is not sent.
    if (!isEdit && form.currentPrincipal !== '') {
      payload.currentPrincipal = parseFloat(form.currentPrincipal);
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/loans/${id}`, payload);
        toast.success('Loan updated');
        navigate(`/loans/${id}`);
      } else {
        const res = await api.post('/loans', payload);
        toast.success(
          res.data.emiAmount
            ? `Loan added · EMI ${formatIndianCurrency(res.data.emiAmount)}`
            : 'Loan added'
        );
        navigate(`/loans/${res.data.id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save loan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
        {isEdit ? 'Edit Loan' : 'Add Loan'}
      </h1>

      <form onSubmit={handleSubmit} className={CARD}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={LABEL} htmlFor="loan-name">
              Loan name *
            </label>
            <input
              id="loan-name"
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. HDFC Home Loan"
              className={INPUT}
              required
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="loan-lender">
              Lender
            </label>
            <input
              id="loan-lender"
              type="text"
              value={form.lender}
              onChange={set('lender')}
              placeholder="e.g. HDFC Bank"
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="loan-type">
              Loan type
            </label>
            <select id="loan-type" value={form.loanType} onChange={set('loanType')} className={INPUT}>
              {LOAN_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor="loan-principal">
              Original principal (₹) *
            </label>
            <input
              id="loan-principal"
              type="number"
              step="0.01"
              min="0"
              value={form.originalPrincipal}
              onChange={set('originalPrincipal')}
              className={INPUT}
              required
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="loan-rate">
              Interest rate (% per year)
            </label>
            <input
              id="loan-rate"
              type="number"
              step="0.001"
              min="0"
              value={form.interestRate}
              onChange={set('interestRate')}
              placeholder="0 for an interest-free loan"
              className={INPUT}
            />
          </div>

          {!isEdit && (
            <div>
              <label className={LABEL} htmlFor="loan-current">
                Current outstanding (₹)
              </label>
              <input
                id="loan-current"
                type="number"
                step="0.01"
                min="0"
                value={form.currentPrincipal}
                onChange={set('currentPrincipal')}
                placeholder="Leave blank to start at the full principal"
                className={INPUT}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Use this when you are adding a loan that is already part-way through.
              </p>
            </div>
          )}

          <div>
            <label className={LABEL} htmlFor="loan-emi">
              EMI amount (₹)
            </label>
            <input
              id="loan-emi"
              type="number"
              step="0.01"
              min="0"
              value={form.emiAmount}
              onChange={set('emiAmount')}
              placeholder="Leave blank to calculate"
              className={INPUT}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Leave blank and the server computes it from the principal, rate and
              tenure — rounded up so it clears the term exactly.
            </p>
          </div>

          <div>
            <label className={LABEL} htmlFor="loan-start">
              Start date
            </label>
            <input
              id="loan-start"
              type="date"
              value={form.startDate}
              onChange={set('startDate')}
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="loan-end">
              End date
            </label>
            <input
              id="loan-end"
              type="date"
              value={form.endDate}
              onChange={set('endDate')}
              className={INPUT}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Start and end dates set the tenure used for the schedule.
            </p>
          </div>

          <div>
            <label className={LABEL} htmlFor="loan-emiday">
              EMI day of month
            </label>
            <input
              id="loan-emiday"
              type="number"
              min="1"
              max="31"
              value={form.emiDay}
              onChange={set('emiDay')}
              placeholder="e.g. 5"
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="loan-account">
              Pay from account
            </label>
            <select
              id="loan-account"
              value={form.paymentAccountId}
              onChange={set('paymentAccountId')}
              className={INPUT}
            >
              <option value="">No account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 mt-6">
          <button type="button" onClick={() => navigate('/loans')} className={BUTTON.secondary}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={BUTTON.primary}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Loan'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoanForm;
