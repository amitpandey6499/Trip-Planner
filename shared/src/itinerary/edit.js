import { z } from 'zod';
import { ACTIVITY_CATEGORIES, LIMITS } from '../constants.js';
import { CoordinatesSchema, optionalText, requiredText } from '../schemas/common.js';
import { formatClock, formatTimeSlot, parseTimeSlot } from '../utils/time.js';
import { formatZodError } from '../validation.js';
import { normalizeItinerary } from './normalize.js';

/**
 * Part 12 — changing an itinerary by hand (and, from Part 13, by the AI chat: it proposes the same edits).
 *
 * Every function here is PURE: it returns a new itinerary and never changes the one it was given.
 * `applyEdit` checks an edit with ItineraryEditSchema, applies it and runs normalizeItinerary,
 * so the budget (day totals, breakdown, "over budget") always matches the plan.
 * Day routes are NOT touched: a changed day's stops no longer match its route signature,
 * so the map service makes a new route for exactly that day (Part 8).
 */

export class ItineraryEditError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ItineraryEditError';
    this.field = field;
  }
}

// ── input schemas (the editor form and the server / AI use the same rules) ─────────────────

const cost = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? 0 : typeof value === 'string' ? Number(value.replace(/[₹,\s]/g, '')) : value),
  z
    .number({ error: 'Cost must be a number.' })
    .refine(Number.isFinite, 'Cost must be a number.')
    .min(0, 'Cost cannot be negative.')
    .max(LIMITS.MAX_ACTIVITY_COST, `Cost can be at most ₹${LIMITS.MAX_ACTIVITY_COST.toLocaleString('en-IN')}.`)
    .transform(Math.round),
);

const activityFields = {
  placeName: requiredText('Place name', { max: 120 }),
  category: z.enum(ACTIVITY_CATEGORIES, { error: 'Please pick a type.' }),
  timeSlot: optionalText('Time', 40),
  estimatedDuration: optionalText('Duration', 40),
  description: optionalText('Description', 1000),
  cost,
  tips: optionalText('Tip', 500),
};

/**
 * A new activity typed by the user (or proposed by the AI chat).
 * `coordinates` only for a place whose position is known (an idea from the curated catalog);
 * otherwise the map service looks the place up by its name.
 */
export const ActivityInputSchema = z.object({
  ...activityFields,
  timeSlot: activityFields.timeSlot.default(''),
  description: activityFields.description.default(''),
  cost: activityFields.cost.default(0),
  estimatedDuration: activityFields.estimatedDuration.optional(),
  tips: activityFields.tips.optional(),
  coordinates: CoordinatesSchema.optional(),
});

/** Changes to an existing activity: any of the fields above. */
export const ActivityChangesSchema = z
  .object(activityFields)
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, 'Nothing to change.');

const dayNumber = z.number().int().min(1).max(LIMITS.MAX_TRIP_DAYS);
const activityId = z.string().trim().min(1).max(40);

export const ItineraryEditSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('move'), fromDay: dayNumber, activityId, toDay: dayNumber, toIndex: z.number().int().min(0).optional() }),
  z.object({ type: z.literal('add'), dayNumber, activity: ActivityInputSchema, index: z.number().int().min(0).optional() }),
  z.object({ type: z.literal('update'), dayNumber, activityId, changes: ActivityChangesSchema }),
  z.object({ type: z.literal('remove'), dayNumber, activityId }),
  z.object({
    type: z.literal('updateDay'),
    dayNumber,
    changes: z
      .object({ title: requiredText('Day title', { max: 120 }), description: optionalText('Day description', 500) })
      .partial()
      .refine((changes) => Object.keys(changes).length > 0, 'Nothing to change.'),
  }),
]);

// ── time helpers for one day's activity list ────────────────────────────────────────

const DEFAULT_LENGTH_MIN = 60; // "Around 01:00 PM" has no end: count it as an hour
const lengthOf = (slot) => Math.max(15, (slot.end ?? slot.start + DEFAULT_LENGTH_MIN) - slot.start);
const startOf = (activity) => parseTimeSlot(activity?.timeSlot)?.start ?? null;

/** Write a new start (keeping the activity's own length and the "Around ..." style). */
const withStart = (activity, start) => {
  const slot = parseTimeSlot(activity.timeSlot);
  if (!slot) return activity;
  const text = slot.end === null ? `${/^\s*around\b/i.test(activity.timeSlot) ? 'Around ' : ''}${formatClock(start)}` : formatTimeSlot(start, start + lengthOf(slot));
  return text === activity.timeSlot ? activity : { ...activity, timeSlot: text };
};

/**
 * Timed activities in time order; activities without a clock time ("All day", "Flexible") keep their place.
 * Stable: equal start times keep their order.
 */
export const sortActivitiesByTime = (activities) => {
  const timed = activities.map((a, i) => ({ a, i, start: startOf(a) })).filter((x) => x.start !== null);
  const sorted = [...timed].sort((x, y) => x.start - y.start || x.i - y.i);
  const out = [...activities];
  timed.forEach((slot, k) => {
    out[slot.i] = sorted[k].a;
  });
  return out;
};

/**
 * After the user dragged ONE activity to a new place in its day: new times that disturb the day as little as possible.
 * - moved up   → it takes the start of the activity it was dropped on (the first timed one after it);
 * - moved down → it starts when the activity now before it ends;
 * - the activities after it are pushed later only while they would overlap; everything else keeps its time.
 *   Hadimba 09:00–11:00, Lunch 13:00–14:00, Mall Road 15:00–17:00
 *   drag Mall Road to the top → Mall Road 09:00–11:00, Hadimba 11:00–13:00, Lunch 13:00–14:00 (unchanged)
 * Activities without a clock time ("All day") never get one.
 */
export const retimeAfterReorder = (before, after, movedId) => {
  const sameId = (a) => String(a.id) === String(movedId);
  const at = after.findIndex(sameId);
  const from = before.findIndex(sameId);
  const slot = at === -1 ? null : parseTimeSlot(after[at].timeSlot);
  if (!slot || from === -1 || from === at) return after;

  let start;
  if (at < from) {
    start = after.slice(at + 1).map(startOf).find((s) => s !== null) ?? slot.start;
  } else {
    const previous = after.slice(0, at).filter((a) => startOf(a) !== null).at(-1);
    start = previous ? startOf(previous) + lengthOf(parseTimeSlot(previous.timeSlot)) : slot.start;
  }
  const out = [...after];
  out[at] = withStart(after[at], start);
  let cursor = start + lengthOf(slot);
  for (let i = at + 1; i < out.length; i += 1) {
    const next = parseTimeSlot(out[i].timeSlot);
    if (!next) continue;
    if (next.start >= cursor) break; // free again: the rest of the day keeps its times
    out[i] = withStart(out[i], cursor);
    cursor += lengthOf(next);
  }
  return out;
};

/** Where an activity starting at `start` goes: before the first activity that starts later. */
const indexForTime = (activities, start) => {
  if (start === null) return activities.length;
  const later = activities.findIndex((a) => {
    const s = startOf(a);
    return s !== null && s > start;
  });
  return later === -1 ? activities.length : later;
};

/**
 * Activities whose time starts before an earlier one has ended: Map(activityId → { placeName, until }).
 * Shown as a gentle warning in the editor ("overlaps with Mall Road until 12:00 PM").
 */
export const timeOverlaps = (activities = []) => {
  const result = new Map();
  let latest = null; // { end, placeName }
  for (const activity of activities) {
    const slot = parseTimeSlot(activity.timeSlot);
    if (!slot) continue;
    if (latest && slot.start < latest.end) result.set(String(activity.id), { placeName: latest.placeName, until: formatClock(latest.end) });
    const end = slot.start + lengthOf(slot);
    if (!latest || end > latest.end) latest = { end, placeName: activity.placeName };
  }
  return result;
};

// ── the edits ──────────────────────────────────────────────────────────────────────

const findDay = (itinerary, number, field = 'dayNumber') => {
  const day = itinerary.days?.find((d) => d.dayNumber === number);
  if (!day) throw new ItineraryEditError(`Day ${number} is not part of this trip.`, field);
  return day;
};

const findActivity = (day, id) => {
  const index = day.activities.findIndex((a) => String(a.id) === String(id));
  if (index === -1) throw new ItineraryEditError(`That activity is not on Day ${day.dayNumber} any more.`, 'activityId');
  return index;
};

const withDays = (itinerary, changed) => ({
  ...itinerary,
  days: itinerary.days.map((day) => (changed.has(day.dayNumber) ? { ...day, activities: changed.get(day.dayNumber) } : day)),
});

const notEmpty = (day) => {
  if (day.activities.length <= 1) {
    throw new ItineraryEditError(`Day ${day.dayNumber} needs at least one activity. Add another one first, or change this one.`, 'activityId');
  }
};
const hasRoom = (day) => {
  if (day.activities.length >= LIMITS.MAX_ACTIVITIES_PER_DAY) {
    throw new ItineraryEditError(`Day ${day.dayNumber} already has ${LIMITS.MAX_ACTIVITIES_PER_DAY} activities, the most a day can have.`, 'dayNumber');
  }
};

/** An id no other activity in the trip has. */
export const newActivityId = (itinerary, random = Math.random) => {
  const taken = new Set(itinerary.days.flatMap((d) => d.activities.map((a) => String(a.id))));
  let id;
  do id = `u-${Math.floor(random() * 36 ** 6).toString(36).padStart(6, '0')}`;
  while (taken.has(id));
  return id;
};

/**
 * Move an activity: inside its day (toIndex = new position; the times follow the new order),
 * or to another day (at toIndex, else at its time; a day can not be left empty).
 */
export const moveActivity = (itinerary, { fromDay, activityId: id, toDay, toIndex }) => {
  const source = findDay(itinerary, fromDay, 'fromDay');
  const from = findActivity(source, id);
  if (fromDay === toDay) {
    const to = Math.min(Math.max(0, toIndex ?? from), source.activities.length - 1);
    if (to === from) return itinerary;
    const list = [...source.activities];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    return withDays(itinerary, new Map([[fromDay, retimeAfterReorder(source.activities, list, moved.id)]]));
  }
  const target = findDay(itinerary, toDay, 'toDay');
  notEmpty(source);
  hasRoom(target);
  const moved = source.activities[from];
  const list = [...target.activities];
  const at = toIndex === undefined ? indexForTime(list, startOf(moved)) : Math.min(Math.max(0, toIndex), list.length);
  list.splice(at, 0, moved);
  return withDays(
    itinerary,
    new Map([
      [fromDay, source.activities.filter((_, i) => i !== from)],
      [toDay, list],
    ]),
  );
};

/** Add an activity (validated input) at `index`, else at its time, else at the end of the day. */
export const addActivity = (itinerary, { dayNumber: number, activity, index, id }) => {
  const day = findDay(itinerary, number);
  hasRoom(day);
  // Positions come from the map service (Part 8): a new place is looked up by its name.
  const fresh = { ...activity, id: id ?? newActivityId(itinerary) };
  const list = [...day.activities];
  const at = index === undefined ? indexForTime(list, startOf(fresh)) : Math.min(Math.max(0, index), list.length);
  list.splice(at, 0, fresh);
  return withDays(itinerary, new Map([[number, list]]));
};

/**
 * Change an activity. A new place name drops the old position and photo (they belong to the old place);
 * a new time puts the activity at its place in the day.
 */
export const updateActivity = (itinerary, { dayNumber: number, activityId: id, changes }) => {
  const day = findDay(itinerary, number);
  const index = findActivity(day, id);
  const old = day.activities[index];
  const next = { ...old, ...changes };
  if (changes.placeName !== undefined && changes.placeName.trim() !== old.placeName) {
    delete next.coordinates;
    delete next.locationSource;
    delete next.imageUrl;
  }
  let list = day.activities.map((a, i) => (i === index ? next : a));
  if (changes.timeSlot !== undefined && changes.timeSlot !== old.timeSlot) list = sortActivitiesByTime(list);
  return withDays(itinerary, new Map([[number, list]]));
};

export const removeActivity = (itinerary, { dayNumber: number, activityId: id }) => {
  const day = findDay(itinerary, number);
  const index = findActivity(day, id);
  notEmpty(day);
  return withDays(itinerary, new Map([[number, day.activities.filter((_, i) => i !== index)]]));
};

export const updateDay = (itinerary, { dayNumber: number, changes }) => {
  findDay(itinerary, number);
  return { ...itinerary, days: itinerary.days.map((day) => (day.dayNumber === number ? { ...day, ...changes } : day)) };
};

const OPERATIONS = { move: moveActivity, add: addActivity, update: updateActivity, remove: removeActivity, updateDay };

/**
 * Check + apply one edit, then normalize (budget, ids) with the trip facts.
 *   applyEdit(itinerary, { type: 'move', fromDay: 1, activityId: 'd1-a3', toDay: 1, toIndex: 0 }, preferences)
 * Throws ItineraryEditError with a message for people (and `field`).
 */
export const applyEdit = (itinerary, edit, facts = {}) => {
  const parsed = ItineraryEditSchema.safeParse(edit);
  if (!parsed.success) {
    const { message, field } = formatZodError(parsed.error);
    throw new ItineraryEditError(message, field);
  }
  const { type, ...args } = parsed.data;
  const changed = OPERATIONS[type](itinerary, args);
  return changed === itinerary ? itinerary : normalizeItinerary(changed, facts);
};
