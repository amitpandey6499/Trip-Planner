import { OFFLINE_DESTINATION_NAMES, findOfflineDestination } from '../../data/offlineDestinations.js';

/**
 * OFFLINE PLANNER
 * Builds a real, sensible itinerary from curated places (data/offlineDestinations.js)
 * when Gemini is not configured or fails. No made-up place names.
 *
 * How it plans:
 *  1. Rank places by how many of the user's interests they match.
 *  2. Places per day depend on pace (Relaxed 2, Balanced 3, Packed 4); arrival, transfer
 *     and departure days get fewer.
 *  3. Whole-day excursions (Solang, Dudhsagar, Kumbhalgarh...) get a middle day of their own.
 *  4. Other places are grouped by neighbourhood (zone) and ordered morning → evening.
 *  5. Lunch and dinner come from curated eateries that match the diet (veg / Jain / vegan).
 *  6. Costs: entry fee × travelers, meals per person × tier factor, daily local transport.
 * The shared normalizeItinerary() then dates the days and adds up the budget.
 */

export class OfflineUnsupportedError extends Error {
  constructor(destination) {
    super(`The offline planner does not know "${destination}".`);
    this.name = 'OfflineUnsupportedError';
    this.supported = OFFLINE_DESTINATION_NAMES;
  }
}

export const isOfflineSupported = (destination) => Boolean(findOfflineDestination(destination));

/** Cover photo for known destinations (used for Gemini answers too). */
export const destinationImageFor = (destination) => findOfflineDestination(destination)?.image ?? null;

const PLACES_PER_DAY = { Relaxed: 2, Balanced: 3, Packed: 4 };
const MEAL_FACTOR = { Budget: 0.8, Moderate: 1, Luxury: 1.6 };
const BEST_ORDER = { morning: 0, any: 1, afternoon: 2, evening: 3 };
const VEG_DIETS = ['Vegetarian', 'Vegan', 'Jain'];
const STAY_LABEL = { Budget: 'Budget guesthouse', Moderate: 'Mid-range hotel', Luxury: 'Luxury hotel / resort' };
const STAY_AMENITIES = {
  Budget: ['Free WiFi', 'Hot water', 'Central location'],
  Moderate: ['Free WiFi', 'Breakfast included', 'Room service', 'Central location'],
  Luxury: ['Breakfast included', 'Pool / spa', 'Room service', 'Airport transfer'],
};
const TIERS = ['Budget', 'Moderate', 'Luxury'];

// ── time helpers (minutes since midnight) ────────────────────────────────
const clock = (minutes) => {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
};
const slot = (start, end) => `${clock(start)} - ${clock(end)}`;
const durationLabel = (hours) => (hours === 1 ? '1 hour' : `${hours} hours`);
const roundTo10 = (n) => Math.round(n / 10) * 10;
const groups = (travelers) => Math.max(1, Math.ceil(travelers / 4)); // one cab per 4 people

const pickTitle = (destName, days, interests) => {
  const theme = interests.includes('Adventure')
    ? 'Adventure'
    : interests.includes('Beaches')
      ? 'Beach Holiday'
      : interests.includes('Spiritual Places')
        ? 'Spiritual Journey'
        : interests.includes('History & Culture')
          ? 'Heritage Trip'
          : 'Getaway';
  return `${days}-Day ${destName} ${theme}`;
};

/** Which base (hub) each day belongs to. Two-base trips split the days roughly in half. */
const planHubs = (dest, days) => {
  if (dest.hubs.length === 1 || days < 3) return Array.from({ length: days }, () => dest.hubs[0]);
  const firstHubDays = Math.ceil(days / 2);
  return Array.from({ length: days }, (_, i) => (i < firstHubDays ? dest.hubs[0] : dest.hubs[1]));
};

/** Pick a lunch / dinner place: right hub, fits the diet, same zone if possible, not repeated too often. */
const makeEateryPicker = (dest, diet) => {
  const used = new Map();
  const wantsVeg = VEG_DIETS.includes(diet);
  const pick = (hubId, zone) => {
    const inHub = dest.eateries.filter((e) => e.hub === hubId || e.hub === 'main');
    const pool = (wantsVeg ? inHub.filter((e) => e.veg) : inHub).length ? (wantsVeg ? inHub.filter((e) => e.veg) : inHub) : inHub;
    const best = [...pool].sort((a, b) => {
      const usage = (used.get(a.name) ?? 0) - (used.get(b.name) ?? 0);
      if (usage !== 0) return usage;
      return Number(b.zone === zone) - Number(a.zone === zone);
    })[0];
    if (best) used.set(best.name, (used.get(best.name) ?? 0) + 1);
    return best;
  };
  // already used elsewhere in the trip → picked last
  pick.markUsed = (name) => used.set(name, (used.get(name) ?? 0) + 1);
  return pick;
};

const dietTip = (diet, eatery) => {
  if (diet === 'Jain') return 'Ask for Jain food (no onion, garlic or root vegetables).';
  if (diet === 'Vegan') return 'Ask for dishes without ghee, butter, curd or paneer.';
  if (diet === 'Halal') return 'Ask the staff whether the meat is halal.';
  if (diet === 'Vegetarian' && !eatery.veg) return 'Not a pure-veg place: ask for the vegetarian menu.';
  return eatery.generic ? 'Many local places serve this; pick a busy one.' : undefined;
};

/** Everything the planner derives from the preferences (shared by the full plan and "regenerate one day"). */
const buildContext = (prefs, { pace } = {}) => {
  const dest = findOfflineDestination(prefs.destination);
  if (!dest) throw new OfflineUnsupportedError(prefs.destination);

  const days = prefs.durationDays;
  const travelers = prefs.travelersCount;
  const tier = prefs.budgetCategory ?? 'Moderate';
  const diet = prefs.dietaryPreference ?? 'No Restrictions';
  const perDay = PLACES_PER_DAY[pace ?? prefs.travelStyle] ?? 3;
  const interests = prefs.interests ?? [];
  const interestSet = new Set(interests);

  // 1. Rank places (more matching interests first, curated order as tie-break).
  const ranked = dest.places
    .map((place, index) => ({ place, index, score: place.tags.filter((t) => interestSet.has(t)).length }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((x) => x.place);
  const zoneOrder = [...new Set(ranked.map((p) => `${p.hub}:${p.zone}`))];

  // 2. Day skeleton.
  const dayHubs = planHubs(dest, days);
  const dayInfo = dayHubs.map((hub, i) => ({
    hub,
    isFirst: i === 0,
    isLast: i === days - 1 && days > 1,
    isTransfer: i > 0 && dayHubs[i - 1].id !== hub.id,
    excursion: null,
    places: [],
  }));
  const capacityOf = (d) => Math.max(1, perDay - (d.isFirst ? 1 : 0) - (d.isLast ? 1 : 0) - (d.isTransfer ? 2 : 0));

  const mealCost = (eatery) => roundTo10((eatery.costForTwo / 2) * travelers * MEAL_FACTOR[tier]);
  const transportCost = dest.transportPerDay[tier] * groups(travelers);
  return { prefs, dest, days, travelers, tier, diet, interests, ranked, zoneOrder, dayHubs, dayInfo, capacityOf, mealCost, transportCost };
};

/** Step 3: choose the places (and whole-day excursions) of every day. */
const assignPlaces = ({ dest, dayInfo, ranked, zoneOrder, capacityOf }) => {
  for (const hub of dest.hubs) {
    const hubDays = dayInfo.filter((d) => d.hub.id === hub.id);
    if (hubDays.length === 0) continue;
    const middleDays = hubDays.filter((d) => !d.isFirst && !d.isLast && !d.isTransfer);
    const candidates = ranked.filter((p) => p.hub === hub.id || p.hub === 'main');

    const excursions = candidates.filter((p) => p.fullDay).slice(0, Math.ceil(middleDays.length / 2));
    excursions.forEach((place, i) => {
      middleDays[i].excursion = place;
    });

    const regularDays = hubDays.filter((d) => !d.excursion);
    const capacity = regularDays.reduce((sum, d) => sum + capacityOf(d), 0);
    const regular = candidates
      .filter((p) => !p.fullDay)
      .slice(0, capacity)
      .sort((a, b) => zoneOrder.indexOf(`${a.hub}:${a.zone}`) - zoneOrder.indexOf(`${b.hub}:${b.zone}`));

    let cursor = 0;
    for (const day of regularDays) {
      day.places = regular.slice(cursor, cursor + capacityOf(day)).sort((a, b) => BEST_ORDER[a.best] - BEST_ORDER[b.best]);
      cursor += day.places.length;
    }
  }
};

/** Positions in curated data are trusted (Part 8: the map does not look them up again). */
const curated = (place) => ({ ...place, locationSource: place.coordinates ? 'curated' : 'none' });

/** Step 4: the timeline of one day (activities with times, meals, travel and costs). */
const makeDayPlanner = (ctx, pickEatery) => {
  const { dest, travelers, tier, diet, mealCost, transportCost } = ctx;
  return (day, dayIndex) => {
    const { hub } = day;
    const activities = [];
    const add = (activity) => activities.push(activity);
    const at = (place) => (place?.lat ? { lat: place.lat, lng: place.lng } : { lat: hub.lat, lng: hub.lng });
    let t = day.excursion ? 8 * 60 : 9 * 60;
    let lunchDone = false;
    let dinnerDone = false;
    let lastZone = null;

    const addMeal = (kind, start) => {
      const eatery = pickEatery(hub.id, lastZone);
      if (!eatery) return start;
      const length = kind === 'Lunch' ? 60 : 90;
      add({
        placeName: eatery.generic ? `${kind}: ${eatery.name}` : `${kind} at ${eatery.name}`,
        timeSlot: slot(start, start + length),
        category: 'Restaurant',
        estimatedDuration: durationLabel(length / 60),
        description: `${eatery.cuisine}.`,
        cost: mealCost(eatery),
        tips: dietTip(diet, eatery),
        coordinates: at(eatery),
      });
      return start + length + 30;
    };

    if (day.isFirst) {
      t = 10 * 60;
      add({
        placeName: dest.arrival.name,
        timeSlot: slot(t, t + 60),
        category: 'Transit',
        estimatedDuration: '1 hour',
        description: `Reach ${hub.name}, check in near ${hub.stayArea} and freshen up.`,
        cost: dest.arrival.cost[tier] * groups(travelers),
        tips: 'Keep a copy of your ID and hotel booking on your phone.',
        coordinates: { lat: hub.lat, lng: hub.lng },
      });
      t += 90;
    }

    if (day.isTransfer && dest.hubTransfer) {
      const transfer = dest.hubTransfer;
      t = 8 * 60;
      add({
        placeName: transfer.name,
        timeSlot: slot(t, t + transfer.hours * 60),
        category: 'Transit',
        estimatedDuration: durationLabel(transfer.hours),
        description: `Check out and travel to ${hub.name}; check in near ${hub.stayArea}.`,
        cost: transfer.perPerson ? transfer.perPerson * travelers : transfer.cost[tier] * groups(travelers),
        tips: transfer.tips,
        coordinates: { lat: hub.lat, lng: hub.lng },
      });
      t += transfer.hours * 60 + 30;
    }

    add({
      placeName: day.excursion ? 'Full-day cab for the excursion' : 'Local travel for the day (cab / auto)',
      timeSlot: 'All day',
      category: 'Transit',
      estimatedDuration: day.excursion ? 'Full day' : 'As needed',
      description: day.excursion ? 'A private taxi for the whole day is the easiest way to do this trip.' : `Getting around ${hub.name} between the stops below.`,
      cost: day.excursion ? transportCost * 2 : transportCost,
      tips: tier === 'Budget' ? 'Shared autos and local buses are cheapest.' : 'Use app cabs or a hotel taxi.',
      coordinates: { lat: hub.lat, lng: hub.lng },
    });

    if (day.excursion) {
      const place = day.excursion;
      add({
        placeName: place.name,
        timeSlot: slot(t, t + place.hours * 60),
        category: place.category,
        estimatedDuration: durationLabel(place.hours),
        description: `${place.description} Lunch is on the way.`,
        cost: place.fee * travelers,
        tips: place.tips,
        coordinates: at(place),
      });
      lastZone = place.zone;
      const lunchEatery = pickEatery(hub.id, place.zone);
      add({
        placeName: 'Lunch on the way (local dhaba / café)',
        timeSlot: 'Around 01:00 PM',
        category: 'Restaurant',
        estimatedDuration: '1 hour',
        description: 'Simple local meal during the excursion.',
        cost: lunchEatery ? mealCost({ ...lunchEatery, costForTwo: Math.min(lunchEatery.costForTwo, 600) }) : 300 * travelers,
        tips: VEG_DIETS.includes(diet) ? 'Vegetarian thalis are easy to find on the way.' : undefined,
        coordinates: at(place),
      });
      lunchDone = true;
      t += place.hours * 60 + 60;
    }

    for (const place of day.places) {
      if (!lunchDone && (t >= 12.5 * 60 || place.best === 'evening')) {
        t = addMeal('Lunch', Math.max(t, 12.5 * 60));
        lunchDone = true;
      }
      if (place.best === 'evening') t = Math.max(t, 17 * 60);
      add({
        placeName: place.name,
        timeSlot: slot(t, t + place.hours * 60),
        category: place.category,
        estimatedDuration: durationLabel(place.hours),
        description: place.description,
        cost: place.fee * travelers,
        tips: place.tips,
        coordinates: at(place),
      });
      if (place.includesDinner) dinnerDone = true;
      lastZone = place.zone;
      t += place.hours * 60 + 30;
    }

    // Nothing left to see (very long trips): honest free time instead of invented places.
    if (!day.excursion && day.places.length === 0 && !day.isTransfer) {
      add({
        placeName: `Free time around ${hub.stayArea}`,
        timeSlot: slot(Math.max(t, 11 * 60), Math.max(t, 11 * 60) + 180),
        category: 'Activity',
        estimatedDuration: '3 hours',
        description: 'Relax, revisit a favourite spot, or explore local markets at your own pace.',
        cost: 0,
        tips: 'A slow day helps on longer trips.',
        coordinates: { lat: hub.lat, lng: hub.lng },
      });
      t = Math.max(t, 11 * 60) + 210;
    }

    if (!lunchDone) {
      t = addMeal('Lunch', Math.max(t, 13 * 60));
    }

    if (day.isLast) {
      const start = Math.max(t, 15 * 60);
      add({
        placeName: 'Check out & depart',
        timeSlot: slot(start, start + 60),
        category: 'Transit',
        estimatedDuration: '1 hour',
        description: 'Head to the airport, railway station or bus stand.',
        cost: dest.arrival.cost[tier] * groups(travelers),
        tips: 'Keep 2 hours spare for flights and 45 minutes for trains.',
        coordinates: { lat: hub.lat, lng: hub.lng },
      });
    } else if (!dinnerDone) {
      addMeal('Dinner', Math.max(t, 19.5 * 60));
    }

    const highlights = (day.excursion ? [day.excursion] : day.places).map((p) => p.name);
    const title = day.isFirst
      ? `Arrival${highlights[0] ? ` & ${highlights[0]}` : ''}`
      : day.isTransfer
        ? `Transfer to ${hub.name}${highlights[0] ? ` & ${highlights[0]}` : ''}`
        : day.isLast
          ? `${highlights[0] ?? 'Last Morning'} & Departure`
          : highlights.slice(0, 2).join(' & ') || `Free Day in ${hub.name}`;

    return {
      dayNumber: dayIndex + 1,
      title: title.length > 110 ? `${title.slice(0, 107)}...` : title,
      description: highlights.length ? `Today: ${highlights.join(', ')}.` : 'An easy day at your own pace.',
      activities: activities.map(curated),
    };
  };
};

/**
 * @param {object} prefs validated TripPreferences
 * @returns raw itinerary (run normalizeItinerary on it)
 */
export const planOffline = (prefs) => {
  const ctx = buildContext(prefs);
  const { dest, days, travelers, tier, diet, interests, dayHubs, dayInfo } = ctx;
  assignPlaces(ctx);
  const planDay = makeDayPlanner(ctx, makeEateryPicker(dest, diet));
  const itineraryDays = dayInfo.map(planDay);

  // 5. Stays (honest: area + typical price, not a made-up hotel name) and named eateries.
  const tiersInOrder = [tier, ...TIERS.filter((t) => t !== tier)];
  const usedHubs = [...new Map(dayHubs.map((h) => [h.id, h])).values()];
  const hotels = usedHubs.flatMap((hub, hubIndex) =>
    (hubIndex === 0 ? tiersInOrder : [tier]).map((t) => ({
      name: `${STAY_LABEL[t]} near ${hub.stayArea}`,
      pricePerNight: dest.stayPrices[t],
      budgetTier: t,
      amenities: STAY_AMENITIES[t],
      address: `${hub.stayArea}, ${dest.region}`,
      distance: 'Typical price per room per night (estimate)',
      coordinates: { lat: hub.lat, lng: hub.lng },
      locationSource: 'curated',
    })),
  );

  const usedHubIds = new Set(usedHubs.map((h) => h.id));
  const wantsVeg = VEG_DIETS.includes(diet);
  const restaurants = dest.eateries
    .filter((e) => !e.generic && (usedHubIds.has(e.hub) || e.hub === 'main'))
    .sort((a, b) => (wantsVeg ? Number(b.veg) - Number(a.veg) : 0))
    .slice(0, 6)
    .map((e) => ({
      name: e.name,
      cuisine: e.cuisine,
      costForTwo: e.costForTwo,
      dietaryTags: [e.veg ? 'Pure vegetarian' : 'Veg options available'],
      address: dest.hubs.find((h) => h.id === e.hub)?.name ?? dest.name,
      coordinates: { lat: e.lat, lng: e.lng },
      locationSource: 'curated',
    }));

  const pace = (prefs.travelStyle ?? 'Balanced').toLowerCase();
  const focus = interests.length ? ` focused on ${interests.slice(0, 3).join(', ').toLowerCase()}` : '';
  const summary =
    `A ${pace} ${days}-day plan for ${travelers} ${travelers === 1 ? 'traveler' : 'travelers'} in ${dest.region}${focus}. ` +
    `Built by the offline planner from curated places; all prices are estimates.${dest.note ? ` ${dest.note}` : ''}`;

  return {
    source: 'offline',
    destination: dest.name,
    title: pickTitle(dest.name, days, interests),
    summary,
    destinationImage: dest.image,
    budgetBreakdown: {}, // filled in by normalizeItinerary (computeBudget)
    days: itineraryDays,
    hotels,
    restaurants,
  };
};

/**
 * Part 9 — "Regenerate this day" without AI: a new plan for one day using curated places that are
 * not planned on any other day (and, if possible, not on this day either).
 *
 * @param {object} prefs      validated TripPreferences
 * @param {object} itinerary  current normalized itinerary
 * @param {number} dayNumber  1-based
 * @param {{ pace?: string }} options  a different pace just for this day
 * @returns {{ day: object, notice: string | null }}  raw day (normalizeItinerary dates it and adds up costs)
 */
export const replanOfflineDay = (prefs, itinerary, dayNumber, { pace } = {}) => {
  const ctx = buildContext(prefs, { pace });
  const index = dayNumber - 1;
  const day = ctx.dayInfo[index];
  if (!day) throw new Error(`Day ${dayNumber} is not part of this trip.`);

  const names = (d) => (d?.activities ?? []).map((a) => a.placeName);
  const elsewhere = new Set(itinerary.days.filter((_, i) => i !== index).flatMap(names));
  const today = new Set(names(itinerary.days[index]));
  // Eateries in "Lunch at X" / "Dinner: X" names.
  const mentions = (set, place) => [...set].some((name) => name === place.name || name.endsWith(` ${place.name}`) || name.endsWith(`: ${place.name}`));

  const nearby = ctx.ranked.filter((p) => (p.hub === day.hub.id || p.hub === 'main') && !mentions(elsewhere, p));
  const fresh = nearby.filter((p) => !mentions(today, p));
  const pool = fresh.length ? fresh : nearby;
  const middle = !day.isFirst && !day.isLast && !day.isTransfer;

  const wasExcursion = ctx.ranked.some((p) => p.fullDay && mentions(today, p));
  const excursions = pool.filter((p) => p.fullDay);
  const regular = pool.filter((p) => !p.fullDay);
  // A pace chosen for this day means "this many places": a whole-day excursion only when the user did not
  // ask for a pace and the day already was one (or nothing else is left).
  if (middle && excursions.length && (regular.length === 0 || (!pace && wasExcursion))) {
    day.excursion = excursions[0];
  } else {
    day.places = regular
      .slice(0, ctx.capacityOf(day))
      .sort((a, b) => ctx.zoneOrder.indexOf(`${a.hub}:${a.zone}`) - ctx.zoneOrder.indexOf(`${b.hub}:${b.zone}`))
      .sort((a, b) => BEST_ORDER[a.best] - BEST_ORDER[b.best]);
  }

  // Prefer eateries the rest of the trip does not use yet.
  const pickEatery = makeEateryPicker(ctx.dest, ctx.diet);
  for (const eatery of ctx.dest.eateries) if (mentions(elsewhere, eatery)) pickEatery.markUsed(eatery.name);

  const planned = makeDayPlanner(ctx, pickEatery)(day, index);
  const notice = fresh.length
    ? null
    : `No other places are left near ${day.hub.name} that are not already in your trip, so Day ${dayNumber} was rearranged instead.`;
  return { day: planned, notice };
};
