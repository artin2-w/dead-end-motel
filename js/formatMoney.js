/**
 * Whole-dollar USD strings for logs, budget lines, and UI.
 * Safe for missing or non-numeric values.
 */
export function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '$0';
  return `$${Math.round(amount)}`;
}
