// src/utils/helpers.js

/**
 * Formats a number as Indian currency (₹) with lakh/crore style commas.
 * Examples:
 *   16739    → ₹16,739.00
 *   1106739  → ₹11,06,739.00
 *   0        → ₹0.00
 */
export const formatIndianCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
  const num = parseFloat(amount);
  if (num === 0) return '₹0.00';
  // Round to 2 decimals
  const rounded = Math.round(num * 100) / 100;
  const parts = rounded.toFixed(2).split('.');
  let intPart = parts[0];
  const decPart = parts[1];
  // Indian numbering: last 3 digits grouped, then groups of 2
  const lastThree = intPart.slice(-3);
  const other = intPart.slice(0, -3);
  let formatted = '';
  if (other.length > 0) {
    const otherGroups = other.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formatted = otherGroups + ',' + lastThree;
  } else {
    formatted = lastThree;
  }
  return `₹${formatted}.${decPart}`;
};