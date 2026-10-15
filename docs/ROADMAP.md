# TripPlanner — Rebuild Roadmap (18 Parts)

> Goal: project ko **error-free, real (fake data nahi) aur impressive** banana.
> Kaam 18 parts mein bata hai. Har part ke baad project **chalta hua (runnable)** rehta hai.

**Final decisions**
- Login: **apna JWT + bcrypt** (Clerk hata diya)
- Database: **MongoDB Atlas + Mongoose** (MySQL + JSON-file store hata denge)
- AI: **Google Gemini** naya SDK `@google/genai` (model `.env` se)
- Maps: **Leaflet + OpenStreetMap**, geocoding **Nominatim**, routes **OSRM** (sab free)
- Monorepo: **npm workspaces** → `shared/` (common code), `server/`, `client/`

---

## Status board

| # | Part | Depends on | Status |
|---|------|-----------|--------|
| 1 | Foundation & cleanup | — | ✅ Done |
| 2 | Shared contracts (data shape) | 1 | ✅ Done |
| 3 | MongoDB Atlas + models | 2 | ✅ Done |
| 4 | JWT Authentication | 3 | ✅ Done |
| 5 | Trips CRUD + URL by trip id | 4 | ✅ Done |
| 6 | Real Gemini AI | 2, 5 | ✅ Done |
| 7 | Deploy v1 (live URL) + CI | 6 | ⏭ Skipped (deploy Part 18 mein) |
| 8 | Real map: geocoding + road routes | 6 | ✅ Done |
| 9 | Streaming generation + regenerate one day | 6 | ✅ Done |
| 10 | Destinations, photos, hotels, favorites | 3, 4, 8 | ⬜ |
| 11 | Weather + packing list + "How to reach" | 6, 8 | ⬜ |
| 12 | Itinerary editor (drag & drop) | 5, 8 | ⬜ |
| 13 | AI Trip Chat | 6, 12 | ⬜ |
| 14 | Sharing & export (link, QR, PDF, calendar) | 5 | ⬜ |
| 15 | Expense tracker + bill split | 4, 5 | ⬜ |
| 16 | UI polish (dark mode, Hindi/English, contact form) | 5 | ⬜ |
| 17 | Admin dashboard | 4, 15 | ⬜ |
| 18 | Final: tests, API docs, README, report diagrams, final deploy | all | ⬜ |

**Milestones**
- After **Part 7** → *Viva-safe*: real login, real DB, real AI, live URL. (Part 7 abhi skip kiya hai — live URL Part 18 ke final deploy mein; tab tak demo laptop pe `npm run dev` se.)
- After **Part 12** → *Impressive*: real maps, weather, editor, streaming.
- After **Part 18** → *Complete*.

---

## Connected parts ko kaise manage karenge (rules)

1. **Order = dependency.** Koi part tab tak shuru nahi hoga jab tak uske "Depends on" wale parts ✅ na ho jaayein.
2. **Contract first (Part 2).** Trip / Itinerary / Preferences ka data shape **ek hi jagah** (`shared/`, Zod schemas) mein define hoga. Server (validation, DB, AI) aur client (forms, pages) dono wahi use karenge. Shape badalna ho to *pehle* `shared/` badlega — galat jagah turant test/lint mein pakdi jaayegi.
3. **Seams (jod) pehle se.** Jo cheez baad mein aayegi uska "socket" pehle bana dete hain:
   - Part 1 se har request pe `req.user = { id, email, name }` milta hai (abhi demo user). Part 4 sirf middleware ke andar ka code badlega — controllers wahi rahenge.
   - Frontend mein saari API calls sirf `client/src/services/api.js` se. Endpoint badla to ek hi file badlegi.
4. **Optional future fields.** Schema mein baad wale fields (weather, route, language, originCity) **optional** rakhe jaayenge, taaki purane saved trips kabhi invalid na hon.
5. **Adapter + mock har external API ke liye** (Gemini, Nominatim, OSRM, Open-Meteo, photos). Har service ka ek real aur ek mock/fallback version — key na ho ya internet na ho to bhi app crash nahi karegi, aur tests bina internet chalenge.
6. **Feature flags.** Adhoora feature `.env`/config flag se band rahega, taaki beech mein bhi app stable rahe.
7. **DB changes safe.** Mongoose schema mein naye fields default ke saath; har trip mein `schemaVersion`. Shape badla to chhota migration script.
8. **Git = safety net.** Har part = ek commit + tag (`part-1`, `part-2` ...). Kuch toota to pichhle tag pe wapas ja sakte hain. Original code `v0-original` tag pe safe hai.
9. **Regression gate.** Har part ke end mein ye pass hona zaroori:
   - `npm run check` (lint + saare tests + client build)
   - Manual smoke checklist (neeche)
10. **Delivery note** har part ke saath (`docs/CHANGELOG.md`): kaun si files badli, kis aur part pe asar, naye env variables, kaun si command chalani hai.

### Smoke checklist (har part ke baad)
- [ ] `npm run dev` — server + client bina error/warning ke start
- [ ] Home → Create Trip → itinerary dikhe
- [ ] Save → My Trips mein dikhe → View → Delete
- [ ] Explore, Hotels, Restaurants, Map, Profile pages khulein, browser console mein error nahi
- [ ] Signup → Logout → Login → sirf apne trips dikhein; doosra user kuch nahi dekh paata

---

## Part-wise detail

### Part 1 — Foundation & cleanup ✅
**Kya kiya**
- Git baseline (`v0-original`), npm workspaces (`shared`, `server`, `client`), root se ek hi `npm install`.
- Server: `"type": "module"`, `.env` sabse pehle load (`config/env.js`, Zod se validate), Arcjet aur Clerk hataye.
- Error handling: `ApiError`, `asyncHandler`, sahi status codes (galat JSON → 400), production mein stack trace nahi.
- `helmet`, CORS config se, body limit 1 MB, nodemon `src/data` ignore (save pe restart band).
- Auth seam: `req.user` (abhi demo). `x-user-id` header pe bharosa band (koi doosre ka data nahi padh sakta).
- `/api/health` asli status batata hai (kaunsi service configured hai). Profile page pe fake "Enabled/Active" badges hataye.
- College ka naam/details ek jagah (`shared/src/projectInfo.js`) — har page wahi se padhta hai.
- Tailwind: missing classes (`shadow-xs`, `animate-in`, `fade-in` ...) ab kaam karti hain.
- ESLint + tests (`node --test` + supertest, 14 server tests) + `npm run check`.
- Vendor chunks split (client bundle warning khatam). Hotels / My Trips pe loading state.

**Abhi bhi baaki (jaan-boojh kar, apne part mein theek honge):**
- Login abhi demo hai, sab ek hi demo user → **Part 4**
- ~~`/itinerary` auto-generate, Save duplicate, Edit button~~ → Part 2 mein hi theek ho gaye
- 2 `react-hooks/exhaustive-deps` warnings (HotelsView, RestaurantsView) → **Part 10** (ye pages wahan rewrite honge)
- ~~Fake "Landmark 1A" itinerary, purana Gemini SDK~~ → Part 6 mein theek
- ~~Map distance "98 km" hardcoded~~ → Part 5 mein hataya (abhi straight-line); asli road distance **Part 8**

**Depends on:** — **Affects:** sab parts (base)

### Part 2 — Shared contracts ✅
**Kya kiya** (details: `docs/CONTRACTS.md`)
- `shared/src/schemas/`: preferences (wizard ke 3 steps alag), itinerary, trip (save/update), auth — Zod 4.
- `shared/src/constants.js`: interests, budget tiers, travel pace, stay types, diets, categories, popular destinations, limits.
- `shared/src/utils/`: dates (`tripPhase`, `calcDuration`, `defaultTripDates`), budget (`computeBudget`, `formatINR`, `suggestBudgetTier`), `tagsToInterests`.
- `normalizeItinerary`: har itinerary (AI / sample / purana saved) contract follow kare + budget hamesha add up ho.
- Server: `validateBody(schema)` middleware; generate/save/update shared schemas se. Galat AI output → fallback.
- Client: wizard har step pe **wahi** messages dikhata hai jo server deta; naye fields (travel pace, stay type, food); travelers stepper; budget khaali kar sakte ho; dates hamesha future se default.
- Budget display: "Est. ₹X of ₹Y budget", Within / Over budget, cost tab ke parts total se milte hain.
- My Trips: Upcoming / Ongoing / Past / All tabs dates se (counts ke saath).
- Part 5 ke kuch kaam pehle hi ho gaye (contract se jude the): `/itinerary` ab random trip nahi banata, Save dobara dabane pe duplicate nahi (Update Trip), Edit wizard ko trip se bharta hai.
- Tests: shared 25, server 19; browser checks 13 flows.

**Depends on:** 1 — **Affects:** 3, 5, 6, 12, 13

### Part 3 — MongoDB Atlas + models ✅
**Kya kiya** (setup: `docs/SETUP_MONGODB.md`)
- Mongoose models: `User`, `Trip` (facts + `preferences` + normalized `itinerary` + `schemaVersion`), `ContactMessage`.
- `config/db.js`: connect + saaf hint (DNS/SRV, galat password, IP access list).
- `services/tripService.js`: **har query mein `owner`** → doosre ka trip na dikhe, na badle, na delete ho. Galat id = 404 (500 nahi).
- Trip ke saath style preferences save → Edit pe poora wizard wapas (Part 5 ka kaam pehle hi).
- Trip ki dates badlo to itinerary ke din bhi shift; din ki ginti badalni ho to "Regenerate" (itinerary mismatch nahi hota).
- `POST /api/contact` → Contact form ke messages DB mein.
- Demo account + sample trip server start pe apne-aap (`npm run seed -w server -- --reset` se reset).
- MySQL, `database/` folder, JSON-file store poore hata diye.
- (`AiCache` model Part 6 mein, jahan uska use hai.)

**Depends on:** 2 — **Affects:** 4, 5, 10, 15, 17

### Part 4 — JWT Authentication ✅
**Kya kiya**
- `POST /api/auth/register | login | demo | logout`, `GET /api/auth/me`.
- Password **bcrypt** (10 rounds) hash; JWT (HS256) **httpOnly cookie** mein — JavaScript cookie padh hi nahi sakta.
- "Keep me signed in" = 7 din, warna browser band hote hi logout.
- Galat password aur anjaan email pe **same** message ("Invalid email or password.").
- Login/register rate-limit (IP + email), JSON-only bodies (CSRF se bachaav), production mein strong `JWT_SECRET` zaroori.
- `requireAuth` ab asli (Part 1 wala seam — controllers ko chhuna nahi pada).
- Client: Login / Sign up page (shared schemas se validation), "Try the demo account", ProtectedRoute (login ke baad wapas usi page pe),
  session expire → login page, Navbar avatar + Plan a Trip + Sign Out, Profile pe asli data, 404 page.
- Guest quick search → login → wizard mein wahi values.
- Fake "Continue with Google", auto-demo-login, localStorage token hata diye.
- Tests: server 29 (auth 10, API + isolation 15), browser 41 checks.

**Depends on:** 3 — **Affects:** 5, 10, 15, 17

### Part 5 — Trips CRUD + URL by trip id ✅
**Kya kiya**
- Routes: `/trips/new` (wizard), `/trips/:id` (saved trip), `/trips/:id/edit`, `/itinerary` (naya, abhi save nahi hua). Purana `/create-trip` → `/trips/new`.
- `/trips/:id` refresh / bookmark / naye tab mein khulta hai (server se load). Galat ya doosre ka id → "Trip not found" page.
- Unsaved plan refresh pe nahi khota (sessionStorage draft, sirf us tab ke liye, logout pe saaf).
- Save ke baad page apne-aap `/trips/:id` pe; button "Saved" / "Update Trip". Regenerate ke baad banner: **Save changes / Discard changes** (refresh ke baad bhi).
- Itinerary page pe Edit button; purani dates wale trip pe Regenerate → pehle nayi dates (server past dates nahi leta).
- My Trips: title **rename inline** (Enter/Esc), **sort** (newest / start date / budget), View/Edit URLs se.
- Unsaved plan ke saath doosra trip kholo → "Discard unsaved changes?" dialog (delete wala dialog bhi same component).
- Open trip ki preferences (`planPreferences`) aur naye trip ke wizard values (`currentPreferences`) alag — Explore / quick search kabhi khule trip ko nahi badalte.
- Rename itinerary ka title bhi badalta hai (server).
- React **ErrorBoundary** har page pe (ek page crash ho to poori app white nahi hoti), naye page pe scroll top, toast har page pe.
- Fake data hataya: hotel/restaurant pe nakli 4.5★ rating, map pe "98 km / 3.5 hours" (ab stops se nikla straight-line distance), /map page pe "Solang Valley" default.
- (Pehle ho chuka: Save = update, ownership, allowed-fields-only update, preferences save — Parts 2–4.)

**Depends on:** 4 — **Affects:** 6, 11–16

### Part 6 — Real Gemini AI ✅
**Kya kiya** (contract: `docs/CONTRACTS.md` → "AI generation")
- Naya SDK `@google/genai` (purana `@google/generative-ai` hataya — Google ne uska support band kar diya). Model `GEMINI_MODEL` se.
- Gemini ko JSON schema (`responseJsonSchema`) + system instruction; jawab `normalizeItinerary` se check, galat ho to **1 retry** reason ke saath; timeout `AI_TIMEOUT_SECONDS`.
- Prompt mein travel pace (2/3/4 places), stay type, diet (veg/Jain/Halal ...), notes, "costs = poore group ka total".
- **AiCache** (MongoDB, TTL): same request → turant, free. Regenerate = `?fresh=1` (cache skip).
- **Daily limit per user** (`AI_DAILY_LIMIT`, `AiUsage` model); Profile + itinerary page pe "x of y AI plans left today".
- **Offline planner** (fake "Landmark 1A" generator ki jagah): 8 destinations (Manali, Goa, Jaipur, Udaipur, Varanasi, Kerala, Andaman, Rishikesh) ke **asli places** — timings, entry fee, area, veg/non-veg restaurants, travel pace, excursion days. Badge "Offline planner (curated places)".
- Gemini fail ho (limit, galat key, model band, network) → offline planner + **notice kyun**. Destination offline mein bhi nahi → saaf error (422 / 503 / 429) supported list ke saath.
- Key nahi to wizard **step 1 pe hi** batata hai ki kaun si 8 jagah chalengi (list + aliases `shared/` mein, server bhi wahi use karta hai). Quick search ka error wizard mein sahi field pe.
- Error messages saaf: galat key, quota, model not found ("GEMINI_MODEL badlo"), network.
- Tests: Gemini ka **fake client** (bina internet/key): sahi jawab, cache, retry, 2 galat jawab → offline, 429 retry nahi, model 404 hint, daily limit, per-user limit. Offline planner 576 combinations pe check.
- **Needs from you:** Gemini API key (free): https://aistudio.google.com/apikey → `server/.env` → `GEMINI_API_KEY`.

**Depends on:** 2, 5 — **Affects:** 7, 8, 9, 11, 13

### Part 7 — Deploy v1 + CI ⏭ (skipped for now)
Tumhare kehne pe abhi skip kiya. Koi aage wala part ispe depend nahi karta; **Part 18** mein final deploy ke saath karenge:
- Client → Vercel, Server → Render, DB → Atlas. Production env vars, CORS, cookies (`COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`), `TRUST_PROXY=true`.
- GitHub Actions: har push pe `npm run check`.
- Deploy pe dhyan: Server-Sent Events (Part 9) ke liye proxy buffering band (`X-Accel-Buffering: no` server bhejta hai);
  map services (Part 8) ki policy ke liye `GEO_USER_AGENT` mein apna site URL daalna.
- **Needs from you (tab):** GitHub, Vercel, Render accounts (free).

### Part 8 — Real map ✅
**Kya kiya** (details + policies: `docs/MAP_SERVICES.md`)
- **Geocoding (Nominatim):** AI ke places ke asli coordinates ("Amber Fort, Jaipur"), destination ke aas-paas bias, 300 km se door = galat.
  Curated (offline planner) places lookup nahi hote. "Lunch at X" aur restaurant "X" = ek hi lookup.
- **Road routes (OSRM):** har din ke stops ka asli road route, km, driving time, stops ke beech har leg. Line simplify (max 400 points).
- **Usage policies follow:** har service 1 request/second (ek queue), app ka User-Agent, MongoDB cache (`GeoCache`), `MAP_ENABLED` flag.
- Service down / islands (NoRoute) → crash nahi: honest estimate (straight × 1.35) + notice + **Retry**.
- Saved trip ka map trip ke saath save; dobara kholne pe 0 requests. Unsaved plan ka map save ke saath jaata hai.
- Map: `fitBounds`, numbered stops, route line (estimate = dashed), **Stays / Restaurants** pins (toggle),
  card ka "View on Map" → us pin pe zoom + popup, list click → pin. Day pills map tab mein. Leaflet CSS ab bundle mein (CDN nahi).
- Timeline: "Driving today: 38 km • 1 h 20 min" aur har stop ke baad "2.9 km • 6 min to the next stop".
- "98 km / 3.5 hours" jaisa koi hardcode nahi bacha. Profile pe asli map services.
- Tests: 10 server (fake Nominatim/OSRM), shared map utils, browser.

**Depends on:** 6 — **Affects:** 10, 11, 12

### Part 9 — Streaming + regenerate one day ✅
**Kya kiya**
- `POST /api/trips/generate` + `Accept: text/event-stream` → **live events**: `progress`, `day` (har din jaise hi AI likh le), `reset` (retry), `result` / `error`.
  Normal JSON wala tareeka bhi chalta hai (API tools, tests).
- Gemini **streaming** (`generateContentStream`) + chhota JSON scanner jo adhoore jawab se poore din nikalta hai; timeout ab "aakhri piece ke baad" se.
- **Progress window** (har page pe): progress bar, "Day 2 of 4 is ready", din ek-ek karke, seconds, **Cancel** (server pe Gemini bhi ruk jaata hai).
- **"New plan for this day"**: sirf ek din dobara — us din ki pace (Relaxed/Balanced/Packed) aur AI ke liye wish ("more relaxed").
  Doosre dino ki jagah repeat nahi hoti; baaki din, stays, routes same. Unsaved banner → Save changes. Day ka naya route apne-aap.
  Bina AI: offline planner un jagahon se banata hai jo trip mein kahin nahi hain.
- Tests: 11 server (stream order, reset, cancel/abort, offline days, error event, day regen offline + Gemini + fallback + checks), browser.

**Depends on:** 6 — **Affects:** 12, 13

### Part 10 — Destinations, photos, hotels, favorites
- Destinations DB mein (20+ Indian destinations), categories sahi (Popular/Hidden Gems ab khaali nahi).
- Real photos (Wikipedia/Unsplash service + cache). Hotels tier filter sach mein filter kare.
- Favorites ❤️ DB mein save.

### Part 11 — Weather + packing list + how to reach
- Open-Meteo: trip dates ka per-day forecast (16 din tak), uske baad climate average.
- Mausam + activities ke hisaab se packing list.
- Starting city → train/bus/flight suggestions + IRCTC / redBus / Google Flights search links.

### Part 12 — Itinerary editor
- `@dnd-kit` drag & drop: activity reorder, add, edit, delete; budget + route auto update; save.

### Part 13 — AI Trip Chat
- "Day 2 relaxed kar do" → AI changes propose kare → preview (diff) → Apply.
- Output Part 2 schema se validate; save Part 12 wale path se.

### Part 14 — Sharing & export
- Public link `/share/:slug` (on/off toggle), QR code, WhatsApp share.
- Asli PDF (poora trip, saare din), Google Calendar `.ics` export.

### Part 15 — Expense tracker + bill split
- Kharche add karo (kisne diya, kis-kis mein bata), "kaun kisko kitna dega", estimate vs actual chart.

### Part 16 — UI polish
- Dark mode, Hindi/English toggle (AI output bhi Hindi), skeleton loaders, toasts, route-level code-splitting, mobile check.

### Part 17 — Admin dashboard
- Admin role; trips/day, popular destinations, AI usage, contact messages — charts.

### Part 18 — Final
- Swagger API docs (`/api/docs`), tests badhana (Vitest + React Testing Library), README rewrite, architecture + ER diagram (report ke liye), final deploy.
- **Part 7 ka kaam yahin:** Vercel + Render + Atlas deploy, GitHub Actions CI (upar Part 7 ki list).
