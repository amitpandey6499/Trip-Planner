/**
 * @tripplanner/shared — the contract between client and server.
 * Import everything from here:  import { TripPreferencesSchema, formatINR } from '@tripplanner/shared';
 */
export { projectInfo, collegeLabel } from './projectInfo.js';
export * from './constants.js';

export * from './utils/dates.js';
export * from './utils/budget.js';
export * from './utils/interests.js';

export * from './schemas/preferences.js';
export * from './schemas/itinerary.js';
export * from './schemas/trip.js';
export * from './schemas/auth.js';

export * from './validation.js';
export * from './itinerary/normalize.js';
