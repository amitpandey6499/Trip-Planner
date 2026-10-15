# Testing — Part 18

```bash
npm run check     # lint (0 warnings) + all tests + production build — har change ke baad yahi chalao
npm test          # sirf tests: shared + server
```

**Result (v2.0.0): 165 automated tests, sab pass** — shared 61 + server 104. ESLint 0 warnings. Client build OK.

## Kaise chalte hain

| Part | Tool | Database | Bahar ki services |
| --- | --- | --- | --- |
| `shared/` (logic) | Node.js test runner (`node --test`) | — | — |
| `server/` (REST API) | Node.js test runner + **Supertest** (asli HTTP requests app pe) | **asli MongoDB**: `TEST_MONGODB_URI` ho to woh, warna `mongodb-memory-server` (pehli baar ~70 MB download) | Gemini, Nominatim, OSRM, Open-Meteo, Wikipedia — sab **fake** (internet / API key ki zarurat nahi) |

Har server test file apna naya, random naam wala database banati hai aur end mein drop karti hai — tests ek doosre ko
nahi chhedte, aur tumhara asli Atlas data kabhi use nahi hota (`server/scripts/setup-tests.js` `MONGODB_URI` khaali kar deta hai).

Apna MongoDB use karna ho (fast):
```bash
# macOS / Linux
TEST_MONGODB_URI=mongodb://127.0.0.1:27017 npm test
# Windows PowerShell
$env:TEST_MONGODB_URI="mongodb://127.0.0.1:27017"; npm test
```

## Kya-kya test hota hai

| File | Tests | Kya check hota hai |
| --- | --- | --- |
| `shared/test/schemas.test.js` | 10 | wizard / save / update schemas, galat input ke messages |
| `shared/test/itinerary.test.js` | 4 | `normalizeItinerary`: koi bhi plan ek shape mein, budget hamesha add up |
| `shared/test/budget.test.js`, `dates.test.js` | 5 + 5 | budget tiers, ₹ format, trip phase (upcoming / ongoing / past), dates |
| `shared/test/edit.test.js` | 9 | drag & drop / add / update / remove, time slots, minimal re-timing |
| `shared/test/expenses.test.js` | 6 | paise, barabar / exact split, balances, settle-up (≤ n−1 payments), CSV |
| `shared/test/map.test.js`, `travel.test.js` | 7 + 7 | map stops, route signature, weather codes, packing list rules, cities |
| `shared/test/calendar.test.js` | 3 | `.ics` (RFC 5545): escaping, line folding, IST → UTC |
| `shared/test/destinations.test.js`, `projectInfo.test.js` | 2 + 3 | offline destinations + aliases, project details |
| `server/test/auth.test.js` | 10 | sign up / login / logout / demo, bcrypt hash, httpOnly cookie, same error message, tampered token, Bearer token |
| `server/test/api.test.js`, `trip.test.js` | 14 + 2 | health, JSON 404 / 400, trips CRUD, **ek user doosre ka trip na dekh / badal / delete kar sake**, galat id → 404, contact form |
| `server/test/ai.test.js` | 10 | fake Gemini: sahi jawab, cache, 1 retry, offline fallback, daily limit, error hints |
| `server/test/offlinePlanner.test.js` | 8 | 8 destinations × har length × har pace → valid plan, asli jagah, koi repeat nahi |
| `server/test/stream.test.js` | 11 | live events order, reset, cancel (Gemini bhi rukta hai), ek din dobara |
| `server/test/map.test.js` | 12 | fake Nominatim / OSRM: positions, 300 km rule, routes, cache, service down → estimate |
| `server/test/destinations.test.js` | 9 | 26 destinations, search / sort, stays, food, favourites, Wikipedia photos |
| `server/test/travel.test.js` | 7 | weather (forecast / typical / mixed), how to reach, starting city, packing ticks |
| `server/test/share.test.js` | 5 | share link on/off/new, privacy, views, save a copy, PDF |
| `server/test/expenses.test.js` | 5 | people, expenses (equal / exact), balances, settle-up + undo, private (share page pe kabhi nahi) |
| `server/test/admin.test.js` | 3 | sirf admin (403 / 401), stats ke numbers, inbox, accounts |
| `server/test/web.test.js` | 4 | production: React app serve, asset cache, deep links, share preview (OG tags), security headers (CSP) |
| `server/test/docs.test.js` | 3 | `/api/openapi.json` valid, **docs mein exactly wahi routes jo server pe hain**, `/api/docs` page |

## CI (GitHub Actions)

`.github/workflows/ci.yml`: har push / pull request pe Node 22 + MongoDB 7 service → `npm ci` → `npm run check`.
GitHub ke **Actions** tab mein hara tick = lint, saare tests aur build pass.

## Browser checks (development ke dauraan)

Har part ke baad UI ko asli browser (Playwright, Chromium) mein check kiya gaya — desktop aur phone size (390 px):
login, wizard, live generation, map, editor (mouse + keyboard drag), share page (guest), PDF / calendar download,
expenses, admin dashboard; production build (`npm run build` + `NODE_ENV=production`) pe bhi. Browser console mein koi error nahi.

## Viva se pehle 2 minute ka manual check

1. `npm run dev` → http://localhost:5173 → **Try the demo account**
2. **Plan a Trip** → Jaipur, 4 din, ₹15,000 → plan din-ba-din aata hai
3. **Map View** → road route + km; **Weather & Packing**; **Edit plan** → ek activity drag karo → **Save changes**
4. **Share** → link on → naye (incognito) window mein kholo
5. **Expenses** → ek kharcha add → "Who paid, who owes"
6. http://localhost:5000/api/docs → API documentation
