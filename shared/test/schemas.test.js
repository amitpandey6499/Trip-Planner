import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  todayIso,
  validate,
  validatePreferenceStep,
  TripPreferencesSchema,
  UpdateTripSchema,
  SaveTripSchema,
  RegisterSchema,
  LoginSchema,
  PREFERENCE_FIELD_STEP,
} from '../src/index.js';

const future = (days) => addDays(todayIso(), days);

test('preferences: valid input is filled with defaults and endDate/duration', () => {
  const r = validate(TripPreferencesSchema, { destination: ' Goa ', startDate: future(10), durationDays: '3', totalBudget: '20000' });
  assert.equal(r.success, true);
  assert.equal(r.data.destination, 'Goa');
  assert.equal(r.data.durationDays, 3);
  assert.equal(r.data.endDate, future(12));
  assert.equal(r.data.travelersCount, 2);
  assert.equal(r.data.budgetCategory, 'Moderate');
  assert.deepEqual(r.data.interests, []);
});

test('preferences: dates win over durationDays', () => {
  const r = validate(TripPreferencesSchema, { destination: 'Goa', startDate: future(5), endDate: future(9), durationDays: 2, totalBudget: 9000 });
  assert.equal(r.data.durationDays, 5);
});

test('preferences: clear messages for bad input', () => {
  const cases = [
    [{}, 'destination', 'Destination is required.'],
    [{ destination: '   ', startDate: future(3), totalBudget: 9000 }, 'destination', 'Destination is required.'],
    [{ destination: 'G', startDate: future(3), totalBudget: 9000 }, 'destination', 'Destination must be at least 2 characters.'],
    [{ destination: 'Goa', startDate: future(3), totalBudget: 'abc' }, 'totalBudget', 'Budget must be a number.'],
    [{ destination: 'Goa', startDate: future(3), totalBudget: 500 }, 'totalBudget', 'Budget must be at least ₹1,000.'],
    [{ destination: 'Goa', startDate: future(3), totalBudget: 9000, travelersCount: 0 }, 'travelersCount', 'At least 1 traveler is needed.'],
    [{ destination: 'Goa', startDate: '2026-02-30', totalBudget: 9000 }, 'startDate', 'Start date must be a valid date (YYYY-MM-DD).'],
    [{ destination: 'Goa', startDate: future(5), endDate: future(2), totalBudget: 9000 }, 'endDate', 'End date cannot be before start date.'],
    [{ destination: 'Goa', startDate: future(5), endDate: future(30), totalBudget: 9000 }, 'endDate', 'Trips can be at most 14 days long.'],
    [{ destination: 'Goa', startDate: future(-10), totalBudget: 9000 }, 'startDate', 'Start date cannot be in the past.'],
    [{ destination: 'Goa', startDate: future(3), totalBudget: 9000, interests: ['Mountains'] }, 'interests', 'Unknown interest selected.'],
  ];
  for (const [input, field, message] of cases) {
    const r = validate(TripPreferencesSchema, input);
    assert.equal(r.success, false, JSON.stringify(input));
    assert.equal(r.fields[field], message, `${field} for ${JSON.stringify(input)}`);
  }
});

test('preferences: yesterday is still allowed (time-zone grace)', () => {
  const r = validate(TripPreferencesSchema, { destination: 'Goa', startDate: future(-1), totalBudget: 9000 });
  assert.equal(r.success, true);
});

test('wizard steps validate only their own fields with the same messages', () => {
  const step1 = validatePreferenceStep(1, { destination: 'Goa', startDate: future(5), endDate: future(2) });
  assert.equal(step1.fields.endDate, 'End date cannot be before start date.');
  const step2 = validatePreferenceStep(2, { travelersCount: 2, totalBudget: '' });
  assert.equal(step2.fields.totalBudget, 'Budget is required.');
  assert.equal(validatePreferenceStep(3, { interests: ['Beaches'] }).success, true);
  assert.equal(PREFERENCE_FIELD_STEP.totalBudget, 2);
  assert.equal(PREFERENCE_FIELD_STEP.interests, 3);
});

test('update trip: only known fields survive, empty update rejected', () => {
  const r = validate(UpdateTripSchema, { title: 'New', userId: 'hacker', id: 'x' });
  assert.deepEqual(r.data, { title: 'New' });
  assert.equal(validate(UpdateTripSchema, { userId: 'hacker' }).message, 'Nothing to update.');
  assert.equal(validate(UpdateTripSchema, { startDate: '2026-12-10', endDate: '2026-12-01' }).fields.endDate, 'End date cannot be before start date.');
});

test('save trip requires destination and real dates', () => {
  assert.equal(validate(SaveTripSchema, { tripData: { destination: 'Goa' } }).success, false);
  const ok = validate(SaveTripSchema, {
    tripData: { destination: 'Goa', startDate: '2026-12-01', endDate: '2026-12-03', travelersCount: 2, totalBudget: 9000 },
  });
  assert.equal(ok.success, true);
});

test('auth schemas', () => {
  assert.equal(validate(RegisterSchema, { name: 'Rahul', email: 'RAHUL@Example.com ', password: 'secret123' }).data.email, 'rahul@example.com');
  assert.equal(validate(RegisterSchema, { name: 'Rahul', email: 'bad', password: 'secret123' }).fields.email, 'Please enter a valid email address.');
  assert.equal(validate(RegisterSchema, { name: 'Rahul', email: 'a@b.co', password: 'short1' }).fields.password, 'Password must be at least 8 characters.');
  assert.equal(validate(RegisterSchema, { name: 'Rahul', email: 'a@b.co', password: 'lettersonly' }).fields.password, 'Password must contain a number.');
  assert.equal(validate(LoginSchema, { email: 'a@b.co' }).fields.password, 'Password is required.');
});
