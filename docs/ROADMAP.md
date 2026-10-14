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
| 5 | Trips CRUD + URL by trip id | 4 | ⬜ |
| 6 | Real Gemini AI | 2, 5 | ⬜ |
| 7 | Deploy v1 (live URL) + CI | 6 | ⬜ |
| 8 | Real map: geocoding + road routes | 6 | ⬜ |
| 9 | Streaming generation + regenerate one day | 6 | ⬜ |
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
- After **Part 7** → *Viva-safe*: real login, real DB, real AI, live URL.
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
- Fake "Landmark 1A" itinerary, purana Gemini SDK → **Part 6**
- Map distance "98 km" hardcoded → **Part 8**

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

### Part 5 — Trips CRUD + URL by trip id
- Routes: `/trips/new` (wizard), `/trips/:id` (itinerary), `/trips/:id/edit`. Refresh pe trip gayab nahi, link bookmark ho sakta hai.
- Unsaved itinerary refresh pe na khoye (session storage draft).
- My Trips: title rename inline, sort (date / budget).
- (Pehle ho chuka: Save = update, Edit prefill + preferences (Part 2/3), phase tabs, ownership (Part 3).)
- Server: validation, no mass-assignment (sirf allowed fields update), ownership check.
- **Affects:** 6, 11–16

### Part 6 — Real Gemini AI
- `@google/genai`, model `GEMINI_MODEL` env se, `responseSchema` (Part 2 schema se), Zod validation, 1 retry + timeout.
- Prompt mein travel pace, stay type, diet, notes ka sahi use; costs "poore group ka total" (Part 2 convention).
- AI na chale to **honest sample mode** (8 destinations ke curated plans, badge: "Sample plan — AI offline"), "Landmark 1A" jaisa fake data khatam.
- `AiCache` model: same input → turant result. Per-user daily limit (login ab hai, Part 4). React ErrorBoundary.
- **Needs from you:** Gemini API key (free, aistudio.google.com).
- **Affects:** 7, 8, 9, 11, 13

### Part 7 — Deploy v1 + CI
- Client → Vercel, Server → Render, DB → Atlas. Production env vars, CORS, cookies (`COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`), `TRUST_PROXY=true`.
- GitHub Actions: har push pe `npm run check`.
- **Needs from you:** GitHub, Vercel, Render accounts (free).

### Part 8 — Real map
- Geocoding service (Nominatim, cache in DB, 1 req/sec) → AI ke places ke sahi coordinates.
- Routing service (OSRM) → har din ka asli road route, distance, time ("98 km" hardcode khatam).
- Map: `fitBounds`, hotels/restaurants ke pins, card click → map pe focus.
- **Affects:** 10, 11, 12

### Part 9 — Streaming + regenerate one day
- Server-Sent Events: din ek-ek karke screen pe aate hain (progress bar).
- "Sirf Day 3 dobara banao" button.

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
