// Note: no `import React` here — the Vite React plugin uses the automatic JSX
// runtime, and this ESLint config rejects the (otherwise conventional) unused
// default import.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';
import ThemeToggle from '../Common/ThemeToggle';
import {
  extractResetToken,
  validateResetForm,
  describeResetError,
} from '../../utils/resetPassword';

const REDIRECT_DELAY_MS = 2500;
const FIELD_IDS = {
  password: 'reset-password',
  confirmPassword: 'reset-password-confirm',
};

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = extractResetToken(searchParams.toString());

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const navigate = useNavigate();
  const inFlightRef = useRef(false);
  const redirectTimerRef = useRef(null);
  const firstFieldRef = useRef(null);

  const errorIdFor = (field) => `${FIELD_IDS[field]}-error`;

  // Never leave a timer running after unmount.
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, []);

  // Move focus to the offending field after a failed client-side validation.
  useEffect(() => {
    const erroredField = fieldErrors.password
      ? 'password'
      : fieldErrors.confirmPassword
        ? 'confirmPassword'
        : null;
    if (!erroredField) return;
    const input = document.getElementById(FIELD_IDS[erroredField]);
    if (input) input.focus();
  }, [fieldErrors]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Guard against double submission (second click, Enter while in flight).
    if (inFlightRef.current) return;

    const validationError = validateResetForm({ password, confirmPassword });
    if (validationError) {
      setSubmitError(null);
      setFieldErrors({ [validationError.field]: validationError.message });
      return;
    }

    inFlightRef.current = true;
    setSubmitting(true);
    setFieldErrors({});
    setSubmitError(null);

    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSucceeded(true);
      toast.success('Password updated successfully.');

      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current);
      }
      redirectTimerRef.current = setTimeout(() => {
        redirectTimerRef.current = null;
        navigate('/login');
      }, REDIRECT_DELAY_MS);
    } catch (error) {
      const failure = describeResetError({
        status: error?.response?.status,
        serverError: error?.response?.data?.error,
      });
      setSubmitError(failure);
      toast.error(failure.message);
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  const handleChange = (field, value, setter) => {
    setter(value);
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const inputClass = (field) => {
    const base =
      'w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
    const border = fieldErrors[field]
      ? 'border-red-500 dark:border-red-400'
      : 'border-gray-300 dark:border-gray-600';
    return `${base} ${border}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
          Set a New Password
        </h2>

        {!token ? (
          <div>
            <p role="alert" className="text-center text-red-600 dark:text-red-400 mb-4">
              This password reset link is invalid or incomplete. The link may have been copied
              incorrectly, or it may be missing its token.
            </p>
            <p className="text-center text-gray-600 dark:text-gray-400">
              <Link
                to="/forgot-password"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Request a new reset link
              </Link>
            </p>
          </div>
        ) : succeeded ? (
          <div>
            <p role="status" className="text-center text-green-600 dark:text-green-400 mb-4">
              Your password has been updated. Redirecting you to the login page…
            </p>
            <p className="text-center text-gray-600 dark:text-gray-400">
              <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
                Go to Login
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label
                htmlFor={FIELD_IDS.password}
                className="block text-gray-700 dark:text-gray-300 mb-2"
              >
                New Password
              </label>
              <input
                ref={firstFieldRef}
                id={FIELD_IDS.password}
                name="newPassword"
                type="password"
                autoComplete="new-password"
                autoFocus
                value={password}
                onChange={(e) => handleChange('password', e.target.value, setPassword)}
                aria-invalid={fieldErrors.password ? 'true' : 'false'}
                aria-describedby={fieldErrors.password ? errorIdFor('password') : undefined}
                className={inputClass('password')}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                At least 8 characters.
              </p>
              {fieldErrors.password && (
                <p
                  id={errorIdFor('password')}
                  role="alert"
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor={FIELD_IDS.confirmPassword}
                className="block text-gray-700 dark:text-gray-300 mb-2"
              >
                Confirm Password
              </label>
              <input
                id={FIELD_IDS.confirmPassword}
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) =>
                  handleChange('confirmPassword', e.target.value, setConfirmPassword)
                }
                aria-invalid={fieldErrors.confirmPassword ? 'true' : 'false'}
                aria-describedby={
                  fieldErrors.confirmPassword ? errorIdFor('confirmPassword') : undefined
                }
                className={inputClass('confirmPassword')}
              />
              {fieldErrors.confirmPassword && (
                <p
                  id={errorIdFor('confirmPassword')}
                  role="alert"
                  className="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {submitError && (
              <div className="mb-4">
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {submitError.message}
                </p>
                {submitError.needsNewLink && (
                  <p className="mt-1 text-sm">
                    <Link
                      to="/forgot-password"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Request a new link
                    </Link>
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
