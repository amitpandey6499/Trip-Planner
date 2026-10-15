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

## Future fields (optional, abhi khaali)
`originCity`, `language` (preferences) · `routes` (Part 8) · `weather`, `packingList`, `transportOptions` (Part 11).
Optional hain, isliye purane saved trips kabhi invalid nahi honge.

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
