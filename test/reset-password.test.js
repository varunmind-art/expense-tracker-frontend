import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_BYTES,
  extractResetToken,
  validateNewPassword,
  validateResetForm,
  describeResetError,
} from '../src/utils/resetPassword.js';

const TOKEN = 'aaa.bbb.ccc';
const TOKEN_WITH_UNDERSCORE_AND_DASH = 'a_b-c.d_e-f.g_h-i';

describe('extractResetToken', () => {
  test('parses a normal "?token=..." search string', () => {
    assert.equal(extractResetToken(`?token=${TOKEN}`), TOKEN);
  });

  test('finds the token among other query params', () => {
    assert.equal(extractResetToken(`?a=1&token=${TOKEN}&b=2`), TOKEN);
  });

  test('accepts a search string without the leading "?"', () => {
    assert.equal(extractResetToken(`token=${TOKEN}`), TOKEN);
  });

  test('accepts a full URL-style hash-prefixed search string', () => {
    assert.equal(extractResetToken(`#token=${TOKEN}`), TOKEN);
  });

  test('returns null when the token param is missing', () => {
    assert.equal(extractResetToken('?a=1&b=2'), null);
    assert.equal(extractResetToken(''), null);
  });

  test('returns null for an empty token value', () => {
    assert.equal(extractResetToken('?token='), null);
  });

  test('returns null for a blank (whitespace-only) token', () => {
    assert.equal(extractResetToken('?token=%20%20%20'), null);
    assert.equal(extractResetToken('?token=   '), null);
  });

  test('decodes a percent-encoded token', () => {
    // %2E is '.', %5F is '_', %2D is '-'
    assert.equal(
      extractResetToken('?token=a%5Fb%2Dc.d%5Fe%2Df.g%5Fh%2Di'),
      TOKEN_WITH_UNDERSCORE_AND_DASH
    );
  });

  test('does not throw on malformed percent-encoding and returns null', () => {
    assert.doesNotThrow(() => extractResetToken('?token=%E0%A4%A'));
    assert.equal(extractResetToken('?token=%E0%A4%A'), null);
    assert.equal(extractResetToken('?token=%ZZ.%ZZ.%ZZ'), null);
  });

  test('rejects a non-JWT value', () => {
    assert.equal(extractResetToken('?token=not-a-jwt'), null);
    assert.equal(extractResetToken('?token=aaa.bbb'), null);
    assert.equal(extractResetToken('?token=aaa..ccc'), null);
    assert.equal(extractResetToken('?token=.bbb.ccc'), null);
    assert.equal(extractResetToken('?token=aaa.bbb.ccc.ddd'), null);
    assert.equal(extractResetToken('?token=' + 'x'.repeat(40)), null);
  });

  test('is resilient to non-string input', () => {
    assert.equal(extractResetToken(undefined), null);
    assert.equal(extractResetToken(null), null);
    assert.equal(extractResetToken(42), null);
  });

  test('does not pick up a token-looking value from another param', () => {
    assert.equal(extractResetToken(`?redirect=${TOKEN}`), null);
    assert.equal(extractResetToken(`?next=1&tokenish=${TOKEN}`), null);
  });
});

describe('validateNewPassword', () => {
  test('requires a password for undefined/empty/non-string', () => {
    assert.ok(validateNewPassword(undefined));
    assert.ok(validateNewPassword(''));
    assert.ok(validateNewPassword(null));
    assert.ok(validateNewPassword(12345678));
    assert.match(validateNewPassword(undefined), /required/i);
  });

  test('rejects 7 characters as too short', () => {
    assert.equal('abcdefg'.length, PASSWORD_MIN_LENGTH - 1);
    assert.match(validateNewPassword('abcdefg'), /at least 8/i);
  });

  test('accepts 8 characters', () => {
    assert.equal(validateNewPassword('abcdefgh'), null);
  });

  test('accepts exactly 72 bytes', () => {
    const password = 'a'.repeat(72);
    assert.equal(password.length, PASSWORD_MAX_BYTES);
    assert.equal(validateNewPassword(password), null);
  });

  test('rejects 73 bytes as too long', () => {
    assert.match(validateNewPassword('a'.repeat(73)), /72 bytes/i);
  });

  test('measures multi-byte characters in bytes, not JS string length', () => {
    const password = 'é'.repeat(40); // 40 characters, 80 UTF-8 bytes
    assert.ok(password.length < PASSWORD_MAX_BYTES);
    assert.ok(new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES);
    assert.match(validateNewPassword(password), /72 bytes/i);
  });

  test('accepts a multi-byte password that stays within 72 bytes', () => {
    assert.equal(validateNewPassword('é'.repeat(36)), null); // 72 bytes exactly
    assert.match(validateNewPassword('é'.repeat(37)), /72 bytes/i); // 74 bytes
  });
});

describe('validateResetForm', () => {
  test('reports field "password" for a bad password', () => {
    const result = validateResetForm({ password: 'short', confirmPassword: 'short' });
    assert.ok(result);
    assert.equal(result.field, 'password');
    assert.ok(result.message.length > 0);
  });

  test('reports field "password" when the password is missing', () => {
    const result = validateResetForm({ confirmPassword: 'abcdefgh' });
    assert.ok(result);
    assert.equal(result.field, 'password');
  });

  test('reports the mismatch on "confirmPassword" with the exact message', () => {
    const result = validateResetForm({
      password: 'abcdefgh',
      confirmPassword: 'abcdefgi',
    });
    assert.deepEqual(result, {
      field: 'confirmPassword',
      message: 'Passwords do not match.',
    });
  });

  test('reports a mismatch when confirmation is missing or not a string', () => {
    assert.equal(
      validateResetForm({ password: 'abcdefgh' }).field,
      'confirmPassword'
    );
    assert.equal(
      validateResetForm({ password: 'abcdefgh', confirmPassword: null }).message,
      'Passwords do not match.'
    );
  });

  test('returns null when the form is valid', () => {
    assert.equal(
      validateResetForm({ password: 'abcdefgh', confirmPassword: 'abcdefgh' }),
      null
    );
  });

  test('checks the password before the confirmation', () => {
    const result = validateResetForm({ password: '', confirmPassword: 'whatever' });
    assert.equal(result.field, 'password');
  });

  test('is resilient to a missing argument', () => {
    assert.ok(validateResetForm(undefined));
    assert.equal(validateResetForm(undefined).field, 'password');
  });
});

describe('describeResetError', () => {
  test('flags an invalid/expired token as needing a new link', () => {
    const result = describeResetError({
      status: 400,
      serverError: 'Invalid or expired token.',
    });
    assert.equal(result.needsNewLink, true);
    assert.ok(result.message.length > 0);
    assert.match(result.message, /link/i);
  });

  test('passes password validation messages through without a new link', () => {
    const messages = [
      'Password is required.',
      'Password must be at least 8 characters.',
      'Password must be at most 72 bytes.',
    ];
    for (const message of messages) {
      const result = describeResetError({ status: 400, serverError: message });
      assert.equal(result.message, message);
      assert.equal(result.needsNewLink, false);
    }
  });

  test('treats a missing status as a network/connection problem', () => {
    const result = describeResetError({ serverError: undefined });
    assert.equal(result.needsNewLink, false);
    assert.ok(typeof result.message === 'string' && result.message.length > 0);
    assert.notEqual(result.message, 'undefined');
  });

  test('treats no argument at all as a network/connection problem', () => {
    const result = describeResetError();
    assert.equal(result.needsNewLink, false);
    assert.ok(result.message.length > 0);
  });

  test('does not echo an arbitrary 500 payload verbatim', () => {
    const payload = '<html>500</html>';
    const result = describeResetError({ status: 500, serverError: payload });
    assert.equal(result.needsNewLink, false);
    assert.ok(result.message.length > 0);
    assert.ok(!result.message.includes(payload));
    assert.ok(!result.message.includes('500'));
    assert.ok(!result.message.includes('<html>'));
  });

  test('does not echo an unknown 4xx payload verbatim', () => {
    const payload = 'boom: internal stack trace';
    const result = describeResetError({ status: 418, serverError: payload });
    assert.equal(result.needsNewLink, false);
    assert.ok(!result.message.includes(payload));
  });

  test('still recognises the token error on a 500 response', () => {
    const result = describeResetError({
      status: 500,
      serverError: 'Invalid or expired token.',
    });
    assert.equal(result.needsNewLink, true);
  });
});
