/**
 * Part 15 — expense money is kept in PAISE (whole numbers), so splitting never loses or invents a paisa:
 * ₹100 among 3 people = 33.34 + 33.33 + 33.33. Itinerary estimates stay in whole rupees (Part 2).
 */

/** "1,234.5" / "₹99" / 99.999 → paise (12345 / 9900 / 10000); not a number → NaN. */
export const toPaise = (value) => {
  if (value === null || value === undefined || value === '') return NaN;
  const number = typeof value === 'string' ? Number(value.replace(/[₹,\s]/g, '')) : Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) : NaN;
};

/** 12345 → 123.45 (rupees, for inputs). */
export const paiseToRupees = (paise) => Math.round(paise) / 100;

/** 12345 → '₹123.45', 12300 → '₹123', -5000 → '-₹50' (Indian grouping). */
export const formatPaise = (paise) => {
  const value = Math.round(Number(paise) || 0);
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const rupees = Math.floor(abs / 100).toLocaleString('en-IN');
  const rest = abs % 100;
  return `${sign}₹${rupees}${rest ? `.${String(rest).padStart(2, '0')}` : ''}`;
};

/**
 * Split `total` paise equally among ids; the leftover paise go one each to the first people (fixed order).
 *   splitEvenly(10000, ['a', 'b', 'c']) → Map { a: 3334, b: 3333, c: 3333 }
 */
export const splitEvenly = (total, ids) => {
  const result = new Map();
  if (!ids.length) return result;
  const base = Math.floor(total / ids.length);
  let leftover = total - base * ids.length;
  for (const id of ids) {
    result.set(id, base + (leftover > 0 ? 1 : 0));
    leftover -= 1;
  }
  return result;
};
