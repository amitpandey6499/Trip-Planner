/**
 * Activity time slots (Part 12). Itineraries store a slot as text — "09:00 AM - 11:00 AM", "Around 01:00 PM",
 * "All day" — because that is what the AI writes. These helpers read and write that text.
 * Times are minutes since midnight (9:30 AM → 570).
 */

const MINUTES_PER_DAY = 24 * 60;
// "09:00 AM", "9:00", "13:30", "9 am", "9pm", "9 a.m." — a bare number ("2 hours") is NOT a time.
const CLOCK = /(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?|(\d{1,2}):(\d{2})/gi;

const toMinutes = (hours, minutes, meridiem) => {
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    const h24 = (hours % 12) + (meridiem === 'p' ? 12 : 0);
    return h24 * 60 + minutes;
  }
  return hours > 23 ? null : hours * 60 + minutes;
};

/**
 * "09:00 AM - 11:00 AM" → { start: 540, end: 660 }; "Around 01:00 PM" → { start: 780, end: null }.
 * Text without a clock time ("All day", "Morning", "") → null.
 */
export const parseTimeSlot = (text) => {
  const value = String(text ?? '');
  const found = [...value.matchAll(CLOCK)].slice(0, 2).map((m) => ({
    hours: Number(m[1] ?? m[4]),
    minutes: Number(m[2] ?? m[5] ?? 0),
    meridiem: m[3]?.toLowerCase() ?? null,
  }));
  if (!found.length) return null;
  const [first, second] = found;
  // "11 - 1 PM" / "10:30 - 11:30 AM": the first time takes the second one's AM / PM when that makes sense.
  if (second?.meridiem && !first.meridiem && first.hours <= 12) {
    const sameHalf = toMinutes(first.hours, first.minutes, second.meridiem);
    const end = toMinutes(second.hours, second.minutes, second.meridiem);
    first.meridiem = sameHalf !== null && end !== null && sameHalf <= end ? second.meridiem : second.meridiem === 'p' ? 'a' : 'p';
  }
  const start = toMinutes(first.hours, first.minutes, first.meridiem);
  if (start === null) return null;
  let end = second ? toMinutes(second.hours, second.minutes, second.meridiem) : null;
  if (end !== null && end <= start) end += MINUTES_PER_DAY; // "10:00 PM - 01:00 AM"
  return { start, end };
};

/** 570 → "09:30 AM" (wraps past midnight). */
export const formatClock = (minutes) => {
  const total = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h24 = Math.floor(total / 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(total % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
};

/** (540, 660) → "09:00 AM - 11:00 AM"; (780, null) → "01:00 PM". */
export const formatTimeSlot = (start, end = null) => (Number.isFinite(end) ? `${formatClock(start)} - ${formatClock(end)}` : formatClock(start));

/** For <input type="time">: 570 → "09:30", and back ("" → null). */
export const toTimeInput = (minutes) => {
  if (!Number.isFinite(minutes)) return '';
  const total = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
export const fromTimeInput = (value) => {
  const m = /^(\d{2}):(\d{2})$/.exec(String(value ?? ''));
  return m ? toMinutes(Number(m[1]), Number(m[2]), null) : null;
};
