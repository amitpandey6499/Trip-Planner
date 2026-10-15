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
| 7 | Deploy v1 (live URL) + CI | 6 | ✅ Part 18 ke saath (render.yaml, Dockerfile, CI) |
| 8 | Real map: geocoding + road routes | 6 | ✅ Done |
| 9 | Streaming generation + regenerate one day | 6 | ✅ Done |
| 10 | Destinations, photos, hotels, favorites | 3, 4, 8 | ✅ Done |
| 11 | Weather + packing list + "How to reach" | 6, 8 | ✅ Done |
| 12 | Itinerary editor (drag & drop) | 5, 8 | ✅ Done |
| 13 | AI Trip Chat | 6, 12 | ⏸ On hold (baad mein; neev Part 12 mein taiyaar) |
| 14 | Sharing & export (link, QR, PDF, calendar) | 5 | ✅ Done |
| 15 | Expense tracker + bill split | 4, 5 | ✅ Done |
| 16 | UI polish (dark mode, Hindi/English, contact form) | 5 | ⏭ Skipped (tumhare kehne pe) |
| 17 | Admin dashboard | 4, 15 | ✅ Done |
| 18 | Final: tests, API docs, README, report diagrams, deploy setup | all | ✅ Done |

**Milestones**
- After **Part 7** → *Viva-safe*: real login, real DB, real AI, live URL. (Part 7 abhi skip kiya hai — live URL Part 18 ke final deploy mein; tab tak demo laptop pe `npm run dev` se.)
- After **Part 12** → *Impressive*: real maps, weather, editor, streaming.
- After **Part 18** → *Complete* ✅ (v2.0.0). Live URL: [docs/DEPLOY.md](DEPLOY.md) ke steps (Render + Atlas accounts tumhare).

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

### Part 7 — Deploy + CI ✅ (Part 18 mein kiya)
Pehle skip kiya tha; **Part 18** mein poora hua, ek badlaav ke saath: Vercel + Render alag ki jagah **ek Render service**
(app + API ek address pe → cookies `SameSite=Lax` hi kaafi, Safari issue nahi). `render.yaml`, `Dockerfile`, GitHub Actions CI,
guide `docs/DEPLOY.md`. Server-Sent Events ke liye `X-Accel-Buffering: no` server pehle se bhejta hai.
**Needs from you:** GitHub + Render accounts (free) aur Atlas string — steps `docs/DEPLOY.md` mein.

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

### Part 10 — Destinations, photos, hotels, favorites ✅
**Kya kiya**
- **26 Indian destinations MongoDB mein** (`Destination` model, `server/src/data/destinationCatalog.js` se seed, server start pe apne-aap).
  Har ek: state, categories, interests, best months, ideal days, typical daily cost (Budget/Moderate/Luxury), center, terrain,
  airport / railway / road info, stays (areas + typical room price), eateries, notes. Purana `destinations.json` hata diya.
- **Explore:** sab categories bhari hui (Popular, Beaches, Mountains, Cultural, Adventure, Spiritual, Hidden Gems), search,
  sort (popular / naam / budget / "good time to go now"), filters URL mein (`?category=&sort=&q=`), "My favourites (N)".
- **Destination page** `/destinations/:slug`: photo + credit, about, best months (is mahine pe ring), daily cost, 7 din ka mausam,
  "How to get there", stays, food, notes. "Plan a trip here" wizard ko prefill karta hai.
- **Real photos (Wikipedia):** har destination ke Wikipedia article ki lead image (sirf free licence), file page ka link (credit),
  DB mein cache — 30 din baad refresh, miss pe 24 h baad dobara try. Background mein, zyada se zyada 4 requests/second. `npm run photos -w server`.
  Photo na mile → saaf placeholder (galat stock photo nahi). Itinerary ki cover image bhi yahi photo.
- **Stays (`/hotels`)**: koi nakli hotel nahi — areas jahan rukna accha hai + har tier ka typical room price + **Booking.com search link**
  (dates, guests ke saath) + Google Maps link. **Tier filter sach mein filter karta hai.** Google Places key ho to asli hotels + rating.
- **Food (`/restaurants`)**: curated places, **Pure veg only** filter, cost for two; list nahi hai to saaf bata deta hai.
- **Favourites ❤️ account mein** (`User.favorites`, `GET/PUT/DELETE /api/favorites/:slug`); guest ko login pe bhejta hai aur wapas.
- Home: "Good time to go now" (is mahine ke best destinations) — purane hardcoded cards aur nakli ⭐ ratings hata diye.
- HotelsView / RestaurantsView ke 2 lint warnings khatam (pages naye likhe) → **lint 0 warnings**.
- Tests: 9 server (catalog, search/sort, aliases, stays/food, favourites, photos with fake Wikipedia), browser.

**Depends on:** 3, 4, 8 — **Affects:** 11, 12, 16

### Part 11 — Weather + packing list + how to reach ✅
**Kya kiya**
- **Weather (Open-Meteo)** `GET /api/travel/weather`: agle **16 din** = asli forecast (max/min °C, baarish %, icon);
  usse aage = **"typical"** (pichhle 3 saal ki same dates ka average, saaf likha "usual — not a forecast"); beete din = actual.
  Cache: forecast 3 h, typical 180 din. Attribution "Weather data by Open-Meteo.com" (CC BY 4.0). Service down → 503 + saaf message.
- Itinerary mein **"Weather & Packing"** tab + har din ke upar mausam chip ("Rain • 15°/2° • 70% rain").
- **Packing list** (`shared/src/utils/packing.js`): mausam (thand, garmi, baarish), plan ki activities (temples, beach, trek, rafting,
  desert...), destination ka terrain (high altitude, remote), food preference aur log — har item ke saath **kyun** (reason).
  Ticks trip ke saath save (`packingChecked`, thoda ruk ke PUT), "Print list".
- **How to reach** `GET /api/travel/reach?from=&to=&date=`: starting city (27 shehar, airport + station codes ke saath; ya map se dhoondha shehar)
  → ✈️ flight / 🚆 train / 🚌 bus / 🚗 car / ⛴️ ship, andaaze ka time, steps, aur **Google Flights / IRCTC / redBus / Google Maps** links.
  "Best fit" distance aur time se (14 h se lamba road/rail → flight; islands → flight). Koi fare nahi banaya.
- Wizard step 3 mein **"Starting from"** (optional) — trip ke saath save, "Getting there" tab mein badla ja sakta hai.
- Tests: 7 server (fake Open-Meteo / OSRM / Nominatim), shared (weather codes, cities, packing rules), browser.

**Depends on:** 6, 8 — **Affects:** 12, 13, 14

### Part 12 — Itinerary editor ✅
**Kya kiya**
- Itinerary tab pe **"Edit plan"** → editor (header ka purana "Edit" ab **"Edit details"** hai: destination / dates / budget badalne ke liye).
- **Drag & drop (`@dnd-kit`)**: ⠿ handle se activity upar-neeche (mouse, touch, keyboard: Space → ↑/↓ → Space).
  Left mein kisi **din pe drop** → activity us din pe chali jaati hai (apne time pe). Screen reader ko jagah ke naam bole jaate hain.
- **Time apne-aap:** kheenchi hui activity us activity ka time le leti hai jis pe drop hui (ya pichhli wali ke khatam hone pe shuru);
  baad wali sirf tab aage khiskti hain jab takraayein — baaki din ka time same (lunch upar kiya to dinner 7:30 PM hi rehta hai).
- **Add / Edit / Remove**: form (naam, type, din, start/end time, cost, duration, description, tip) — wahi Zod rules jo server pe.
  **Ideas**: destination ki curated jagahein (map position, typical fee × log, time, tip ke saath — ek click mein form bhar jaata hai),
  highlights, khaane ki jagahein. "Already in your plan on Day 1: ..." warning. Din ka title wahin edit.
- **Budget live:** har badlaav pe din ka kharcha, trip estimate, "over budget", Cost Breakdown, packing list turant update
  (shared `applyEdit` → `normalizeItinerary`). Toolbar mein "Est. ₹X of ₹Y".
- **Route apne-aap:** badle hue din ka hi naya road route (~1.5 s baad, kai edits = ek update). Naye typed place map pe dhoondhe jaate hain
  (offline plans mein bhi); curated idea ki position saath aati hai → koi lookup nahi.
- **Undo / Redo** (30 steps; Ctrl+Z, Ctrl+Y / ⌘+Shift+Z) + har change ke toast mein **Undo**. Ek din mein 1–15 activities (khaali din nahi).
- **Time overlap warning** ("Starts before X ends (11:00 AM)"). Saved trip edit → "This trip has changes that are not saved yet" →
  Save changes / Discard. Save ke beech edit kiya to wo edit bachta hai.
- Shared `shared/src/itinerary/edit.js` (move / add / update / remove / updateDay + `ItineraryEditSchema`) — **Part 13 ka AI chat yahi edits propose karega**.
- Tests: shared edit + time (52 shared total), server 2 (edited plan: sirf naya place lookup, sirf badle din ka route, save), browser 11 + AI plan.

**Depends on:** 5, 8 — **Affects:** 13, 14

### Part 13 — AI Trip Chat ⏸ (on hold)
- "Day 2 relaxed kar do" → AI changes propose kare → preview (diff) → Apply.
- Output Part 2 schema se validate; save Part 12 wale path se.
- **Abhi hold pe** (tumhare kehne pe). Kisi aur part ko iski zarurat nahi. Milta-julta kaam pehle se: Part 9 "New plan for this day"
  (pace + AI ke liye wish) aur Part 12 editor. Baad mein karna ho to `ItineraryEditSchema` / `applyEdit` / Undo taiyaar hain.

### Part 14 — Sharing & export ✅
**Kya kiya**
- Itinerary header mein **"Share"** (purane Copy / Print ki jagah) → ek dialog:
  - **Share link** on/off (default off). Link `/share/<11 random characters>` — guess nahi ho sakta. Copy link, **WhatsApp**,
    phone ka share sheet, **QR code** (download bhi), "Opened N times", **New link** (purana band). Off karke on → wahi link.
  - Unsaved plan: "Save the trip first" + Save button. Unsaved changes ho to note: "link saved version dikhata hai".
  - **Downloads:** asli **PDF** (server pe PDFKit), **Calendar (.ics)**, Copy as text, Print.
- **Public page `/share/:slug`** (login nahi chahiye): read-only — din, map, stays & food, costs; PDF, Calendar, Copy link.
  **"Save a copy to my trips"** (login ke baad wahi page) → apna alag trip. Owner ko "This is how others see your trip" + views.
  Link band / badla → "This shared trip is not available".
- **Private cheezein kabhi public nahi:** e-mail, home city, AI ke liye notes, packing ticks, (Part 15 ke) expenses. Sirf owner ka first name.
- **PDF:** cover (facts, budget verdict, days at a glance, link on ho to QR), har din ek page (time, jagah, cost, tip, agle stop tak drive),
  stays, food, cost estimate, notes, page numbers. Font Noto Sans (₹ sign ke liye; OFL licence, `server/assets/fonts`). Text searchable.
- **Calendar (.ics, RFC 5545):** har din ek all-day event + har timed activity ek event (IST → UTC), location, GEO, tip, cost, link.
  Google Calendar: Settings → Import & export → Import. Har event ka pakka UID (trip id se), isliye calendar apps use pehchaan sakte hain.
- My Trips pe **"Shared"** badge. Share on/off se trip ka `updatedAt` nahi badalta.
- Tests: shared 3 (calendar), server 5 (share, privacy, views, new link, copy, PDF), browser 7.

**Depends on:** 5 — **Affects:** 16 (Hindi PDF ke liye font mein Devanagari pehle se), 18 (share link previews / OG tags deploy pe)

### Part 15 — Expense tracker + bill split ✅
**Kya kiya**
- Saved trip pe naya tab **"Expenses"** (unsaved plan: "Save the trip to track..."). Sirf owner dekhta hai —
  share page / PDF mein kabhi nahi.
- **Log (people):** sirf naam, account nahi chahiye. Pehli baar travellers ki ginti se: tumhara first name + "Traveller 2, 3...".
  Rename / add / remove ("Edit people"); jo kisi kharche mein hai use hata nahi sakte (saaf message).
- **Kharcha:** kya, kitna (₹, paise tak), type (Stay, Food & drinks, Local transport, Tickets & activities, Travel to & from,
  Shopping, Other), date, kisne diya, **bata kaise**: barabar (kis-kis mein, har ek ka hissa dikhta hai) ya **exact amounts**
  ("₹100 still to share out" live; server pe bhi check). Note optional. Edit / delete (toast mein **Undo**).
- **Paise mein hisaab** (integer): ₹100 / 3 = 33.34 + 33.33 + 33.33 — kabhi ek paisa bhi idhar-udhar nahi.
- **"Who paid, who owes":** har insaan ka paid, share, "gets back / owes / even". **Settle up:** sabse kam payments
  (greedy, max people − 1) — "Aman → Neha ₹3,500" + **Mark as paid** (payment record, Undo bhi). Sab barabar → "Everyone is even."
- **Spent vs the plan** chart: plan ke 4 hisson (stay, activities, food, local transport) ka estimate (tick) vs asli kharcha (bar);
  zyada hua to amber + "₹X over" (sirf rang nahi). "Outside the estimate" (travel, shopping, other) alag. Hover / focus pe
  detail, **Table** view bhi. Upar: Spent so far, budget meter (kitna bacha / kitna upar), plan estimate se farak.
- **Spreadsheet (.csv)** download (Excel / Google Sheets, ₹ sahi dikhe isliye BOM).
- Trip delete → uske kharche bhi delete. Demo account mein 3 sample kharche.
- Tests: shared 6 (paise, split, balances, settle up, summary, forms, CSV), server 5, browser 9.

**Depends on:** 4, 5 — **Affects:** 17 (admin charts), 18

### Part 16 — UI polish ⏭ (skipped)
- Dark mode, Hindi/English toggle (AI output bhi Hindi), skeleton loaders, toasts, route-level code-splitting, mobile check.
- **Skip kiya** (tumhare kehne pe). Jo pehle se hai: toasts (Undo ke saath), har naye page ka phone-size check (390 px),
  loading states. Baad mein karna ho to: PDF font mein Devanagari pehle se hai; `preferences.language` field taiyaar hai.

### Part 17 — Admin dashboard ✅
**Kya kiya**
- **Admin kaun:** `ADMIN_EMAILS` (server `.env`, comma se alag) ya `npm run admin -w server -- add you@example.com`.
  Demo account kabhi admin nahi. Baaki sab ko `/api/admin/*` pe 403, bina login 401.
- **`/admin` page** (menu mein "Admin dashboard", sirf admins ko dikhta hai):
  - Upar numbers: accounts (+naye), saved trips (+naye), share links on, expenses (ginti + total), messages (unread), aaj ke AI plans.
  - **7 / 30 / 90 din** filter. Charts: trips per day, new accounts per day, AI plans per day (AI on ho to), popular destinations
    ("Goa" aur "goa " ek hi), plans kisne banaye (Gemini / offline / sample), cache (AI plans, places, routes, weather).
    Hover pe detail, har time chart ka **Table** view, screen reader ke liye summary. Din IST mein gine jaate hain.
  - **Contact messages inbox:** New / Read filter, Mark as read / unread, Reply (e-mail), Delete (confirm).
  - **Accounts:** search (naam / e-mail), role, kitne trips, joined, last login.
- **Privacy:** stats mein sirf ginti / totals — kisi ka plan, kharche ki details ya e-mail stats mein nahi.
- Tests: server 3 (sirf admin, stats ke numbers, inbox + accounts), browser 5.

**Depends on:** 4, 15 — **Affects:** 18

### Part 18 — Final ✅
**Kya kiya**
- **Ek service = app + API (production):** `NODE_ENV=production` mein Express `client/dist` bhi serve karta hai —
  `/assets/*` 1 saal cache (naam mein hash), pages kabhi cache nahi, `/trips/123` jaise deep links → React app, `/api/*` JSON hi.
  Vercel + Render alag ki jagah ek Render service: login cookie Safari mein bhi chalti hai (third-party cookie nahi),
  live events bina proxy setting, aur `/share/:slug` pe **WhatsApp / Telegram preview** (trip ka naam, din, photo — Open Graph tags,
  view count nahi badhta).
- **Security headers:** Helmet Content Security Policy (scripts sirf apni site se; images https; confetti worker `blob:`),
  `Referrer-Policy: strict-origin-when-cross-origin` (OpenStreetMap tiles ko Referer chahiye).
- **Deploy files:** `render.yaml` (Blueprint: free web service, Singapore, health check `/api/health`, JWT_SECRET apne-aap,
  MONGODB_URI / GEMINI_API_KEY / ADMIN_EMAILS dashboard mein), `.node-version` (22), `Dockerfile` (multi-stage, production
  packages, non-root, health check), `.dockerignore`. Guide: `docs/DEPLOY.md`.
- **CI (Part 7 ka kaam):** `.github/workflows/ci.yml` — har push / PR pe Node 22 + MongoDB 7 → `npm ci` → `npm run check`.
- **API docs:** `/api/openapi.json` (OpenAPI 3.1, request bodies shared Zod schemas se bante hain) + `/api/docs` (padhne layak page,
  bina script — CSP ke andar). Test: docs mein **exactly wahi** routes jo server pe hain. Footer mein "API Documentation" link.
- **Map fix:** tab badalte waqt zoom animation chal rahi ho to Leaflet crash ("_leaflet_pos") nahi karta; pehla fit bina animation.
- **Docs:** README dobara, `docs/ARCHITECTURE.md` (layers, use cases, DFD 0/1, sequence, ER, algorithms, security, deployment —
  `docs/diagrams/` mein PNG + Graphviz source), `docs/DEPLOY.md`, `docs/TESTING.md`. Version **2.0.0**.
- Tests: server 104 (naye 7: production serving + docs), shared 61 → **165**. Production build pe saare browser checks pass.

**Jo jaan-boojh kar nahi kiya:** client ke liye Vitest / React Testing Library (naye packages) — UI logic `shared/` mein hai
aur unit-tested hai, UI har part mein browser (Playwright) se check hui. Asli deploy tumhare Render / GitHub / Atlas accounts se
hoga (`docs/DEPLOY.md`).

**Depends on:** sab
