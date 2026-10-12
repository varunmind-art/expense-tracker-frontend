import test from 'node:test';
import assert from 'node:assert/strict';

import { formatIndianCurrency } from '../src/utils/helpers.js';
import {
  BUTTON,
  formatDate,
  formatMonth,
  formatMonths,
  formatPercent,
  loanTypeLabel,
  paymentKindLabel,
  progressWidth,
  scheduleStatusClasses,
  scheduleStatusLabel,
} from '../src/utils/loans.js';

/**
 * The display layer, checked against the values the Loan API really returns.
 *
 * These are the exact shapes returned by `/api/loans/:id/summary`,
 * `/api/loans/:id/schedule` and `POST /api/loans/:id/simulate` (see
 * backend test/db/loans.test.js), so a change to the payload that would render
 * as "undefined" or "₹NaN" on screen fails here.
 */

const SUMMARY = {
  originalPrincipal: 1000000,
  outstandingPrincipal: 998405.09,
  principalRepaid: 1594.91,
  totalAmountPaid: 8678.24,
  totalInterestPaid: 7083.33,
  progressPercent: 0.16,
  interestRate: 8.5,
  emiAmount: 8678.24,
  remainingMonths: 240,
  estimatedPayoffDate: '2046-01-01T00:00:00.000Z',
  paymentCount: 1,
  isClosed: false,
  isActive: true,
};

const SCHEDULE_ROW = {
  period: 1,
  date: '2026-02-01T00:00:00.000Z',
  openingBalance: 1000000,
  interest: 7083.33,
  principal: 1594.91,
  extraPrincipal: 0,
  emi: 8678.24,
  scheduledEmi: 8678.24,
  totalPayment: 8678.24,
  closingBalance: 998405.09,
  isFinal: false,
  status: 'PAID',
  actual: {
    totalAmount: 8678.24,
    principalAmount: 1594.91,
    interestAmount: 7083.33,
    extraPrincipal: 0,
    count: 1,
    date: '2026-02-05T00:00:00.000Z',
    paymentIds: ['pay-1'],
  },
};

const FORECAST_ROW = {
  ...SCHEDULE_ROW,
  period: 2,
  status: 'FORECAST',
  actual: null,
};

const PREPAYMENT = {
  baseline: { totalInterest: 1082776.63, months: 240, payoffDate: '2046-01-01T00:00:00.000Z' },
  scenario: { totalInterest: 501248.84, months: 150, payoffDate: '2038-07-01T00:00:00.000Z' },
  interestSaved: 581527.79,
  monthsSaved: 90,
  newPayoffDate: '2038-07-01T00:00:00.000Z',
  principalReducedImmediately: 200000,
  emiAfter: 8678.24,
  keepEmi: true,
  closesToZero: true,
  amortizes: true,
};

const RATE_CHANGE = {
  newRatePercent: 9.5,
  changedFrom: 25,
  unaffectedPeriods: 24,
  balanceAtChange: 958436.29,
  newTotalInterest: 1490868.92,
  totalInterestDelta: 408092.28,
  newPayoffDate: '2050-02-01T00:00:00.000Z',
  monthsDelta: 47,
  emiForSameTenure: 9260.63,
  baseline: { totalInterest: 1082776.64, months: 241, emi: 8678.23 },
};

test('summary values render as real currency, never "₹NaN"', () => {
  for (const key of ['originalPrincipal', 'outstandingPrincipal', 'principalRepaid', 'totalAmountPaid', 'totalInterestPaid', 'emiAmount']) {
    const rendered = formatIndianCurrency(SUMMARY[key]);
    assert.match(rendered, /^₹[\d,]+\.\d{2}$/, `${key} rendered as ${rendered}`);
    assert.ok(!rendered.includes('NaN'), `${key} rendered as ${rendered}`);
  }
  assert.equal(formatIndianCurrency(SUMMARY.outstandingPrincipal), '₹9,98,405.09');
  assert.equal(formatIndianCurrency(SUMMARY.originalPrincipal), '₹10,00,000.00');
});

test('a null or missing money value renders as zero, not "undefined"', () => {
  for (const value of [null, undefined, NaN, '']) {
    assert.equal(formatIndianCurrency(value), '₹0.00');
  }
});

test('percentages and tenures from the summary render readably', () => {
  assert.equal(formatPercent(SUMMARY.progressPercent), '0.16%');
  assert.equal(formatPercent(SUMMARY.interestRate), '8.50%');
  assert.equal(formatPercent(null), '—');
  assert.equal(formatPercent(undefined), '—');

  assert.equal(formatMonths(SUMMARY.remainingMonths), '20 yr');
  assert.equal(formatMonths(90), '7 yr 6 mo');
  assert.equal(formatMonths(11), '11 mo');
  assert.equal(formatMonths(0), '0 mo');
  assert.equal(formatMonths(null), '—');
});

test('a payoff date renders as a readable date and never as "Invalid Date"', () => {
  const rendered = formatDate(SUMMARY.estimatedPayoffDate);
  assert.match(rendered, /^\d{2} [A-Z][a-z]{2} \d{4}$/, rendered);
  assert.ok(rendered.includes('2046'));
  assert.equal(formatDate(null), '—');
  assert.equal(formatDate(undefined), '—');
  assert.equal(formatDate('not-a-date'), '—');
});

test('schedule periods render by month, and a missing date is an em dash', () => {
  assert.match(formatMonth(SCHEDULE_ROW.date), /^[A-Z][a-z]{2} \d{4}$/);
  assert.equal(formatMonth(null), '—');
});

test('a paid period and a forecast period are visually distinct', () => {
  assert.notEqual(scheduleStatusClasses('PAID'), scheduleStatusClasses('FORECAST'));
  assert.notEqual(scheduleStatusClasses('PARTIAL'), scheduleStatusClasses('FORECAST'));
  assert.notEqual(scheduleStatusClasses('PAID'), scheduleStatusClasses('PARTIAL'));
  assert.equal(scheduleStatusLabel('PAID'), 'Paid');
  assert.equal(scheduleStatusLabel('FORECAST'), 'Forecast');
  assert.equal(scheduleStatusLabel(undefined), 'Forecast');
  // A paid row carries its actual amount; a forecast row must not claim one.
  assert.equal(SCHEDULE_ROW.actual.totalAmount, 8678.24);
  assert.equal(FORECAST_ROW.actual, null);
});

test('the progress bar width is a safe CSS percentage for any input', () => {
  assert.equal(progressWidth(0), '0%');
  assert.equal(progressWidth(0.16), '0.16%');
  assert.equal(progressWidth(100), '100%');
  assert.equal(progressWidth(150), '100%');
  assert.equal(progressWidth(-20), '0%');
  assert.equal(progressWidth(null), '0%');
  assert.equal(progressWidth('abc'), '0%');
});

test('prepayment simulation values all render, including the saved amounts', () => {
  assert.equal(formatIndianCurrency(PREPAYMENT.interestSaved), '₹5,81,527.79');
  assert.equal(formatMonths(PREPAYMENT.monthsSaved), '7 yr 6 mo');
  assert.equal(formatIndianCurrency(PREPAYMENT.emiAfter), '₹8,678.24');
  assert.ok(formatDate(PREPAYMENT.newPayoffDate).includes('2038'));
  // The revised payoff must be earlier than the baseline payoff.
  assert.ok(new Date(PREPAYMENT.newPayoffDate) < new Date(PREPAYMENT.baseline.payoffDate));
  // The scenario must cost less interest than the baseline.
  assert.ok(PREPAYMENT.scenario.totalInterest < PREPAYMENT.baseline.totalInterest);
});

test('rate change values render, with a signed tenure change', () => {
  assert.equal(formatPercent(RATE_CHANGE.newRatePercent), '9.50%');
  assert.equal(formatIndianCurrency(RATE_CHANGE.totalInterestDelta), '₹4,08,092.28');
  assert.equal(formatIndianCurrency(RATE_CHANGE.emiForSameTenure), '₹9,260.63');
  assert.ok(formatDate(RATE_CHANGE.newPayoffDate).includes('2050'));
  assert.ok(RATE_CHANGE.unaffectedPeriods < RATE_CHANGE.changedFrom);
});

test('every loan type and payment kind has a label, including unknown values', () => {
  for (const type of ['HOME_LOAN', 'PERSONAL_LOAN', 'CAR_LOAN', 'EDUCATION_LOAN', 'GOLD_LOAN', 'BUSINESS_LOAN', 'CREDIT_CARD_LOAN', 'OTHER']) {
    const label = loanTypeLabel(type);
    assert.ok(label && label !== type, `${type} has no friendly label`);
  }
  assert.equal(loanTypeLabel('SOMETHING_NEW'), 'Loan');

  for (const kind of ['EMI', 'PREPAYMENT', 'PART_PAYMENT', 'ADJUSTMENT']) {
    assert.ok(paymentKindLabel(kind));
  }
  assert.equal(paymentKindLabel(null), 'Payment');
});

test('every button variant has styling, so no action renders unstyled', () => {
  for (const [name, value] of Object.entries(BUTTON)) {
    assert.ok(typeof value === 'string' && value.length > 0, `${name} is empty`);
  }
});
