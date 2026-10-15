import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTripCalendar, foldIcsLine, formatDateLong, icsText, normalizeItinerary, ShareSettingsSchema } from '../src/index.js';

const FACTS = { startDate: '2026-12-01', endDate: '2026-12-02', durationDays: 2, travelersCount: 2, totalBudget: 20000, budgetCategory: 'Moderate' };
const trip = () =>
  normalizeItinerary(
    {
      destination: 'Manali',
      title: 'Snow, cafés; and more',
      budgetBreakdown: {},
      days: [
        {
          title: 'Old Manali',
          description: 'Temples, then cafés.',
          activities: [
            { placeName: 'Hadimba Devi Temple', timeSlot: '09:00 AM - 11:00 AM', category: 'Attraction', cost: 200, tips: 'Go early, before 9', coordinates: { lat: 32.2483, lng: 77.1814 } },
            { placeName: 'Lunch at Café 1947', timeSlot: 'Around 01:00 PM', category: 'Restaurant', cost: 1000 },
            { placeName: 'Local cab for the day', timeSlot: 'All day', category: 'Transit', cost: 1500 },
          ],
        },
        { title: 'Night market', activities: [{ placeName: 'Late dinner & bonfire', timeSlot: '10:00 PM - 01:00 AM', category: 'Restaurant', cost: 900 }] },
      ],
    },
    FACTS,
  );

const unfold = (ics) => ics.replace(/\r\n /g, '');
const events = (ics) => unfold(ics).split('BEGIN:VEVENT').slice(1).map((e) => e.split('END:VEVENT')[0]);
const field = (event, name) => event.split('\r\n').find((l) => l.startsWith(`${name}:`) || l.startsWith(`${name};`));

test('calendar: one all-day event per day + one per timed activity, times in UTC (IST − 5:30)', () => {
  const { ics, eventCount } = buildTripCalendar(trip(), { uidBase: 'abc123', url: 'https://trip.example/share/xyz', now: new Date('2026-10-15T08:00:00Z') });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'every line ends with CRLF');
  const list = events(ics);
  assert.equal(eventCount, 5, '2 days + 3 timed activities (All day is not an event)');
  assert.equal(list.length, 5);

  const [day1, temple, lunch, day2, dinner] = list;
  assert.equal(field(day1, 'DTSTART'), 'DTSTART;VALUE=DATE:20261201');
  assert.equal(field(day1, 'DTEND'), 'DTEND;VALUE=DATE:20261202');
  assert.equal(field(day1, 'SUMMARY'), 'SUMMARY:Day 1: Old Manali (Manali)');
  assert.match(field(day1, 'DESCRIPTION'), /- All day: Local cab for the day/);
  assert.equal(field(temple, 'DTSTART'), 'DTSTART:20261201T033000Z', '09:00 IST');
  assert.equal(field(temple, 'DTEND'), 'DTEND:20261201T053000Z');
  assert.equal(field(temple, 'GEO'), 'GEO:32.2483;77.1814');
  assert.equal(field(temple, 'UID'), 'UID:abc123-d1-a1@tripplanner');
  assert.match(field(temple, 'DESCRIPTION'), /Tip: Go early\\, before 9\\nEstimated cost: ₹200 \(whole group\)/);
  assert.equal(field(lunch, 'DTEND'), 'DTEND:20261201T083000Z', '"Around 1 PM" = one hour');
  assert.equal(field(day2, 'DTSTART'), 'DTSTART;VALUE=DATE:20261202');
  assert.equal(field(dinner, 'DTSTART'), 'DTSTART:20261202T163000Z');
  assert.equal(field(dinner, 'DTEND'), 'DTEND:20261202T193000Z', 'past midnight ends the next day');
  assert.equal(field(dinner, 'URL'), 'URL:https://trip.example/share/xyz');
  assert.match(unfold(ics), /X-WR-CALNAME:Snow\\, cafés\\; and more/);
});

test('calendar: escaping, folding at 75 bytes without splitting ₹, days without a date are skipped', () => {
  assert.equal(icsText('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
  const long = `DESCRIPTION:${'₹'.repeat(40)}${'x'.repeat(100)}`;
  const folded = foldIcsLine(long);
  for (const line of folded.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, `${Buffer.byteLength(line)} bytes`);
  assert.equal(folded.replace(/\r\n /g, ''), long, 'unfolds to the same text');
  assert.ok(!folded.includes('�'));

  const undated = { ...trip(), days: trip().days.map((d) => ({ ...d, date: undefined })) };
  assert.equal(buildTripCalendar(undated).eventCount, 0);
});

test('share settings and long dates', () => {
  assert.deepEqual(ShareSettingsSchema.parse({ enabled: true }), { enabled: true, newLink: false });
  assert.equal(ShareSettingsSchema.safeParse({}).success, false);
  assert.equal(formatDateLong('2026-10-22'), 'Thu, 22 Oct 2026');
  assert.equal(formatDateLong('bad'), '');
});
