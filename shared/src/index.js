/**
 * @tripplanner/shared — the contract between client and server.
 * Import everything from here:  import { TripPreferencesSchema, formatINR } from '@tripplanner/shared';
 */
export { projectInfo, collegeLabel } from './projectInfo.js';
export * from './constants.js';

export * from './utils/dates.js';
export * from './utils/budget.js';
export * from './utils/interests.js';
export * from './utils/destinations.js';
export * from './utils/map.js';
export * from './utils/links.js';
export * from './utils/weather.js';
export * from './utils/packing.js';
export * from './utils/time.js';
export * from './data/originCities.js';

export * from './schemas/preferences.js';
export * from './schemas/itinerary.js';
export * from './schemas/trip.js';
export * from './schemas/auth.js';
export * from './schemas/contact.js';
export * from './schemas/requests.js';

export * from './validation.js';
export * from './itinerary/normalize.js';
export * from './itinerary/edit.js';
