import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ItineraryEditError,
  LIMITS,
  applyEdit,
  estimateRoute,
  fromTimeInput,
  mapStops,
  needsMapUpdate,
  normalizeItinerary,
  parseTimeSlot,
  routeSignature,
  sortActivitiesByTime,
  timeOverlaps,
  toTimeInput,
  validate,
  ActivityInputSchema,
} from '../src/index.js';

const FACTS = { startDate: '2026-12-01', endDate: '2026-12-02', durationDays: 2, travelersCount: 2, totalBudget: 6000, budgetCategory: 'Moderate' };
const act = (placeName, timeSlot, category, cost, lat) => ({
  placeName,
  timeSlot,
  category,
  cost,
  description: '',
  ...(lat && { coordinates: { lat, lng: 77.18 }, locationSource: 'curated' }),
});

const makeTrip = () => {
  const it = normalizeItinerary(
    {
      destination: 'Manali',
      title: '2 days in Manali',
      source: 'offline',
      budgetBreakdown: {},
      days: [
        {
          title: 'Old Manali',
          activities: [
            act('Hadimba Temple', '09:00 AM - 11:00 AM', 'Attraction', 200, 32.24),
            act('Lunch at Cafe 1947', '01:00 PM - 02:00 PM', 'Restaurant', 800, 32.25),
            act('Mall Road', '03:00 PM - 05:00 PM', 'Shopping', 500, 32.26),
          ],
        },
        { title: 'Solang', activities: [act('Solang Valley', '10:00 AM - 01:00 PM', 'Activity', 1500, 32.31), act('Local cab for the day', 'All day', 'Transit', 1200)] },
      ],
    },
    FACTS,
  );
  for (const day of it.days) day.route = estimateRoute(mapStops(day));
  return it;
};
const names = (day) => day.activities.map((a) => a.placeName);
const slots = (day) => day.activities.map((a) => a.timeSlot);
const edit = (it, e) => applyEdit(it, e, FACTS);

test('time slots: read, write, time inputs', () => {
  assert.deepEqual(parseTimeSlot('09:00 AM - 11:00 AM'), { start: 540, end: 660 });
  assert.deepEqual(parseTimeSlot('Around 01:00 PM'), { start: 780, end: null });
  assert.deepEqual(parseTimeSlot('10:30 - 11:30 AM'), { start: 630, end: 690 });
  assert.deepEqual(parseTimeSlot('10:00 PM - 01:00 AM'), { start: 1320, end: 1500 });
  assert.equal(parseTimeSlot('All day'), null);
  assert.equal(parseTimeSlot('2 hours'), null, 'a bare number is not a time');
  assert.equal(toTimeInput(570), '09:30');
  assert.equal(fromTimeInput('13:05'), 785);
  assert.equal(fromTimeInput(''), null);
});

test('drag inside a day: new order, the moved one takes its new place in time, nothing else changes', () => {
  const it = makeTrip();
  const before = structuredClone(it);
  const next = edit(it, { type: 'move', fromDay: 1, activityId: 'd1-a3', toDay: 1, toIndex: 0 });
  assert.deepEqual(names(next.days[0]), ['Mall Road', 'Hadimba Temple', 'Lunch at Cafe 1947']);
  assert.deepEqual(slots(next.days[0]), ['09:00 AM - 11:00 AM', '11:00 AM - 01:00 PM', '01:00 PM - 02:00 PM'], 'Hadimba pushed, lunch keeps its time');
  assert.deepEqual(it, before, 'the given itinerary is not changed');
  assert.equal(next.days[0].estimatedDailyExpense, 1500);
  assert.deepEqual(next.days[1], it.days[1], 'other days are unchanged');
  assert.equal(needsMapUpdate(next), true, 'day 1 stops changed → its route is out of date');
  assert.notEqual(next.days[0].route.signature, routeSignature(mapStops(next.days[0])));
  assert.equal(next.days[1].route.signature, routeSignature(mapStops(next.days[1])), 'day 2 keeps its route');
  assert.equal(edit(it, { type: 'move', fromDay: 1, activityId: 'd1-a1', toDay: 1, toIndex: 0 }), it, 'no move → same object');
});

test('drag down / into the middle: only what would overlap is pushed later', () => {
  const it = makeTrip();
  const down = edit(it, { type: 'move', fromDay: 1, activityId: 'd1-a1', toDay: 1, toIndex: 2 });
  assert.deepEqual(names(down.days[0]), ['Lunch at Cafe 1947', 'Mall Road', 'Hadimba Temple']);
  assert.deepEqual(slots(down.days[0]), ['01:00 PM - 02:00 PM', '03:00 PM - 05:00 PM', '05:00 PM - 07:00 PM'], 'starts when Mall Road ends');
  const middle = edit(it, { type: 'move', fromDay: 1, activityId: 'd1-a3', toDay: 1, toIndex: 1 });
  assert.deepEqual(slots(middle.days[0]), ['09:00 AM - 11:00 AM', '01:00 PM - 03:00 PM', '03:00 PM - 04:00 PM']);

  // A full-day trip: lunch dragged to the top must not push dinner (it did not overlap anything).
  const day = normalizeItinerary(
    {
      destination: 'Manali',
      days: [
        {
          title: 'Solang',
          activities: [
            act('Cab for the day', 'All day', 'Transit', 3000),
            act('Solang Valley', '08:00 AM - 03:00 PM', 'Activity', 3000),
            act('Lunch on the way', 'Around 01:00 PM', 'Restaurant', 600),
            act('Dinner at Chopsticks', '07:30 PM - 09:00 PM', 'Restaurant', 700),
          ],
        },
      ],
    },
    { ...FACTS, endDate: FACTS.startDate, durationDays: 1 },
  );
  const lunchFirst = edit(day, { type: 'move', fromDay: 1, activityId: 'd1-a3', toDay: 1, toIndex: 0 });
  assert.deepEqual(slots(lunchFirst.days[0]), ['Around 08:00 AM', 'All day', '09:00 AM - 04:00 PM', '07:30 PM - 09:00 PM']);
  const cabLast = edit(day, { type: 'move', fromDay: 1, activityId: 'd1-a1', toDay: 1, toIndex: 3 });
  assert.deepEqual(slots(cabLast.days[0]), slots(day.days[0]).slice(1).concat('All day'), 'an untimed activity changes no times');
});

test('move to another day: placed at its time, both day totals and the budget follow', () => {
  const it = makeTrip();
  const next = edit(it, { type: 'move', fromDay: 1, activityId: 'd1-a2', toDay: 2 });
  assert.deepEqual(names(next.days[0]), ['Hadimba Temple', 'Mall Road']);
  assert.deepEqual(names(next.days[1]), ['Solang Valley', 'Local cab for the day', 'Lunch at Cafe 1947']);
  assert.equal(next.days[0].estimatedDailyExpense, 700);
  assert.equal(next.days[1].estimatedDailyExpense, 3500);
  assert.equal(next.estimatedTotal, it.estimatedTotal);
  const atTop = edit(it, { type: 'move', fromDay: 1, activityId: 'd1-a2', toDay: 2, toIndex: 0 });
  assert.equal(atTop.days[1].activities[0].placeName, 'Lunch at Cafe 1947');
  assert.deepEqual(next.days[1].activities.at(-1).coordinates, it.days[0].activities[1].coordinates, 'a moved place keeps its position');
});

test('a day can never become empty or too full', () => {
  const it = makeTrip();
  const single = edit(edit(it, { type: 'remove', dayNumber: 1, activityId: 'd1-a1' }), { type: 'remove', dayNumber: 1, activityId: 'd1-a2' });
  assert.throws(() => edit(single, { type: 'remove', dayNumber: 1, activityId: 'd1-a3' }), (err) => err instanceof ItineraryEditError && /Day 1 needs at least one activity/.test(err.message));
  assert.throws(() => edit(single, { type: 'move', fromDay: 1, activityId: 'd1-a3', toDay: 2 }), /needs at least one activity/);

  let full = it;
  for (let i = full.days[1].activities.length; i < LIMITS.MAX_ACTIVITIES_PER_DAY; i += 1) {
    full = edit(full, { type: 'add', dayNumber: 2, activity: { placeName: `Stop ${i}`, category: 'Attraction' } });
  }
  assert.equal(full.days[1].activities.length, LIMITS.MAX_ACTIVITIES_PER_DAY);
  assert.throws(() => edit(full, { type: 'add', dayNumber: 2, activity: { placeName: 'One more', category: 'Attraction' } }), /already has 15 activities/);
  assert.throws(() => edit(full, { type: 'move', fromDay: 1, activityId: 'd1-a1', toDay: 2 }), /already has 15/);
});

test('add: checked like the form, goes to its time, new id, no position (the map looks it up)', () => {
  const it = makeTrip();
  const next = edit(it, {
    type: 'add',
    dayNumber: 1,
    activity: { placeName: '  Vashisht Hot Springs ', category: 'Attraction', timeSlot: '11:30 AM - 12:30 PM', cost: '₹1,000' },
  });
  const added = next.days[0].activities[1];
  assert.equal(added.placeName, 'Vashisht Hot Springs');
  assert.equal(added.cost, 1000);
  assert.match(added.id, /^u-[0-9a-z]{6}$/);
  assert.equal(added.coordinates, undefined);
  assert.equal(added.locationSource, undefined);
  assert.equal(next.days[0].estimatedDailyExpense, 2500);
  assert.equal(next.estimatedTotal, it.estimatedTotal + 1000);
  assert.equal(needsMapUpdate(next), true);

  const flexible = edit(it, { type: 'add', dayNumber: 2, activity: { placeName: 'Café hopping', category: 'Restaurant' } });
  assert.equal(flexible.days[1].activities.at(-1).placeName, 'Café hopping', 'no time → end of the day');
  assert.equal(flexible.days[1].activities.at(-1).timeSlot, '');

  assert.throws(
    () => edit(it, { type: 'add', dayNumber: 1, activity: { placeName: '  ', category: 'Attraction' } }),
    (err) => err instanceof ItineraryEditError && err.message === 'Place name is required.' && err.field === 'activity.placeName',
  );
  assert.throws(() => edit(it, { type: 'add', dayNumber: 1, activity: { placeName: 'X place', category: 'Attraction', cost: -5 } }), /Cost cannot be negative/);
  assert.throws(() => edit(it, { type: 'add', dayNumber: 3, activity: { placeName: 'Somewhere', category: 'Attraction' } }), /Day 3 is not part of this trip/);
  assert.equal(validate(ActivityInputSchema, { placeName: 'Jogini Falls', category: 'Hike' }).fields.category, 'Please pick a type.');

  // An idea from the curated catalog brings its known position (no lookup needed); a bad position is refused.
  const known = edit(it, { type: 'add', dayNumber: 2, activity: { placeName: 'Naggar Castle', category: 'Attraction', coordinates: { lat: 32.1137, lng: 77.1696 } } });
  assert.deepEqual(known.days[1].activities.at(-1).coordinates, { lat: 32.1137, lng: 77.1696 });
  assert.throws(() => edit(it, { type: 'add', dayNumber: 2, activity: { placeName: 'Nowhere', category: 'Attraction', coordinates: { lat: 123, lng: 0 } } }), ItineraryEditError);
});

test('update: cost → budget; new name → old position dropped; new time → sorted into the day', () => {
  const it = makeTrip();
  const pricier = edit(it, { type: 'update', dayNumber: 1, activityId: 'd1-a1', changes: { cost: 5200 } });
  assert.equal(pricier.days[0].estimatedDailyExpense, 6500);
  assert.equal(pricier.withinBudget, false, 'over the ₹6,000 budget now');
  assert.equal(pricier.days[0].activities[0].coordinates.lat, 32.24, 'same place keeps its position');

  const renamed = edit(it, { type: 'update', dayNumber: 1, activityId: 'd1-a3', changes: { placeName: 'Jogini Waterfall' } });
  const place = renamed.days[0].activities[2];
  assert.equal(place.placeName, 'Jogini Waterfall');
  assert.equal(place.coordinates, undefined);
  assert.equal(place.locationSource, undefined);
  assert.equal(place.id, 'd1-a3', 'same id');

  const earlier = edit(it, { type: 'update', dayNumber: 1, activityId: 'd1-a3', changes: { timeSlot: '07:00 AM - 08:30 AM' } });
  assert.deepEqual(names(earlier.days[0]), ['Mall Road', 'Hadimba Temple', 'Lunch at Cafe 1947']);
  assert.throws(() => edit(it, { type: 'update', dayNumber: 1, activityId: 'nope', changes: { cost: 1 } }), /not on Day 1 any more/);
  assert.throws(() => edit(it, { type: 'update', dayNumber: 1, activityId: 'd1-a1', changes: {} }), /Nothing to change/);
});

test('day title and description', () => {
  const next = edit(makeTrip(), { type: 'updateDay', dayNumber: 2, changes: { title: 'Snow day', description: 'Solang and back' } });
  assert.equal(next.days[1].title, 'Snow day');
  assert.equal(next.days[1].description, 'Solang and back');
  assert.throws(() => edit(makeTrip(), { type: 'updateDay', dayNumber: 2, changes: { title: '' } }), /Day title is required/);
});

test('time order: untimed activities keep their place; overlaps are found', () => {
  const list = [
    { id: 'a', placeName: 'Arrival', timeSlot: 'All day' },
    { id: 'b', placeName: 'Fort', timeSlot: '02:00 PM - 04:00 PM' },
    { id: 'c', placeName: 'Breakfast', timeSlot: '08:00 AM - 09:00 AM' },
    { id: 'd', placeName: 'Market', timeSlot: '03:30 PM - 05:00 PM' },
  ];
  assert.deepEqual(
    sortActivitiesByTime(list).map((a) => a.id),
    ['a', 'c', 'b', 'd'],
  );
  const overlaps = timeOverlaps(sortActivitiesByTime(list));
  assert.deepEqual([...overlaps.keys()], ['d']);
  assert.deepEqual(overlaps.get('d'), { placeName: 'Fort', until: '04:00 PM' });
});
