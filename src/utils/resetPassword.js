/**
 * Password reset helpers.
 *
 * Dependency-free and side-effect-free on purpose so it can be unit tested with
 * Node's built-in test runner (no jsdom, no test framework).
 *
 * These rules mirror the backend contract of POST /api/auth/reset-password:
 *   - password is required
 *   - password must be at least 8 characters
 *   - password must be at most 72 BYTES (bcrypt truncates in bytes, not characters)
 *   - an unknown/expired token is reported as 'Invalid or expired token.'
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

// Three non-empty dot-separated base64url segments.
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

const REQUIRE_PASSWORD_MESSAGE = 'Password is required.';
const PASSWORD_MIN_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
const PASSWORD_MAX_BYTES_MESSAGE = `Password must be at most ${PASSWORD_MAX_BYTES} bytes.`;
const PASSWORD_MISMATCH_MESSAGE = 'Passwords do not match.';
const INVALID_TOKEN_MESSAGE = 'Invalid or expired token.';

const LINK_PROBLEM_MESSAGE =
  'This reset link is invalid, expired or has already been used. Please request a new one.';
const CONNECTION_PROBLEM_MESSAGE =
  'Could not reach the server. Check your connection and try again.';
const GENERIC_PROBLEM_MESSAGE =
  'We could not reset your password. Please try again in a moment.';

/**
 * Measure a string in bytes (UTF-8), which is what bcrypt actually limits.
 * @param {string} value
 * @returns {number}
 */
function byteLength(value) {
  return new TextEncoder().encode(value).length;
}

/**
 * Pull the reset token out of a URL search string.
 *
 * Accepts both '?a=1&token=x' and 'token=x', and is resilient to malformed
 * percent-encoding (never throws).
 *
 * @param {string} search
 * @returns {string|null} the token, or null when missing/blank/not JWT-shaped
 */
export function extractResetToken(search) {
  if (typeof search !== 'string' || search.trim() === '') {
    return null;
  }

  const query = search.trim().replace(/^[?#]+/, '');
  if (query === '') {
    return null;
  }

  let raw = null;

  for (const pair of query.split('&')) {
    if (pair === '') continue;
    const separator = pair.indexOf('=');
    const key = separator === -1 ? pair : pair.slice(0, separator);
    if (key !== 'token') continue;
    raw = separator === -1 ? '' : pair.slice(separator + 1);
    break;
  }

  if (raw === null) {
    return null;
  }

  // '+' means a space in a query string; a JWT never contains a literal '+',
  // so decoding it to a space simply lets it fail the JWT shape check below.
  const candidate = raw.replace(/\+/g, ' ');

  let decoded;
  try {
    decoded = decodeURIComponent(candidate);
  } catch {
    return null; // malformed percent-encoding
  }

  const token = decoded.trim();
  if (token === '' || !JWT_PATTERN.test(token)) {
    return null;
  }

  return token;
}

/**
 * Validate a new password against the backend rules.
 * @param {unknown} password
 * @returns {string|null} an error message, or null when acceptable
 */
export function validateNewPassword(password) {
  if (typeof password !== 'string' || password === '') {
    return REQUIRE_PASSWORD_MESSAGE;
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return PASSWORD_MIN_MESSAGE;
  }

  if (byteLength(password) > PASSWORD_MAX_BYTES) {
    return PASSWORD_MAX_BYTES_MESSAGE;
  }

  return null;
}

/**
 * Validate the whole reset form (password first, then confirmation).
 * @param {{ password?: unknown, confirmPassword?: unknown }} form
 * @returns {{ field: 'password'|'confirmPassword', message: string }|null}
 */
export function validateResetForm(form) {
  const { password, confirmPassword } = form || {};

  const passwordError = validateNewPassword(password);
  if (passwordError) {
    return { field: 'password', message: passwordError };
  }

  if (typeof confirmPassword !== 'string' || confirmPassword !== password) {
    return { field: 'confirmPassword', message: PASSWORD_MISMATCH_MESSAGE };
  }

  return null;
}

/**
 * Map an API failure to user-facing copy.
 *
 * @param {{ status?: number, serverError?: string }} [failure]
 * @returns {{ message: string, needsNewLink: boolean }}
 */
export function describeResetError(failure) {
  const status = failure && typeof failure.status === 'number' ? failure.status : undefined;
  const serverError =
    failure && typeof failure.serverError === 'string' ? failure.serverError : '';

  if (serverError.includes(INVALID_TOKEN_MESSAGE)) {
    return { message: LINK_PROBLEM_MESSAGE, needsNewLink: true };
  }

  // Pass through the three password validation messages the backend can return.
  if (
    serverError === REQUIRE_PASSWORD_MESSAGE ||
    serverError === PASSWORD_MIN_MESSAGE ||
    serverError === PASSWORD_MAX_BYTES_MESSAGE
  ) {
    return { message: serverError, needsNewLink: false };
  }

  // No HTTP status at all means the request never completed (network/timeout).
  if (status === undefined) {
    return { message: CONNECTION_PROBLEM_MESSAGE, needsNewLink: false };
  }

  // Unknown 5xx/4xx: stay generic and never echo the raw server payload.
  return { message: GENERIC_PROBLEM_MESSAGE, needsNewLink: false };
}
