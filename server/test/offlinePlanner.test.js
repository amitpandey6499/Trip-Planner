import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, normalizeItinerary, todayIso, TripPreferencesSchema } from '@tripplanner/shared';
import { OFFLINE_DESTINATIONS, findOfflineDestination } from '../src/data/offlineDestinations.js';
import { OfflineUnsupportedError, planOffline } from '../src/services/ai/offlinePlanner.js';

const prefs = (input) =>
  TripPreferencesSchema.parse({ startDate: addDays(todayIso(), 10), totalBudget: 30000, travelersCount: 2, ...input });
const plan = (input) => {
  const p = prefs(input);
  return normalizeItinerary(planOffline(p), p, { expectDays: p.durationDays });
};
const toMinutes = (slot) => {
  const m = /^(\d{2}):(\d{2}) (AM|PM)/.exec(slot);
  if (!m) return null;
  return ((Number(m[1]) % 12) + (m[3] === 'PM' ? 12 : 0)) * 60 + Number(m[2]);
};

test('every destination × length × pace gives a valid plan with real place names', () => {
  for (const dest of OFFLINE_DESTINATIONS) {
    for (const durationDays of [1, 2, 4, 7, 14]) {
      for (const travelStyle of ['Relaxed', 'Balanced', 'Packed']) {
        const it = plan({ destination: dest.name, durationDays, travelStyle, interests: ['Adventure', 'History & Culture'] });
        assert.equal(it.days.length, durationDays);
        const known = new Set([...dest.places.map((p) => p.name)]);
        for (const day of it.days) {
          for (const a of day.activities) {
            assert.doesNotMatch(a.placeName, /Landmark \d|Scenic Point & Sunset Hub/, 'no invented names');
            if (a.category === 'Attraction' || (a.category === 'Activity' && !a.placeName.startsWith('Free time'))) {
              assert.ok(known.has(a.placeName), `${a.placeName} should be a curated place of ${dest.name}`);
            }
          }
          // times only move forward within a day
          const times = day.activities.map((a) => toMinutes(a.timeSlot)).filter((t) => t !== null);
          assert.deepEqual(times, [...times].sort((x, y) => x - y), `${dest.name} day ${day.dayNumber} times out of order`);
        }
      }
    }
  }
});

test('no sight is repeated within one trip', () => {
  const it = plan({ destination: 'Jaipur', durationDays: 5, travelStyle: 'Packed' });
  const sights = it.days.flatMap((d) => d.activities.filter((a) => a.category === 'Attraction').map((a) => a.placeName));
  assert.equal(new Set(sights).size, sights.length);
});

test('interests decide what comes first', () => {
  const beach = plan({ destination: 'Goa', durationDays: 2, interests: ['Beaches'] });
  const culture = plan({ destination: 'Goa', durationDays: 2, interests: ['History & Culture'] });
  const names = (it) => it.days.flatMap((d) => d.activities.map((a) => a.placeName)).join(' | ');
  assert.match(names(beach), /Beach/);
  assert.match(names(culture), /Basilica|Fort|Fontainhas/);
});

test('vegetarian / Jain diets only get pure-veg eateries where available', () => {
  for (const diet of ['Vegetarian', 'Jain']) {
    const it = plan({ destination: 'Jaipur', durationDays: 3, dietaryPreference: diet });
    const meals = it.days.flatMap((d) => d.activities.filter((a) => a.category === 'Restaurant' && !a.placeName.startsWith('Lunch on the way')));
    assert.ok(meals.length > 0);
    for (const meal of meals) assert.match(meal.placeName, /LMB|Rawat|Natraj|Laxmi/, `${diet}: ${meal.placeName}`);
    if (diet === 'Jain') assert.ok(meals.every((m) => /Jain/.test(m.tips)));
  }
});

test('budget tier picks the stay; costs scale with travelers', () => {
  const lux = plan({ destination: 'Udaipur', durationDays: 3, budgetCategory: 'Luxury', totalBudget: 90000 });
  assert.equal(lux.hotels[0].budgetTier, 'Luxury');
  const two = plan({ destination: 'Udaipur', durationDays: 3, travelersCount: 2 });
  const four = plan({ destination: 'Udaipur', durationDays: 3, travelersCount: 4 });
  assert.ok(four.budgetBreakdown.activitiesAndSightseeing > two.budgetBreakdown.activitiesAndSightseeing);
});

test('two-base trips include the transfer (Kerala, Andaman)', () => {
  const kerala = plan({ destination: 'Kerala (Munnar & Alleppey)', durationDays: 5 });
  assert.ok(kerala.days.some((d) => d.activities.some((a) => a.placeName === 'Drive Munnar → Alleppey')));
  const andaman = plan({ destination: 'Port Blair', durationDays: 4, travelersCount: 3 });
  const ferry = andaman.days.flatMap((d) => d.activities).find((a) => a.placeName.startsWith('Ferry'));
  assert.equal(ferry.cost, 1500 * 3, 'ferry is priced per person');
});

test('excursion days and dinner-included evenings are handled', () => {
  const manali = plan({ destination: 'Manali', durationDays: 4, interests: ['Adventure'] });
  assert.ok(manali.days.some((d) => d.activities.some((a) => a.placeName === 'Solang Valley & Atal Tunnel')));
  const jaipur = plan({ destination: 'Jaipur', durationDays: 6, travelStyle: 'Packed', interests: ['Food & Cuisine', 'Nightlife'] });
  const chokhiDay = jaipur.days.find((d) => d.activities.some((a) => a.placeName.startsWith('Chokhi Dhani')));
  assert.ok(chokhiDay, 'Chokhi Dhani planned for food/nightlife lovers');
  assert.ok(!chokhiDay.activities.some((a) => a.placeName.startsWith('Dinner')), 'no extra dinner on the Chokhi Dhani evening');
});

test('aliases and unknown places', () => {
  assert.equal(findOfflineDestination('Panjim').name, 'Goa');
  assert.equal(findOfflineDestination('Manali, Himachal Pradesh').name, 'Manali');
  assert.equal(findOfflineDestination('Banaras').name, 'Varanasi');
  assert.equal(findOfflineDestination('Shimla'), undefined);
  assert.throws(() => planOffline(prefs({ destination: 'Shimla', durationDays: 2 })), OfflineUnsupportedError);
});
