# Data contracts (Part 2)

Client aur server **ek hi** definition use karte hain: `shared/src/`. Shape badalni ho to pehle yahan badlo,
phir `npm run check` batayega kaun si jagah toot rahi hai.

```js
import { TripPreferencesSchema, normalizeItinerary, formatINR, tripPhase } from '@tripplanner/shared';
```

## Conventions
| Cheez | Rule |
| --- | --- |
| Date | `'YYYY-MM-DD'` string (calendar date, no time). Maths UTC mein (`utils/dates.js`), isliye time-zone se din shift nahi hota. |
| Money | Whole rupees (INR), **poore group ka total** (per person nahi). `formatINR(150000)` → `₹1,50,000`. |
| Trip phase | `Upcoming / Ongoing / Past` — dates se **calculate** hota hai (`tripPhase`), DB mein store nahi hota. |
| Errors | `{ success: false, error: 'pehla message', details: { field, fields: { name: message } } }` + sahi HTTP status. |
| Itinerary source | `gemini` (AI) / `sample` (demo trip) / `offline` (offline planner) → UI badge `ITINERARY_SOURCES` se. |

## Schemas (`shared/src/schemas/`)
| Schema | Kahan use hota hai |
| --- | --- |
| `TripPreferencesSchema` | Wizard + Quick search (client), `POST /api/trips/generate` (server). Output mein `durationDays` aur `endDate` hamesha hote hain. |
| `WhereWhenSchema`, `WhoBudgetSchema`, `StyleSchema` | Wizard step 1/2/3 alag-alag validate (`validatePreferenceStep`). |
| `ItinerarySchema` | AI / sample output, saved itinerary, client rendering. Details mein tolerant (galat cost → 0, galat URL hata do), structure mein strict. |
| `SaveTripSchema` | `POST /api/trips` → `{ tripData, itinerary }` |
| `UpdateTripSchema` | `PUT /api/trips/:id` — sirf title, dates, travelers, budget, budgetCategory. Baaki fields ignore. |
| `RegisterSchema`, `LoginSchema` | `POST /api/auth/register`, `/login` + Login page. Password: 8–72 chars, ek letter, ek number. |
| `ContactSchema` | Contact page + `POST /api/contact`. |
| `SaveTripSchema.preferences` | interests / pace / stay / diet / notes trip ke saath save hote hain (Edit ke liye). |

## Budget hamesha kaise add up hota hai (`computeBudget`)
1. Har activity ka `cost` uske category bucket mein jaata hai: Restaurant → food, Transit → transport, Attraction/Activity/Shopping → activities.
2. Din ka `estimatedDailyExpense` = us din ki activities ka sum.
3. `accommodation` = di gayi stay cost, warna `pehle hotel ka price × nights × rooms` (2 log per room).
4. `totalEstimated` = chaaron buckets ka sum = accommodation + saare dino ka sum.
5. `withinBudget` = estimate ≤ user ka budget.

`normalizeItinerary(raw, preferences)` ye sab karta hai, dino ko 1..N number aur dates deta hai, ids lagata hai.
Ise do baar chalao to result same rehta hai (save karte waqt server dobara chalata hai).

## Optional fields
`originCity` (preferences, Part 11: "Starting from") · `language` (preferences, Part 16 mein use hoga).
Mausam, packing list aur "how to reach" **itinerary mein save nahi hote** (ye roz badalte hain) — har baar server se aate hain (Part 11, neeche).
Trip pe sirf `packingChecked` (ticks) save hota hai. Purane saved trips valid rehte hain.

## Login (Part 4)
- Session = JWT (HS256, `sub` = user id) in **httpOnly** cookie `tp_session`. Client kabhi token nahi dekhta / store karta.
- Client start pe `GET /api/auth/me` poochta hai; koi bhi API 401 de to client user ko logged-out maan leta hai.
- `req.user` (server) = `{ id, name, email, role, avatarUrl, isDemo, createdAt }` — kabhi password hash nahi.
- Har trip query = `{ _id, owner: req.user.id }`. Doosre user ka trip "nahi mila" (404) hota hai, "forbidden" nahi — taaki pata bhi na chale ki wo id exist karti hai.

## AI generation (Part 6)
`POST /api/trips/generate` (`?fresh=1` = cache skip) ka jawab:
```js
{
  success: true,
  data: Itinerary,            // hamesha normalizeItinerary se guzra hua (AI ho ya offline)
  preferences: TripPreferences, // validated (endDate / durationDays filled)
  meta: {
    source: 'gemini' | 'offline',
    cached: boolean,          // AiCache se aaya (Gemini call nahi hua, daily limit mein count nahi)
    notice: string | null,    // offline kyun hua: "You have used all 20 AI plans for today, so ..."
    ai: { used, limit, left } | null, // null = Gemini key set nahi
  },
}
```
- Gemini ko `responseJsonSchema` (`server/src/services/ai/prompt.js`, Part 2 ke ItinerarySchema se match) diya jaata hai; jawab phir bhi
  `normalizeItinerary(..., { expectDays })` se check hota hai. Galat → **1 retry** (reason ke saath), phir offline planner.
- Itinerary pe optional `source`, `model`, `generatedAt` (`gemini` wale plans pe).
- Errors: `422` destination offline planner mein nahi aur key bhi nahi (`details.supported` = list) · `503` Gemini fail + destination offline mein nahi · `429` daily limit khatam + destination offline mein nahi.
- Daily limit: `AiUsage` (user + din). Cache: `AiCache` (key = preferences + model ka hash, TTL `AI_CACHE_DAYS`).

## Trip URLs + draft (Part 5)
- `/trips/:id` hamesha server se load (`GET /api/trips/:id`); same id pehle se open ho to dobara load nahi (unsaved changes bachte hain).
- Draft = `sessionStorage['tripplanner:draft:<userId>']` = `{ itinerary, preferences, tripId, dirty, meta }` — sirf is tab ke liye, logout pe saaf.
- `dirty = true` → Regenerate hua par save nahi: banner "Save changes / Discard changes".
- Rename (`PUT { title }`) itinerary ka `title` bhi badalta hai.
- Client state (TripContext): `planPreferences` = khule plan ki preferences (Save, Regenerate, Edit); `currentPreferences` = agle **naye** trip ke
  wizard ki shuruaati values (Quick search, Explore). Dono kabhi mix nahi hote.
- Offline planner ki destinations: `OFFLINE_PLANNER_DESTINATIONS` + `findOfflinePlannerDestination()` (`shared/`) — server planner aur wizard ka hint dono yahi.

## Map data (Part 8)
Sab optional (purane trips valid). Server ka map service bharta hai, AI kabhi nahi.
```js
activity / hotel / restaurant: { coordinates?: { lat, lng }, locationSource?: 'curated' | 'geocoded' | 'ai' | 'none' }
day.route = {
  provider: 'osrm' | 'estimate' | 'none',   // estimate = routing service nahi mila / road nahi (islands)
  distanceKm, durationMin,
  stopIds: ['d1-a1', 'd1-a3', ...],          // mapStops(day) ke ids, visiting order mein
  legs: [{ distanceKm, durationMin }],       // legs[i] = stopIds[i] → stopIds[i + 1]
  geometry: [[lat, lng], ...],               // max LIMITS.MAX_ROUTE_POINTS (400)
  signature,                                 // routeSignature(stops); din badla → naya route
}
itinerary.map = { version, updatedAt, located, total, notice? }
```
- `mapStops(day)`: positions wali activities; Transit sirf din ke shuru / end mein (arrival / departure); "All day" travel stop nahi.
- `needsMapUpdate(itinerary)`: koi place bina `locationSource` ke, ya kisi din ka route nahi / signature purana → true.
- Endpoints: `POST /api/map/enrich { itinerary, force? }` (unsaved plan) · `POST /api/trips/:id/map { force? }` (saved; result trip mein save,
  agar beech mein trip dobara save hua to naya version jeetta hai: `stale: true`). Answer: `{ data, stats }`.

## Live events (Part 9)
`Accept: text/event-stream` bhejo to `POST /api/trips/generate`, `/api/map/enrich`, `/api/trips/:id/map` events bhejte hain:
```
event: progress   data: { stage, message, percent? | done, total }
event: day        data: { index, total, day }        (sirf generate; preview — final result hi asli hai)
event: reset      data: {}                           (retry shuru: preview days bhool jao)
event: result     data: <wahi body jo normal JSON answer mein hoti>
event: error      data: { success: false, status, error, details? }
```
Validation / login / rate-limit errors stream shuru hone se pehle normal JSON (400 / 401 / 429) mein aate hain.
Client: `client/src/services/stream.js` (`postStream`), Cancel = `AbortController` (server pe Gemini call bhi ruk jaati hai).

## Regenerate one day (Part 9)
`POST /api/trips/regenerate-day` — `RegenerateDaySchema`: `{ preferences, itinerary, dayNumber, pace?, note? (max 300) }`
→ `{ data: itinerary, meta: { source: 'gemini' | 'offline', notice, ai, dayNumber } }`.
Sirf woh din badalta hai (date, baaki din, stays, unke routes same); naya din `route` ke bina aata hai → map update.
Itinerary ke din preferences ke din se alag hon → 400 ("Use Regenerate for the whole trip").

## Destinations (Part 10)
MongoDB `Destination` (seed: `server/src/data/destinationCatalog.js`, `DESTINATION_SEED_VERSION` badhao to purane DB update).
```js
// GET /api/destinations?q=&category=&sort=popular|name|budget|season&month=  → { count, data: DestinationSummary[] }
DestinationSummary = {
  slug, name, state, categories, interests, summary, highlights /* 3 */, bestMonths /* 1–12 */, inSeason, idealDays: [min, max],
  dailyBudget: { Budget, Moderate, Luxury },   // ₹ per person per day (estimate)
  center: { lat, lng }, image: string | null, offlinePlanner: boolean,
  imageCredit: { source: 'Wikipedia', pageUrl, fileUrl } | { source: 'Unsplash', note } | null,
}
// GET /api/destinations/:slug  → { data: DestinationDetail }  (404 unknown)
DestinationDetail = DestinationSummary + { highlights /* all */, terrain, reach: { airport?, railway?, road?, sea?, note? },
  busName, notes, wikiUrl, stays: [{ area, lat, lng, prices: { Budget, Moderate, Luxury } }], eateries: [{ name, area, cuisine, veg, costForTwo }] }
```
- Naam se dhoondhna (`findDestinationDoc`): slug, naam, offline planner ke alias, Wikipedia title, bus town ("Leh", "Munnar", "Pondicherry").
- `image` null → client placeholder dikhata hai (kabhi kisi aur jagah ki photo nahi).

## Stays + food (Part 10)
```js
// GET /api/recommendations/hotels?destination=&budget=All|Budget|Moderate|Luxury&checkIn=&checkOut=&travelers=
{ count, destination, sources: ['curated'] | ['google', 'curated'], data: Stay[] }
Stay = { id, kind: 'area' | 'hotel', name, area?, address, budgetTier?, pricePerNight: number | null, priceNote?, amenities?,
         rating? , ratingCount?, ratingSource?: 'Google',  // sirf Google Places se, kabhi banaya nahi
         coordinates: { lat, lng } | null, links: { booking?, maps } }
// GET /api/recommendations/restaurants?destination=&veg=true
{ count, destination, note, data: [{ id, name, cuisine, area, address, veg, dietaryTags, costForTwo, priceNote, coordinates, links: { maps } }] }
```
Links `shared/src/utils/links.js` se: `bookingSearchUrl`, `mapsSearchUrl`, `mapsDirectionsUrl`, `googleFlightsUrl`, `redBusUrl`, `IRCTC_SEARCH_URL`.

## Favourites (Part 10)
`User.favorites: string[]` (slugs, newest first, max 100). Login zaroori.
`GET /api/favorites` → `{ data: slugs, destinations: DestinationSummary[] }` · `PUT /api/favorites/:slug` · `DELETE /api/favorites/:slug` → `{ data: slugs }`
(unknown slug → 404). `GET /api/auth/me` ke user mein bhi `favorites`.

## Weather (Part 11)
```js
// GET /api/travel/weather?destination=&start=YYYY-MM-DD&end=YYYY-MM-DD[&lat=&lng=]   (max LIMITS.MAX_TRIP_DAYS din)
{ data: {
  location: { name, lat, lng, source: 'catalog' | 'geocoded' | 'given' },
  days: [{ date, kind: 'forecast' | 'typical' | 'actual' | 'missing', code, summary, icon, tMax, tMin, rainMm, rainChance,
           rainyYears?, years? }],         // typical: pichhle 3 saal ka average; rainChance = kitne % saal baarish
  attribution: { text: 'Weather data by Open-Meteo.com', url, license: 'CC BY 4.0' }, notes: string[] } }
```
Errors: 404 jagah nahi mili · 503 Open-Meteo nahi mila / `WEATHER_ENABLED=false`. Weather codes → `weatherInfo(code)` (`shared/src/utils/weather.js`).

## Packing list (Part 11)
`buildPackingList({ itinerary, preferences, weather, destination })` (`shared/src/utils/packing.js`, server pe nahi chalta)
→ `{ groups: [{ id, title, items: [{ id, label, reason }] }], basedOn: string[] }`. Item `id` = `slugify(label)` (e.g. `thermal-innerwear`), isliye stable hai;
ticks trip pe: `PUT /api/trips/:id { packingChecked: string[] }` (max 200). Unsaved plan ke ticks sirf draft mein.

## How to reach (Part 11)
```js
// GET /api/travel/reach?from=Ghaziabad&to=manali[&date=YYYY-MM-DD]
{ data: { from: { name, state, airport, station, known }, to: { slug, name, state }, straightKm,
  road: { km, durationMin, source: 'osrm' | 'estimate' } | null,
  options: [{ mode: 'flight' | 'train' | 'bus' | 'car' | 'ship' | 'local', title, durationMin | null, steps, links: [{ label, url }],
              note?, recommended? }],    // exactly one recommended
  notes } }
```
- `from`: `ORIGIN_CITIES` (`shared/src/data/originCities.js`, 27 shehar + aliases) ya geocoder (tab sirf bus / car). Na mile → 404.
- Times andaze hain (UI pe "≈"), koi fare nahi. Starting city trip pe: `PUT /api/trips/:id { originCity }` → `preferences.originCity`.

## Editing a plan (Part 12)
Sab client pe hota hai (koi naya endpoint nahi); save purane `POST /api/trips` (`tripData.id` ke saath) se, server phir `normalizeItinerary` chalata hai.
```js
applyEdit(itinerary, edit, preferences)   // shared/src/itinerary/edit.js — PURE: naya itinerary, purana nahi badalta
edit = { type: 'move',      fromDay, activityId, toDay, toIndex? }       // toIndex nahi → apne time pe
     | { type: 'add',       dayNumber, activity: ActivityInput, index? }  // index nahi → apne time pe, warna end mein
     | { type: 'update',    dayNumber, activityId, changes: Partial<ActivityInput> }
     | { type: 'remove',    dayNumber, activityId }
     | { type: 'updateDay', dayNumber, changes: { title?, description? } }
ActivityInput = { placeName, category, timeSlot?, estimatedDuration?, description?, cost? (₹, poore group ka), tips?, coordinates? }
```
- Galat edit → `ItineraryEditError { message, field }` (e.g. "Day 2 needs at least one activity", "Day 3 already has 15 activities").
- Naya activity id `u-xxxxxx`. Naya naam → purani position / photo hat jaati hai (map naya dhoondhta hai). Routes nahi chhede jaate:
  badle din ka `route.signature` match nahi karta → map service sirf us din ka route banata hai (Part 8).
- Time slot text helpers: `parseTimeSlot("09:00 AM - 11:00 AM") → { start: 540, end: 660 }`, `formatTimeSlot`, `timeOverlaps(activities)`,
  `retimeAfterReorder` (same-day drag), `sortActivitiesByTime` (time badla → sahi jagah).
- Destination detail (`GET /api/destinations/:slug`) mein ab `places` (sirf 8 offline-planner destinations):
  `[{ name, category, hours, feePerPerson, fullDay, description, tips, lat, lng }]` — editor ke "Ideas".
- Client: `TripContext.editItinerary(edits)` (ek ya kai edits = ek Undo step) → `{ ok, changed } | { ok: false, error, field }`;
  `undoEdit`, `redoEdit`, `canUndo`, `canRedo`. History naya plan / trip khulne pe saaf.

## Sharing & export (Part 14)
```js
// GET /api/trips/:id/share  ·  PUT /api/trips/:id/share { enabled: boolean, newLink?: boolean }   (owner)
{ data: { enabled, slug: string | null, views, createdAt, url } }   // url = PUBLIC_APP_URL + '/share/' + slug
// GET /api/share/:slug   (anyone; owner → isOwner + tripId + views; visitors are counted, the owner is not)
{ data: { slug, title, destination, startDate, endDate, durationDays, travelersCount, totalBudget, budgetCategory,
          destinationImage, itinerary, sharedBy /* first name */, updatedAt, isOwner } }
// POST /api/share/:slug/copy   (login) → 201 { data: Trip }   — own copy: not shared, no notes / home city / packing ticks
// GET /api/share/:slug/pdf  ·  POST /api/trips/pdf { itinerary, tripId? }  → application/pdf (attachment)
```
- Link off / unknown / badla hua → 404 "This shared trip is not available...". Slug: 8 random bytes, base64url (11 chars).
- Public view **kabhi nahi** bhejta: e-mail, userId, `preferences` (notes, home city), `packingChecked`, expenses.
- Share on / off trip ka `updatedAt` nahi badalta (Part 8 map update usse "newer version" pehchaanta hai).
- PDF: `buildPdfContent(itinerary, { shareUrl })` (kya jaata hai, tested) + `renderTripPdf` (PDFKit). `exportLimiter`: 10 PDFs / min.
- Calendar: `buildTripCalendar(itinerary, { uidBase, url, now })` → `{ ics, eventCount }` — client pe banta hai (unsaved plan bhi).
  Times IST → UTC. UID = `<uidBase>-<activityId>@tripplanner`.

## Expenses (Part 15)
Sab amounts **paise** mein (integer). Form rupees leta hai aur `toPaise()` se badalta hai. Log = trip ke `members` (naam, account nahi).
```js
// GET /api/trips/:id/expenses  ·  POST /api/trips/:id/expenses  ·  PUT|DELETE /api/trips/:id/expenses/:expenseId
// POST /api/trips/:id/settlements { from, to, amountPaise, date }  ·  PUT /api/trips/:id/members { members: [{ id?, name }] }
// Har answer (owner only) = poora ledger:
{ data: {
  members: [{ id: 'm-1a2b3c', name }],
  expenses: [{ id, kind: 'expense' | 'settlement', description, amountPaise, category, date, paidBy, split, note?, tripId }],
  balances: [{ memberId, name, paidPaise, spentPaise, settledPaise, balancePaise }],   // > 0 gets back, < 0 owes; sum = 0
  settlements: [{ from, to, amountPaise }],                                         // fewest payments to settle
  summary: { count, totalPaise, byCategory, vsPlan: [{ key, label, estimatePaise, actualPaise }], outsidePlanPaise,
             estimatePaise, budgetPaise, leftPaise, byDate },
} }
ExpenseInput = { description, amountPaise, category: 'stay'|'food'|'transport'|'activities'|'travel'|'shopping'|'other',
                 date, paidBy, split: { mode: 'equal', members: [ids] } | { mode: 'exact', shares: [{ memberId, amountPaise }] }, note? }
```
- Equal split: leftover paise pehle logon ko (fixed order). Exact: shares ka total = amount (warna 400 "The shares add up to ...").
- Settlement = `paidBy: from`, `split: exact [{ memberId: to }]`; spending mein count nahi hota. Edit nahi — delete karke dobara.
- Member hatana jab wo kisi expense mein ho → 409. Pehli GET pe default members atomically (do tabs → ek hi list).
- Trip delete → uske expenses delete. Share page / PDF mein expenses ya members kabhi nahi.
- CSV: `expensesToCsv(members, expenses)` (client pe; BOM + CRLF, amounts plain rupees 2 decimals).

## Admin (Part 17)
Sirf admins (stored `role: 'admin'` ya `ADMIN_EMAILS`; demo kabhi nahi). Baaki: 401 / 403.
```js
// GET /api/admin/stats?days=7|30|90
{ data: { range: { days, from, to },
  totals: { users /* demo ke bina */, trips, sharedTrips, expenses, expensesPaise, messages, unreadMessages },
  newUsers, newTrips, tripsPerDay: [{ date, count }], signupsPerDay: [...],
  popularDestinations: [{ destination, trips }] /* top 8, case-insensitive */,
  planSources: [{ source: 'gemini'|'offline'|'sample', trips }],
  ai: { enabled, model, dailyLimit, callsToday, usersToday, callsInRange, callsPerDay, cachedPlans },
  cache: { places, routes, weather } } }
// GET /api/admin/messages?status=all|new|read  ·  PUT /api/admin/messages/:id { status: 'new'|'read' }  ·  DELETE /api/admin/messages/:id
// GET /api/admin/users?q=  → [{ id, name, email, role, isDemo, createdAt, lastLoginAt, trips }]  (max 100; q = plain text, not a pattern)
```
Din IST (UTC+05:30) mein gine jaate hain. Stats mein koi naam / e-mail / plan nahi.

## API documentation (Part 18)
- `GET /api/openapi.json` — OpenAPI **3.1**. Request bodies / query parameters `z.toJSONSchema(schema, { io: 'input' })` se
  **shared Zod schemas** se bante hain (wahi jo server validate karta hai). Endpoint ki list `server/src/docs/openapi.js` mein.
- `GET /api/docs` — usi description se bana HTML page (koi script nahi). Naya route banao to `ENDPOINTS` mein bhi likho —
  `server/test/docs.test.js` fail hoga agar docs aur routes match na karein. Legacy `/api/places/*` jaan-boojh kar list nahi.

## Production serving (Part 18)
- `SERVE_CLIENT=auto` + `NODE_ENV=production` + `client/dist/index.html` maujood → Express app bhi serve karta hai:
  `/assets/*` → `Cache-Control: public, max-age=31536000, immutable` (missing file = 404, index.html nahi);
  baaki GET (jo `/api` nahi) → `index.html` with `Cache-Control: no-cache`.
- `GET /share/:slug` → index.html + `<title>`, `og:title`, `og:description` ("N days in X (dates) …"), `og:url`,
  `og:image` (sirf http(s) photo), `twitter:card`. Text HTML-escaped. Link band / anjaan → saada page. View count nahi badhta.
- CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; img-src 'self' data: blob: https:;
  font-src 'self' data: fonts.gstatic.com; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; object-src 'none'`.
  Naya bahar ka script / API chahiye to yahan (`server/src/app.js`) jodna padega.
- `CLIENT_URL` khaali → `RENDER_EXTERNAL_URL` → `http://localhost:5173`. Share links / QR isi (ya `PUBLIC_APP_URL`) se bante hain.
