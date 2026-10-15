/**
 * Date helpers. All trip dates are plain calendar dates as 'YYYY-MM-DD' strings.
 * Calculations use UTC internally, so results never shift by a day because of time zones.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (n) => String(n).padStart(2, '0');

/** True for a real calendar date like '2026-11-12' (rejects '2026-02-30'). */
export const isValidIsoDate = (value) => {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

const toUtcMs = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Date object (local time) → 'YYYY-MM-DD'. */
export const toIsoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Today in the user's local time zone. */
export const todayIso = () => toIsoDate(new Date());

/** '2026-11-12' + 3 → '2026-11-15' */
export const addDays = (iso, days) => new Date(toUtcMs(iso) + days * DAY_MS).toISOString().slice(0, 10);

/** Whole days from `start` to `end` ('2026-11-12' → '2026-11-15' = 3). */
export const daysBetween = (start, end) => Math.round((toUtcMs(end) - toUtcMs(start)) / DAY_MS);

/** Inclusive trip length: 12th to 15th = 4 days. */
export const calcDuration = (startDate, endDate) => daysBetween(startDate, endDate) + 1;

/** 'Upcoming' | 'Ongoing' | 'Past' — calculated, never stored. */
export const tripPhase = (startDate, endDate, today = todayIso()) => {
  if (!isValidIsoDate(startDate)) return 'Upcoming';
  const end = isValidIsoDate(endDate) ? endDate : startDate;
  if (today < startDate) return 'Upcoming';
  if (today > end) return 'Past';
  return 'Ongoing';
};

/** Sensible wizard defaults: a 4-day trip starting one week from today. */
export const defaultTripDates = (today = todayIso()) => {
  const startDate = addDays(today, 7);
  return { startDate, endDate: addDays(startDate, 3) };
};

/** '2026-11-12' → '12 Nov 2026' */
export const formatDate = (iso, locale = 'en-IN') => {
  if (!isValidIsoDate(iso)) return '';
  return new Date(toUtcMs(iso)).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthName = (month) => MONTHS_SHORT[(Number(month) - 1 + 12) % 12];

/** [10, 11, 12, 1, 2, 3] → "Oct–Mar"; [3, 4, 5, 10, 11] → "Mar–May, Oct–Nov"; all 12 → "All year". */
export const formatMonthRanges = (months) => {
  const set = new Set((months ?? []).map(Number).filter((m) => m >= 1 && m <= 12));
  if (set.size === 0) return '';
  if (set.size === 12) return 'All year';
  // start each run at a month whose previous month is not included (handles Dec → Jan wrap)
  const starts = [...set].filter((m) => !set.has(m === 1 ? 12 : m - 1)).sort((a, b) => a - b);
  return starts
    .map((start) => {
      let end = start;
      while (set.has(end === 12 ? 1 : end + 1) && (end === 12 ? 1 : end + 1) !== start) end = end === 12 ? 1 : end + 1;
      return start === end ? monthName(start) : `${monthName(start)}–${monthName(end)}`;
    })
    .join(', ');
};
