import { slugify } from './links.js';
import { isWetDay, weatherInfo } from './weather.js';

/**
 * Part 11 — packing list from the trip itself: its length, the weather for its dates, what is planned
 * (temples, treks, beaches...), the destination's terrain and notes, food preference and group size.
 * Pure function (same input → same list), so the checklist ids stay stable for saved ticks.
 *
 * @param {{ itinerary, preferences?, weather?: object[] | null, destination?: { terrain?: string[], notes?: string[] } | null }} input
 * @returns {{ groups: { id, title, items: { id, label, reason? }[] }[], basedOn: string[] }}
 */

const has = (text, pattern) => pattern.test(text);

export const buildPackingList = ({ itinerary, preferences = {}, weather = null, destination = null }) => {
  const days = itinerary?.durationDays ?? itinerary?.days?.length ?? 1;
  const travelers = itinerary?.travelersCount ?? preferences.travelersCount ?? 1;
  const terrain = new Set(destination?.terrain ?? []);
  const notes = (destination?.notes ?? []).join(' ');
  const interests = new Set(preferences.interests ?? []);
  const activities = (itinerary?.days ?? []).flatMap((d) => d.activities ?? []);
  const names = activities.map((a) => `${a.placeName} ${a.description ?? ''}`.toLowerCase()).join(' | ');
  const firstMatch = (pattern) => activities.find((a) => pattern.test(`${a.placeName} ${a.description ?? ''}`.toLowerCase()))?.placeName;

  const groups = [];
  const seen = new Set();
  const group = (id, title) => {
    const g = { id, title, items: [] };
    groups.push(g);
    return (label, reason) => {
      const itemId = slugify(label);
      if (seen.has(itemId)) return;
      seen.add(itemId);
      g.items.push(reason ? { id: itemId, label, reason } : { id: itemId, label });
    };
  };
  const basedOn = [`${days} ${days === 1 ? 'day' : 'days'}, ${travelers} ${travelers === 1 ? 'traveller' : 'travellers'}`];

  // ── essentials ───────────────────────────────────────────────────────────
  const essentials = group('essentials', 'Essentials');
  essentials('Government photo ID (Aadhaar / passport / driving licence)', 'Hotels and airports ask for it');
  essentials('Phone, charger and power bank');
  essentials('Tickets and hotel bookings (offline copy)');
  essentials('Some cash plus UPI / cards');
  essentials('Reusable water bottle');
  essentials('Small day backpack');
  essentials('Basic medicines and your own prescriptions');
  essentials('Hand sanitiser and tissues');

  // ── clothes & weather ────────────────────────────────────────────────────
  const clothes = group('clothes', 'Clothes & weather');
  const sets = Math.min(days, 7);
  clothes(`${sets} ${sets === 1 ? 'set' : 'sets'} of everyday clothes`, days > 7 ? `${days} days: plan one laundry stop` : `${days} ${days === 1 ? 'day' : 'days'}`);
  clothes('Sleepwear');
  clothes('Comfortable walking shoes', 'Most sightseeing is on foot');

  const w = Array.isArray(weather) ? weather.filter((d) => Number.isFinite(d?.tMax) && Number.isFinite(d?.tMin)) : [];
  if (w.length) {
    const minT = Math.round(Math.min(...w.map((d) => d.tMin)));
    const maxT = Math.round(Math.max(...w.map((d) => d.tMax)));
    const wetDays = w.filter(isWetDay).length;
    const snow = w.some((d) => weatherInfo(d.code).icon === 'snow') || minT <= 0;
    basedOn.push(`weather ${minT}–${maxT}°C${wetDays ? `, rain on ${wetDays} ${wetDays === 1 ? 'day' : 'days'}` : ''}`);
    if (minT <= 5) {
      clothes('Thermal innerwear', `Nights around ${minT}°C`);
      clothes('Heavy jacket (down / padded)', `Nights around ${minT}°C`);
      clothes('Woollen cap, gloves and warm socks', `Nights around ${minT}°C`);
    } else if (minT <= 14) {
      clothes('Warm jacket or fleece', `Evenings around ${minT}°C`);
    }
    if (maxT >= 32) {
      clothes('Light cotton clothes', `Days up to ${maxT}°C`);
      clothes('Sun hat or cap', `Days up to ${maxT}°C`);
      clothes('ORS sachets', `Days up to ${maxT}°C — stay hydrated`);
    }
    if (maxT >= 28) clothes('Sunscreen (SPF 50) and sunglasses', `Days up to ${maxT}°C`);
    if (wetDays) {
      const reason = `Rain likely on ${wetDays} ${wetDays === 1 ? 'day' : 'days'}`;
      clothes('Umbrella or raincoat', reason);
      clothes('Waterproof pouch for phone and documents', reason);
      clothes('Quick-dry clothes and a spare pair of footwear', reason);
    }
    if (snow) clothes('Waterproof shoes with good grip', 'Snow or ice is possible');
  } else {
    basedOn.push('weather not loaded yet');
    if (terrain.has('cold') || terrain.has('mountain')) clothes('Warm jacket or fleece', 'Hill destination: evenings get cold');
    if (terrain.has('hot')) clothes('Light cotton clothes', 'Usually hot here');
    if (terrain.has('rainy') || terrain.has('humid')) clothes('Umbrella or raincoat', 'Sudden showers are common here');
  }

  // ── what is planned ──────────────────────────────────────────────────────
  const planned = group('activities', 'For what you have planned');
  const found = [];
  if (terrain.has('beach') || has(names, /\bbeach|\bsnorkel|\bscuba|\bisland/)) {
    found.push('beaches');
    const where = firstMatch(/beach/) ?? 'Beach days';
    planned('Swimwear', where);
    planned('Flip-flops', where);
    planned('Quick-dry towel', where);
    planned('Sunscreen (SPF 50) and sunglasses', where);
  }
  if (has(names, /\btrek|\bhike|\btrail\b|waterfall|\bfalls\b|\bpeak\b|\bpass\b|root bridge|steps/)) {
    found.push('treks / walks');
    const where = firstMatch(/trek|hike|trail|waterfall|falls|peak|pass|root bridge|steps/);
    planned('Trekking shoes with good grip', where);
    planned('Energy snacks and electrolytes', where);
  }
  if (terrain.has('temples') || has(names, /temple|ghat|gurudwara|harmandir|mosque|masjid|church|monastery|dargah|ashram|aarti|mandir/)) {
    found.push('temples');
    const where = firstMatch(/temple|ghat|gurudwara|harmandir|mosque|masjid|church|monastery|dargah|ashram|aarti|mandir/) ?? 'Temple visits';
    planned('Modest clothes (shoulders and knees covered)', where);
    planned('Scarf or stole (head cover where needed)', where);
    planned('Socks for hot / cold temple floors (shoes come off)', where);
  }
  if (has(names, /raft|kayak|snorkel|scuba|parasail|jet ski|boat ride|houseboat|cruise/)) {
    found.push('water activities');
    planned('A set of clothes that can get wet, plus a dry change', firstMatch(/raft|kayak|snorkel|scuba|parasail|jet ski|boat|cruise/));
  }
  if (terrain.has('desert') || has(names, /desert|dunes|camel/)) {
    found.push('desert');
    planned('Scarf for sand and sun', firstMatch(/desert|dunes|camel/) ?? 'Desert area');
    planned('Lip balm', 'Dry air');
  }
  if (terrain.has('high-altitude')) {
    found.push('high altitude');
    planned('Altitude sickness medicine (ask your doctor first)', 'Above 3,000 m');
    planned('Lip balm and moisturiser', 'Dry, thin air');
    planned('Sunscreen (SPF 50) and sunglasses', 'Strong sun at altitude');
  }
  if (has(names, /safari|national park|wildlife|sanctuary|tiger reserve/) || interests.has('Wildlife')) {
    found.push('wildlife');
    planned('Neutral-coloured clothes', firstMatch(/safari|national park|wildlife|sanctuary|tiger reserve/) ?? 'Wildlife');
    planned('Binoculars (optional)');
  }
  if (interests.has('Photography')) planned('Camera and a spare memory card', 'You like photography');
  if (interests.has('Nightlife')) planned('One smart outfit for evenings', 'You like nightlife');
  if (found.length) basedOn.push(`plan: ${found.join(', ')}`);

  // ── documents & money ────────────────────────────────────────────────────
  const docs = group('documents', 'Documents & money');
  if (/permit|ILP/i.test(notes)) docs('Permit copies (printed and on phone)', 'Needed for this area');
  if (/ATM|cash/i.test(notes) || terrain.has('remote') || terrain.has('island')) docs('Extra cash', 'Few ATMs / weak network here');
  docs('Emergency contacts written down', 'In case your phone dies');

  // ── food & group ─────────────────────────────────────────────────────────
  const extras = group('extras', 'Food & group');
  const diet = preferences.dietaryPreference;
  if (diet === 'Jain' || diet === 'Vegan') extras('Your own snacks for the journey', `${diet} options can be limited on the road`);
  if (travelers >= 2) {
    extras('Shared first-aid kit', `${travelers} travellers`);
    extras('Multi-plug / extension board', 'One room, many chargers');
  }

  return { groups: groups.filter((g) => g.items.length), basedOn };
};
