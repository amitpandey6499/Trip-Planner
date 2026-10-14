import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, calcDuration, daysBetween, defaultTripDates, formatDate, isValidIsoDate, tripPhase } from '../src/index.js';

test('isValidIsoDate accepts real dates only', () => {
  assert.equal(isValidIsoDate('2026-11-12'), true);
  assert.equal(isValidIsoDate('2028-02-29'), true, 'leap day');
  assert.equal(isValidIsoDate('2026-02-30'), false);
  assert.equal(isValidIsoDate('12-11-2026'), false);
  assert.equal(isValidIsoDate(''), false);
  assert.equal(isValidIsoDate(undefined), false);
});

test('date maths does not shift across months / years', () => {
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(daysBetween('2026-11-12', '2026-11-15'), 3);
  assert.equal(calcDuration('2026-11-12', '2026-11-15'), 4);
  assert.equal(calcDuration('2026-11-12', '2026-11-12'), 1);
});

test('tripPhase is calculated from dates', () => {
  assert.equal(tripPhase('2026-11-12', '2026-11-15', '2026-11-01'), 'Upcoming');
  assert.equal(tripPhase('2026-11-12', '2026-11-15', '2026-11-12'), 'Ongoing');
  assert.equal(tripPhase('2026-11-12', '2026-11-15', '2026-11-15'), 'Ongoing');
  assert.equal(tripPhase('2026-11-12', '2026-11-15', '2026-11-16'), 'Past');
  assert.equal(tripPhase('2026-11-12', null, '2026-11-13'), 'Past', 'missing end date = one-day trip');
});

test('defaultTripDates gives a 4-day trip one week ahead', () => {
  const { startDate, endDate } = defaultTripDates('2026-10-14');
  assert.equal(startDate, '2026-10-21');
  assert.equal(endDate, '2026-10-24');
});

test('formatDate is human readable', () => {
  assert.equal(formatDate('2026-11-12'), '12 Nov 2026');
  assert.equal(formatDate('bad'), '');
});
