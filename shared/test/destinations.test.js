import test from 'node:test';
import assert from 'node:assert/strict';
import { OFFLINE_PLANNER_NAMES, POPULAR_DESTINATIONS, findOfflinePlannerDestination } from '../src/index.js';

test('offline planner destinations: names, aliases and unknown places', () => {
  assert.equal(OFFLINE_PLANNER_NAMES.length, 8);
  assert.equal(findOfflinePlannerDestination('Panjim').name, 'Goa');
  assert.equal(findOfflinePlannerDestination('  manali, Himachal Pradesh ').name, 'Manali');
  assert.equal(findOfflinePlannerDestination('Kerala (Munnar & Alleppey)').name, 'Kerala');
  assert.equal(findOfflinePlannerDestination('Banaras').name, 'Varanasi');
  assert.equal(findOfflinePlannerDestination('Shimla'), null);
  assert.equal(findOfflinePlannerDestination('Goan'), null, 'no partial-word matches');
  assert.equal(findOfflinePlannerDestination(''), null);
});

test('every suggested destination works without AI', () => {
  for (const d of POPULAR_DESTINATIONS) {
    assert.ok(findOfflinePlannerDestination(d.value), d.value);
    assert.ok(findOfflinePlannerDestination(d.label), d.label);
  }
});
