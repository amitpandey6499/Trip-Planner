/**
 * Parse a whole number from user input. Returns `fallback` for missing values
 * and `NaN` for garbage, so callers can reject bad input instead of silently using NaN.
 */
export const parseIntOr = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  const number = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(number) ? Math.round(number) : NaN;
};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
