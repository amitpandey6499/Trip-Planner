import { formatINR } from './budget.js';
import { addDays, isValidIsoDate } from './dates.js';
import { parseTimeSlot } from './time.js';

/**
 * Part 14 — the trip as a calendar file (.ics, RFC 5545) for Google Calendar, Outlook, Apple Calendar.
 *   - one all-day event per day ("Day 2: Solang Valley (Manali)") with the day's list
 *   - one event per activity that has a clock time; "Around 01:00 PM" = one hour
 * Every destination is in India, so plan times are Indian Standard Time (UTC+05:30, no daylight saving);
 * they are written in UTC, which every calendar app converts back to the viewer's time zone.
 */

const IST_OFFSET_MIN = 330;
const DEFAULT_EVENT_MIN = 60;
const encoder = new TextEncoder();

/** Text values: backslash, ; , and new lines are escaped. */
export const icsText = (value) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/** Lines longer than 75 bytes are folded (CRLF + space), never inside a UTF-8 character (₹ is 3 bytes). */
export const foldIcsLine = (line) => {
  const parts = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // a folded line starts with one space
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
};

const stampUtc = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); // 20261022T033000Z
const istToUtcMs = (iso, minutes) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d, 0, minutes - IST_OFFSET_MIN);
};
const dateValue = (iso) => iso.replace(/-/g, '');
const safeId = (value) => String(value).replace(/[^A-Za-z0-9_-]/g, '');

/**
 * @param {object} itinerary  normalized itinerary (days need dates)
 * @param {{ uidBase?: string, url?: string, now?: Date }} options  uidBase: e.g. the trip id (same ids → re-import updates, no duplicates)
 * @returns {{ ics: string, eventCount: number }}
 */
export const buildTripCalendar = (itinerary, { uidBase = 'trip', url, now = new Date() } = {}) => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TripPlanner//Trip export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsText(itinerary.title)}`,
    'X-WR-TIMEZONE:Asia/Kolkata',
  ];
  const stamp = stampUtc(now.getTime());
  const uid = (part) => `${safeId(uidBase)}-${part}@tripplanner`;
  const link = url ? [`URL:${url}`] : [];
  let eventCount = 0;

  for (const day of itinerary.days ?? []) {
    if (!isValidIsoDate(day.date)) continue;
    const list = (day.activities ?? []).map((a) => `- ${a.timeSlot ? `${a.timeSlot}: ` : ''}${a.placeName}`).join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid(`day${day.dayNumber}`)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateValue(day.date)}`,
      `DTEND;VALUE=DATE:${dateValue(addDays(day.date, 1))}`,
      `SUMMARY:${icsText(`Day ${day.dayNumber}: ${day.title} (${itinerary.destination})`)}`,
      `DESCRIPTION:${icsText([day.description, list, url && `Trip plan: ${url}`].filter(Boolean).join('\n\n'))}`,
      'TRANSP:TRANSPARENT',
      ...link,
      'END:VEVENT',
    );
    eventCount += 1;

    for (const [index, activity] of (day.activities ?? []).entries()) {
      const slot = parseTimeSlot(activity.timeSlot);
      if (!slot) continue;
      const end = slot.end ?? slot.start + DEFAULT_EVENT_MIN;
      const details = [
        activity.description,
        activity.tips && `Tip: ${activity.tips}`,
        activity.cost > 0 && `Estimated cost: ${formatINR(activity.cost)} (whole group)`,
        url && `Trip plan: ${url}`,
      ].filter(Boolean);
      const where = activity.coordinates;
      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid(safeId(activity.id ?? `d${day.dayNumber}-a${index + 1}`))}`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${stampUtc(istToUtcMs(day.date, slot.start))}`,
        `DTEND:${stampUtc(istToUtcMs(day.date, end))}`,
        `SUMMARY:${icsText(activity.placeName)}`,
        `LOCATION:${icsText(`${activity.placeName}, ${itinerary.destination}`)}`,
        ...(details.length ? [`DESCRIPTION:${icsText(details.join('\n'))}`] : []),
        ...(where && Number.isFinite(where.lat) && Number.isFinite(where.lng) ? [`GEO:${where.lat};${where.lng}`] : []),
        ...link,
        'END:VEVENT',
      );
      eventCount += 1;
    }
  }
  lines.push('END:VCALENDAR');
  return { ics: `${lines.map(foldIcsLine).join('\r\n')}\r\n`, eventCount };
};
