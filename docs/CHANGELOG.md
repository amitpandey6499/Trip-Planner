# Changelog

Har roadmap part ka delivery note: kya badla, kis part pe asar, naye env variables, kaun si command chalani hai.

---

## Part 18 — Final: production, deploy setup, CI, API docs, docs (tag `part-18`, v2.0.0)

**Part 7 (deploy + CI) yahin poora hua. Project complete** — Part 13 (AI chat) hold pe, Part 16 skip.

### Chalane ke liye
1. `npm install` (koi naya package nahi)
2. `npm run dev` → http://localhost:5173 (pehle jaisa). API docs: http://localhost:5000/api/docs
3. Online daalna: `docs/DEPLOY.md` (GitHub → Render Blueprint → `MONGODB_URI`).

**Naye env variables (optional):** `SERVE_CLIENT` (auto), `CLIENT_DIST_DIR`, `TRUST_PROXY` (ab `.env.example` mein),
`RENDER_EXTERNAL_URL` (Render khud set karta hai). `CLIENT_URL` khaali ho to Render ka address use hota hai.

### Kya badla
| Pehle | Ab |
| --- | --- |
| Production ke liye client aur server alag host karne padte | `NODE_ENV=production` + `npm run build` → **ek server** app + API dono serve karta hai |
| Share link WhatsApp pe sirf "TripPlanner" | `/share/:slug` pe trip ka naam, din, dates, photo (Open Graph preview) |
| Helmet default (React app ke liye set nahi) | CSP: scripts sirf apni site, images https, confetti worker, Google Fonts; OSM ke liye Referrer-Policy |
| Map tab se jaldi hatne pe kabhi-kabhi crash (`_leaflet_pos`) | Leaflet zoom timer guard; pehla fit bina animation |
| API ki list sirf README mein | `/api/docs` page + `/api/openapi.json` (shared schemas se), test se hamesha sahi |
| Deploy / CI nahi | `render.yaml`, `Dockerfile`, `.dockerignore`, `.node-version`, `.github/workflows/ci.yml` |
| README purana | README dobara + `docs/ARCHITECTURE.md` (diagrams), `docs/DEPLOY.md`, `docs/TESTING.md` |
| Rate limits sab per IP (300 / 15 min, map-weather 20 / min, AI 10 / min) | general **1000** / 15 min, map-weather **60** / min; AI, map aur PDF limits login ho to **har account ke liye alag** — college lab / hostel WiFi mein sab ka ek hi public IP hota hai, demo ke beech "Too many requests" na aaye |

### Naye files
- `server/src/web/clientApp.js` (built app, cache headers, share preview), `server/src/docs/openapi.js`, `server/src/docs/docsPage.js`
- `server/test/web.test.js` (4), `server/test/docs.test.js` (3)
- `render.yaml`, `Dockerfile`, `.dockerignore`, `.node-version`, `.github/workflows/ci.yml`
- `docs/ARCHITECTURE.md`, `docs/DEPLOY.md`, `docs/TESTING.md`, `docs/diagrams/*` (PNG + `.dot`)

### Tests
- Server **104** (naye 7), shared 61 → **165**, lint 0 warnings, build OK.
- Production build (`NODE_ENV=production`, port 5050) pe saare browser checks (editor, share page guest, expenses, admin) —
  koi console error nahi. Docker image build + run + health check `healthy` (sandbox mein Docker Hub band tha, isliye local
  Node base image se; Alpine ke packages lockfile mein hain).
- Render pe asli deploy aur GitHub Actions ka asli run tumhare accounts se hoga — files `actionlint` aur YAML check se validate kiye.

---

## Part 17 — Admin dashboard (tag `part-17`)

**Part 16 (UI polish) skip kiya** (tumhare kehne pe).

### Chalane ke liye
1. `npm install` (koi naya package nahi)
2. `server/.env` mein `ADMIN_EMAILS=tumhara@email.com` (ya account banane ke baad `npm run admin -w server -- add tumhara@email.com`)
3. `npm run dev` → login → menu (naam pe click) → **Admin dashboard**

**Naya env variable (optional):** `ADMIN_EMAILS`.

### Kya badla
| Pehle | Ab |
| --- | --- |
| `role: 'admin'` model mein tha, use kahin nahi | admin = `ADMIN_EMAILS` ya stored role; `/api/admin/*` sirf admins ke liye |
| Contact form ke messages sirf database mein | **inbox**: padho, read / unread, reply, delete |
| App kaise use ho raha hai, pata nahi | **dashboard**: trips / sign-ups / AI plans per day, popular destinations, plan source, cache, KPIs |

### Naye files
- `server/src/services/adminService.js`, `server/src/controllers/adminController.js`, `server/src/routes/adminRoutes.js`,
  `server/scripts/admin.js` (`npm run admin -w server`), `server/test/admin.test.js`
- `client/src/pages/AdminDashboard.jsx`, `client/src/components/admin/Charts.jsx` (DailyColumns, RankedBars, StatTile — bina chart library)
- Shared: `AdminStatsQuery` (`ADMIN_RANGES` 7 / 30 / 90), `MessageStatusSchema`, `AdminUsersQuery`

### Data contract
- Koi naya collection nahi. `ApiError.conflict` (409) helper. `docs/CONTRACTS.md` → "Admin".

### Tests
- Server **97** (naye 3), shared 61. Browser 5 checks (normal user → "Admins only" + API 403; admin menu, KPIs, chart hover,
  table view, 7 days; inbox read / filter / delete; accounts search; phone). Purane sab browser checks pass.
- Sandbox ka test database nested field projection support nahi karta (asli MongoDB karta hai) — isliye plan source
  filter se gina jaata hai, dono pe chalta hai.

---

## Part 15 — Expense tracker + bill split (tag `part-15`)

### Chalane ke liye
1. `npm install` (koi naya package nahi)
2. `npm run dev` → koi saved trip → **Expenses** tab → "Edit people" (naam) → **Add expense**
3. Demo account dobara banana ho (sample kharchon ke saath): `npm run seed -w server -- --reset`

Koi naya env variable nahi.

### Kya badla
| Pehle | Ab |
| --- | --- |
| Sirf andaaze ka budget | **asli kharche** track: kya, kitna, type, date, kisne diya |
| Dosto mein hisaab = WhatsApp pe calculator | **split** barabar ya exact amounts, **kaun kisko kitna** (sabse kam payments), **Mark as paid** |
| Plan ka estimate kitna sahi tha, pata nahi | **Spent vs the plan** chart + table, budget meter, "outside the estimate" |
| — | **.csv** download (Excel / Google Sheets) |

### Naye files
- `shared/src/expenses/{money,ledger}.js` (toPaise, formatPaise, splitEvenly, sharesOf, computeBalances, suggestSettlements,
  expenseSummary, buildLedger, expensesToCsv), `shared/src/schemas/expense.js` (ExpenseInputSchema, SettlementInputSchema,
  TripMembersSchema), `shared/test/expenses.test.js`
- `server/src/models/Expense.js`, `server/src/services/expenseService.js`, `server/src/controllers/expenseController.js`,
  `server/test/expenses.test.js`
- `client/src/components/expenses/{ExpensesPanel,ExpenseDialog,PeopleDialog,SpendingVsPlan}.jsx`, `client/src/hooks/useExpenses.js`

### Data contract
- Naya collection `expenses` (paise mein, `kind: expense | settlement`); trip pe `members: [{ id, name }]`.
- Shared: `EXPENSE_CATEGORIES`, `LIMITS.MAX_TRIP_MEMBERS` (20), `MAX_EXPENSES_PER_TRIP` (500), `MAX_EXPENSE_RUPEES` (10 lakh).
- Poora shape: `docs/CONTRACTS.md` → "Expenses".
- Chhota fix: `npm run seed` ab sahi trip count batata hai.

### Doosre parts pe asar
- **Part 17 (admin):** kharchon ke aggregate charts (sirf ginti / totals, kisi ka naam nahi).
- **Part 18:** API docs mein naye endpoints.

### Tests
- Shared **61** (naye 6), server **94** (naye 5: people, do tabs ek saath, add / edit / delete, settle up + undo, share page pe kuch nahi).
- Browser 9 checks (save first, people, equal split + validation, exact split, chart + table + tooltip, settle up + Undo,
  edit / delete + Undo, CSV + person in use, reload + phone). Saare purane browser checks (Parts 2–14) dobara pass.
- Testing mein mila aur theek kiya: pehli baar Expenses tab do requests ek saath kholein (React dev mode / do tabs) to ek fail ho
  jaati thi (500) — ab default log ek hi baar, atomically likhe jaate hain.

---

## Part 14 — Sharing & export: share link, QR, WhatsApp, PDF, calendar (tag `part-14`)

**Part 13 (AI Trip Chat) abhi hold pe** (tumhare kehne pe) — kisi aur part ko uski zarurat nahi.

### Chalane ke liye
1. `npm install` (naye packages: server `pdfkit`, `qrcode`; client `qrcode`)
2. `npm run dev` → koi trip kholo → header mein **Share**
3. Deploy pe (Part 18) `server/.env` mein `PUBLIC_APP_URL=https://your-site` (PDF ke QR code ke liye). Abhi khaali = `CLIENT_URL`.

**Naya env variable (optional):** `PUBLIC_APP_URL`.

### Kya badla
| Pehle | Ab |
| --- | --- |
| "Copy" (text) aur "Print" buttons | ek **Share** dialog: link, WhatsApp, QR, PDF, calendar, text, print |
| Trip kisi ko dikhana = screenshot | **share link** `/share/:slug` (on/off, new link, views), bina login dekh sakte hain |
| PDF = browser ka print (adha-adhoora) | **asli PDF**: cover + har din ek page + stays / food / costs, ₹ sahi, page numbers, QR |
| Calendar nahi | **.ics** file: har din + har timed activity, Google / Outlook / Apple Calendar mein import |
| Dost ka plan apna banana = dobara banao | **"Save a copy to my trips"** |

### Naye files
- `shared/src/utils/calendar.js` (buildTripCalendar, icsText, foldIcsLine), `shared/test/calendar.test.js`
- `server/src/services/shareService.js`, `server/src/services/export/tripPdf.js`, `server/src/controllers/shareController.js`,
  `server/src/routes/shareRoutes.js`, `server/assets/fonts/` (Noto Sans Regular + Bold, OFL.txt), `server/test/share.test.js`
- `client/src/components/share/ShareDialog.jsx`, `client/src/pages/SharedTripPage.jsx`,
  `client/src/utils/{download,tripText,tripLinks}.js`

### Data contract
- Trip: `share: { enabled, slug, createdAt, views }` (default off; unique sparse index on `share.slug`). Purane trips valid.
- Naye endpoints aur shapes: `docs/CONTRACTS.md` → "Sharing & export".
- Shared constants: `BUDGET_BUCKETS` (cost labels), `formatDateLong`. Request schemas: `ShareSettingsSchema`, `TripPdfSchema`.

### Doosre parts pe asar
- **Part 15:** expenses kabhi share page / PDF mein nahi jaayenge (private).
- **Part 16:** Hindi PDF — Noto Sans mein Devanagari glyphs hain (shaping baad mein check).
- **Part 18 (deploy):** `PUBLIC_APP_URL`; WhatsApp link preview (Open Graph tags) ke liye server ko `/share/:slug` HTML serve karna hoga.

### Tests
- Shared **55** (naye: calendar 3), server **89** (naye: share 5 — privacy, views, off / on / new link, copy, PDF).
- Browser 7 checks (unsaved → save first; link on, QR, WhatsApp, copy; guest page + PDF; save a copy; owner views + badge;
  off + new link; phone size). Downloaded PDF aur .ics files khol ke check kiye (pdftotext / pdftoppm).
- **Sach:** WhatsApp / Google Calendar apps yahan nahi khul sakte — link ka format aur .ics file check ki; phone pe ek baar try kar lena.

---

## Part 12 — Itinerary editor: drag & drop, add / edit / remove, undo (tag `part-12`)

### Chalane ke liye
1. `npm install` (naye packages: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`)
2. `npm run dev` → koi trip kholo → Itinerary tab → **Edit plan**
3. ⠿ se kheencho (ya Tab se handle pe aao → Space → ↑/↓ → Space), left mein kisi din pe chhodo, **+ Add an activity**, ✏️ / 🗑️,
   din ka title badlo, Ctrl+Z / Ctrl+Y → **Save Trip** / **Save changes**.

Koi naya env variable nahi. Koi naya API endpoint nahi (save purane `POST /api/trips` se; server dobara validate karta hai).

### Kya badla
| Pehle | Ab |
| --- | --- |
| Plan pasand nahi → poora (ya ek din) dobara generate | **haath se badlo**: drag & drop, din badlo, add / edit / remove, din ka title |
| Activity ka order / time fixed | drag → time apne-aap (sirf jo takraaye wo aage khiskta hai), overlap ki warning |
| — | **Ideas**: curated jagahein (position, fee, time, tip ke saath), highlights, khaana; "already in your plan" |
| Budget sirf generate pe | har badlaav pe din / trip estimate, over-budget, Cost Breakdown, packing list turant |
| Map sirf naye plan pe | badla din → sirf uska naya route (~1.5 s baad); nayi typed jagah map pe dhoondhi jaati hai (offline plans mein bhi) |
| Galti se kuch hata diya → wapas nahi | **Undo / Redo** (30 steps, Ctrl+Z / Ctrl+Y) + har toast mein Undo |
| Header "Edit" (confusing) | "Edit details" (dates / budget) aur "Edit plan" (activities) alag |
| Banner "This is a new version..." | "This trip has changes that are not saved yet." (regenerate aur haath ke edits dono) |

### Naye files
- `shared/src/itinerary/edit.js` (applyEdit, move / add / update / remove / updateDay, ItineraryEditSchema, ActivityInputSchema,
  retimeAfterReorder, timeOverlaps), `shared/src/utils/time.js` (time slot text ↔ minutes), `shared/test/edit.test.js`
- `client/src/components/ActivityCard.jsx` (view aur edit mode ek hi card),
  `client/src/components/editor/{ItineraryBoard,SortableActivity,ActivityDialog,EditToolbar}.jsx`

### Badle files (main)
- `TripContext`: `editItinerary`, `undoEdit` / `redoEdit`, toast mein button (Undo), edit ke baad map 1.5 s ruk ke;
  save ke beech edit hua to wo bachta hai ("not saved" rehta hai).
- `DayTimeline`: edit mode (sortable list, din ka title, Add), "Updating the road route..." chip.
- `mapService`: offline plan mein bina position wali (haath se likhi) jagah ab dhoondhi jaati hai.
- Destination detail mein `places` (offline planner ki curated jagahein = Ideas). Offline planner shared `formatTimeSlot` use karta hai.

### Data contract
- Itinerary shape same (koi migration nahi). Naya `LIMITS.MAX_ACTIVITIES_PER_DAY` (15), `LIMITS.MAX_ACTIVITY_COST`. Naye activities ka id `u-xxxxxx`.
- Poora edit format: `docs/CONTRACTS.md` → "Editing a plan".

### Doosre parts pe asar
- **Part 13 (AI chat):** AI `ItineraryEditSchema` wale edits propose karega → `applyEdit` se check + apply → Undo bhi wahi.
- **Part 14 (share / PDF):** edit kiya hua plan hi share / export hoga.
- **Part 16 (UI / Hindi):** editor ke text translate.

### Tests
- Shared **52** (naye: time slots, drag up / down / middle, lunch upar → dinner same, din badalna, add / update / remove, khaali / full din,
  known position), server **84** (naye 2: edited plan → sirf typed jagah ka lookup, sirf badle 2 din ke route, save ke baad order / budget same;
  na mili jagah map pe nahi, khaali din save pe 400).
- Browser: editor ke 11 checks (mouse + keyboard drag, din pe drop, undo / redo, add with ideas + validation, overlap, remove + Undo,
  rename, save + reload, Discard, phone size) + AI plan pe add / move / save; purane sab checks (Parts 2–11) dobara pass.
- **Sach:** map services aur Gemini yahan fake the (same API). Drag & drop asli Chromium mein mouse aur keyboard se test hua;
  phone pe touch se ek baar khud try kar lena.

---

## Parts 10 + 11 — Destinations, photos, stays, favourites + Weather, packing list, how to reach (tags `part-10`, `part-11`, ek hi commit)

Ek commit kyunki Part 11 ka mausam, packing list aur "how to reach" Part 10 ke destination data (center, terrain, airport / station) pe tike hain.

### Chalane ke liye
1. `npm install` (koi naya package nahi)
2. `npm run dev` → server start pe **26 destinations MongoDB mein** apne-aap aa jaate hain, aur background mein Wikipedia se photos
   (terminal: `[Photos] ...`). Haath se: `npm run photos -w server`.
3. Explore → koi destination → **destination page** (photo, best months, 7 din ka mausam, "How to get there").
   Trip → **Weather & Packing** aur **Getting there** tabs.
4. Koi key nahi chahiye. Free services ki **policies** (`docs/MAP_SERVICES.md`): Open-Meteo free API sirf **non-commercial**
   (https://open-meteo.com/en/terms), Wikimedia har request pe User-Agent maangta hai — `GEO_USER_AGENT` mein apni site / e-mail daal do.

**Naye env variables (sab optional):** `PHOTOS_ENABLED` (true), `WIKIPEDIA_API_URL`, `WEATHER_ENABLED` (true), `OPEN_METEO_URL`,
`OPEN_METEO_ARCHIVE_URL`. `GEO_USER_AGENT` ab sab outside services pe jaata hai. `MAP_RATE_LIMIT_PER_MIN` weather / reach pe bhi.

### Kya badla
| Pehle | Ab |
| --- | --- |
| Destinations ek JSON file mein, "Popular" / "Hidden Gems" khaali | **26 destinations MongoDB mein**, har category bhari, search + sort ("good time to go now") |
| Stock photos (kai jagah galat jagah ki photo) | **Wikipedia** ki free-licence lead image + credit link, DB cache; na mile to placeholder |
| Hotels: "Grand Manali Palace Hotel" jaise **banaye hue naam**, nakli ⭐ ratings + reviews | stay **areas** + har tier ka typical price + **Booking.com search link** (dates ke saath). Rating sirf Google Places se |
| Hotels tier filter kuch filter nahi karta tha | Budget / Moderate / Luxury sach mein filter (URL `?budget=`) |
| Restaurants pe "Veg Friendly", "Free WiFi" jaise default tags | curated places, **Pure veg only** filter, list nahi to saaf message |
| ❤️ sirf dikhawe ka | **favourites account mein** (`/api/favorites`), "My favourites (N)" |
| Home pe hardcoded cards + ⭐ 4.8 | "Good time to go now" — is mahine ke best destinations (DB se) |
| Mausam kahin nahi | trip dates ka **forecast** (16 din), aage ki dates ka **typical** mausam (pichhle 3 saal), har din pe chip |
| Packing list nahi | mausam + activities + terrain + food + log ke hisaab se list, har item ka reason, ticks trip ke saath save |
| "Kaise pahunchein" nahi | starting city → flight / train / bus / car (time andaza) + Google Flights / IRCTC / redBus / Maps links, "Best fit" |
| HotelsView / RestaurantsView: 2 lint warnings | pages naye, **lint 0 warnings** |

### Naye files
- `server/src/data/destinationCatalog.js`, `server/src/models/Destination.js`, `server/scripts/photos.js`, `server/src/middleware/validateQuery.js`
- `server/src/services/{destinationService,photoService,recommendationService,favoriteService,weatherService,reachService}.js`
- `server/src/controllers/{destinationController,travelController}.js`, `server/src/routes/{destinationRoutes,travelRoutes}.js`
- `shared/src/utils/{links,weather,packing}.js`, `shared/src/data/originCities.js`
- `client/src/pages/DestinationPage.jsx`, `client/src/components/{DestinationImage,DestinationPicker,FavoriteButton}.jsx`,
  `client/src/components/travel/{WeatherIcon,WeatherPanel,PackingList,ReachPanel}.jsx`, `client/src/hooks/{useFavorites,useWeather,useDestinationList}.js`
- `server/test/{destinations,travel}.test.js`, `shared/test/travel.test.js`

**Hataye:** `server/src/data/destinations.json`, `services/placesService.js`, `controllers/placesController.js`, `routes/{placesRoutes,recommendationsRoutes}.js`.
Purane URLs `/api/places/search` aur `/api/places/:slug` ab bhi chalte hain (naye code pe).

### Data contract
- Trip: `packingChecked: string[]` (naya), `preferences.originCity` (wizard step 3 + "Getting there" se). `PUT /api/trips/:id` dono le sakta hai.
- Itinerary schema se khaali placeholders `weather`, `packingList`, `transportOptions` hata diye — ye roz badalte hain, isliye save nahi hote,
  server se aate hain. Purane trips valid. `User.favorites: string[]`.
- Poora shape: `docs/CONTRACTS.md` (Destinations, Stays + food, Favourites, Weather, Packing list, How to reach).

### Doosre parts pe asar
- **Part 12 (editor):** activity badli → packing list apne-aap (client pe banti hai); places ke liye `DestinationPicker` reuse.
- **Part 13 (chat):** AI ko mausam + reach data context mein de sakte hain.
- **Part 14 (share/export):** packing list "Print list" pehle se; PDF mein mausam + packing.
- **Part 16 (UI / Hindi):** naye pages ke text translate karne honge.
- **Part 18 (deploy):** `GEO_USER_AGENT` mein site URL + e-mail; Open-Meteo commercial use pe paid plan.

### Tests
- Server **82** tests (naye: destinations 9, travel 7; purane places wale 2 hata), shared **43** (naye: weather codes, cities, packing, month ranges).
- Browser: Parts 10/11 ke 8 checks (fake Wikipedia / Open-Meteo / OSRM) + AI trip pe weather / packing / reach, purane sab checks (Parts 2–9) dobara pass.
- **Sach:** asli Wikipedia / Open-Meteo / Nominatim / OSRM / Gemini se yahan (sandbox) connect nahi ho sakta — tests fake services se hue
  jinki API same hai. Laptop pe ek baar destination page aur "Weather & Packing" tab khol ke dekh lena (photos server start ke ~1 min baad).

---

## Parts 8 + 9 — Real map + Streaming / regenerate one day (tags `part-8`, `part-9`, ek hi commit)

**Part 7 (deploy) skip kiya** (tumhare kehne pe) — Part 18 mein final deploy ke saath hoga. Part 8 aur 9 ko uski zarurat nahi.
Dono parts ek commit mein kyunki "ek din dobara banao" ke baad us din ka naya road route (Part 8) chahiye.

### Chalane ke liye
1. `npm install` (koi naya package nahi; Leaflet CSS ab bundle se aati hai)
2. `npm run dev` → koi trip banao → **progress window** mein din ek-ek karke → itinerary → **Map View** mein road route, km, time
3. Map services free hain, key nahi chahiye. Unki **usage policy** padh lo: `docs/MAP_SERVICES.md`
   (Nominatim: https://operations.osmfoundation.org/policies/nominatim/ — max 1 request/second, app ki pehchaan, cache;
   server ye sab apne-aap karta hai)

**Naye env variables (sab optional):** `MAP_ENABLED` (true), `NOMINATIM_URL`, `NOMINATIM_EMAIL`, `OSRM_URL`, `GEO_USER_AGENT`,
`GEO_TIMEOUT_SECONDS` (10), `GEO_CACHE_DAYS` (60), `MAP_RATE_LIMIT_PER_MIN` (20).

### Kya badla
| Pehle | Ab |
| --- | --- |
| Map pe stops ke beech seedhi dashed line, distance "straight-line" | asli **road route** (OSRM), road km + driving time, har stop ke beech leg |
| AI ke coordinates andaza (galat jagah pin bhi) | Nominatim se asli position; 300 km se door wale andaze hata diye; "approx." label |
| Map pe sirf us din ke stops | Stays + Restaurants pins (toggle), "View on Map" → us pin pe zoom + popup |
| Map galat jagah khulta (Manali default) | `fitBounds`: din ke saare stops + route screen mein |
| Leaflet CSS unpkg CDN se (internet na ho to map toot jaata) | npm package se bundle |
| Generate pe 30–60 s sirf spinner | **live progress**: "Day 2 of 4 is ready", din ek-ek karke, **Cancel** |
| Ek din pasand nahi → poora trip dobara | **"New plan for this day"** (pace + wish), baaki din same |
| Gemini timeout poore jawab pe | streaming mein "aakhri piece ke baad" timeout (lamba jawab nahi katta) |

### Naye files
- `shared/src/utils/map.js` (haversine, mapStops, routeSignature, estimateRoute, needsMapUpdate, formatKm/Duration), `shared/src/schemas/requests.js`
- `server/src/services/geo/{geoHttp,geocoder,router,mapService}.js`, `server/src/models/GeoCache.js`
- `server/src/controllers/mapController.js`, `server/src/routes/mapRoutes.js`, `server/src/utils/stream.js` (SSE)
- `server/src/services/ai/dayStream.js` (adhoore JSON se din nikalna)
- `server/test/{map,stream}.test.js`, `shared/test/map.test.js`
- `client/src/services/{stream,events}.js`, `client/src/components/GenerationOverlay.jsx`
- `docs/MAP_SERVICES.md`

### Data contract
- `day.route` = `{ provider: osrm|estimate|none, distanceKm, durationMin, stopIds, legs, geometry, signature }`,
  `activity/hotel/restaurant.locationSource` = `curated|geocoded|ai|none`, `itinerary.map` = summary. Sab optional — purane trips valid.
- Stays / restaurants ko ab `id` milta hai (`hotel-1`, `restaurant-1`).
- Purana khaali `itinerary.routes` field hata (kabhi use nahi hua).

### Doosre parts pe asar
- **Part 10:** destinations ke liye bhi geocoder + cache ready.
- **Part 11:** "How to reach" ke liye `haversineKm`, router reuse.
- **Part 12 (editor):** activity hilao → signature badlega → sirf us din ka route dobara (pehle se bana hai).
- **Part 13 (chat):** `regenerateDay` jaisa hi "AI change propose kare" flow.
- **Part 18 (deploy):** SSE ke liye proxy buffering band; `GEO_USER_AGENT` mein site URL.

### Tests
- Server **68** tests (naye: map 10, streaming + regenerate day 11), shared **36** (naye: map 7).
- Browser: AI mode (fake Gemini jo dheere stream karta hai + fake Nominatim/OSRM) 8 checks, offline mode 3, purane 49 checks.
- **Sach:** asli Nominatim / OSRM / Gemini se yahan (sandbox) connect nahi ho sakta — test fake services se hue jinki API same hai.
  Laptop pe ek baar Map View khol ke check kar lena.

---

## Parts 5 + 6 — Trip URLs + Real Gemini AI (tags `part-5`, `part-6`, ek hi commit)

Part 6 ka "regenerate / unsaved changes" Part 5 ke URLs pe tika hai, isliye dono ek saath.

### Chalane ke liye
1. `npm install` (`@google/genai` naya; purana `@google/generative-ai` hata)
2. **AI on karna ho to:** https://aistudio.google.com/apikey se free key → `server/.env` mein `GEMINI_API_KEY=...`
3. `npm run dev` → terminal: `[AI] Gemini model: gemini-3.8-flash, 20 plans per user per day.`
   (key nahi → `[AI] GEMINI_API_KEY is not set: the offline planner is used (8 curated destinations).`)

**Naye env variables (sab optional):** `AI_DAILY_LIMIT` (20), `AI_TIMEOUT_SECONDS` (45), `AI_CACHE_DAYS` (7). `GEMINI_MODEL` pehle se tha —
Google model band kare to app saaf bolega "model not found (check GEMINI_MODEL)"; naya naam https://ai.google.dev/gemini-api/docs/models se.

### Kya badla
| Pehle | Ab |
| --- | --- |
| Itinerary sirf `/itinerary` pe, refresh = trip gayab | har saved trip ka URL `/trips/:id` (refresh, bookmark, naya tab) |
| Generate ke baad refresh = plan gayab | session draft: refresh ke baad bhi wahi plan |
| Regenerate kiya to pata nahi chalta save hua ya nahi | "new version, not saved yet" banner: Save changes / Discard changes |
| My Trips mein naam badal nahi sakte, sort nahi | inline rename, sort (newest / start date / budget) |
| Purana SDK `@google/generative-ai` (support khatam), prompt mein pace/diet/stay nahi | `@google/genai`, JSON schema output, retry, timeout, pura prompt |
| Key na ho to fake "Landmark 1A, Restaurant 2" itinerary | offline planner: 8 destinations ke asli places, timings, fees, veg/non-veg food |
| Har request pe AI call | AiCache (same request free), per-user daily limit |
| AI fail → 500 / ajeeb error | offline planner + notice kyun; warna 422/503/429 saaf message |
| Hotels/restaurants pe nakli 4.5★, map pe "98 km / 3.5 hours" | sirf asli rating; distance stops ke coordinates se (straight-line) |
| Kisi page pe crash = poori app white | ErrorBoundary (Reload / Home) |
| Key nahi + "Shimla" → 4 steps bharo, phir error | step 1 pe hi batata hai kaun si 8 jagah chalengi (click karke chuno) |
| Home quick search fail → wizard khulta, error gayab | wizard mein wahi server message, sahi field ke neeche |
| Explore "Plan Trip" / quick search khule hue trip ki preferences badal dete the → us trip ka Regenerate galat jagah ka plan bana deta | open trip ki preferences alag (`planPreferences`); Save / Regenerate / Edit sirf unhe use karte hain |
| Unsaved plan ke saath doosra trip kholo → plan chupchaap gayab | "Discard unsaved changes?" dialog (Cancel / Discard and open) |

### Naye files
- `server/src/services/ai/{geminiClient,prompt,aiCache,offlinePlanner}.js`, `server/src/data/offlineDestinations.js`
- `server/src/models/{AiCache,AiUsage}.js`
- `server/test/{ai,offlinePlanner}.test.js`
- `client/src/components/{ErrorBoundary,PageState,TripTitle,Toast,ConfirmDialog}.jsx`, `client/src/hooks/useTripFromUrl.js`
- `shared/src/utils/destinations.js` (`OFFLINE_PLANNER_DESTINATIONS` + `findOfflinePlannerDestination`: server aur wizard dono same list/matching use karte hain), `shared/test/destinations.test.js`

### Hataye gaye
- Purana random itinerary generator (`aiService.js` ke andar) aur `@google/generative-ai` dependency.

### Doosre parts pe asar
- **Part 7 (deploy):** Render pe `GEMINI_API_KEY` env var daalna; baaki AI settings optional.
- **Part 8 (map):** offline planner ke places ke paas pehle se coordinates hain; Gemini wale places ke liye geocoding Part 8 mein.
- **Part 9 (streaming):** `generateItinerary()` ek hi jagah hai — streaming wahi se nikalegi; "regenerate one day" `?fresh=1` jaisa.
- **Part 13 (chat):** AI ka jawab check karne ka tareeka (`normalizeItinerary` + retry) wahi reuse hoga.
- **Part 14 (share):** share link `/trips/:id` jaisa hi `/share/:slug` hoga.

### Tests
- Server **47** (AI 10 — fake Gemini client se, bina internet; offline planner 8; auth 10; API 14; trips 4), shared **29**.
- Browser: 19 naye checks (URLs, refresh, draft, unsaved banner, discard, rename, sort, not-found, doosra user, wizard hint,
  quick-search error, Explore se open trip na badle, discard dialog) + purane 26 checks naye URLs ke saath.

---

## Parts 3 + 4 — MongoDB Atlas + JWT login (tags `part-3`, `part-4`, ek hi commit)

Dono parts ek saath maange gaye the aur ek doosre se jude hain (login ke bina user-wise data ka matlab nahi), isliye ek commit.

### Pehli baar chalane ke liye
1. `npm install` (mongoose, bcryptjs, jsonwebtoken, cookie-parser naye hain; mysql2 hata)
2. **`docs/SETUP_MONGODB.md`** follow karke free Atlas cluster banao
3. `server/.env` mein **`MONGODB_URI`** aur **`JWT_SECRET`** daalo (baaki `server/.env.example` dekho)
4. `npm run dev` → terminal mein `[DB] Connected to MongoDB "tripplanner"`
5. Browser: Sign up karo, ya **"Try the demo account"**

**Naye env variables:** `MONGODB_URI` (zaroori), `JWT_SECRET` (production mein zaroori), `JWT_EXPIRES_DAYS`, `COOKIE_SAMESITE`, `COOKIE_SECURE`, `DEMO_LOGIN_ENABLED`, `AUTH_RATE_LIMIT_MAX`.
**Hataye gaye:** `MYSQL_ENABLED`, `DB_HOST/USER/PASSWORD/NAME/PORT`, `STORE_FILE`.
**Purana data:** pehle wale JSON-file trips migrate nahi hote (wo sirf demo data tha). Demo trip apne-aap ban jaata hai.

### Kya badla
| Pehle | Ab |
| --- | --- |
| Koi bhi email/password se "login", data browser ke localStorage mein | asli account: bcrypt hash, JWT httpOnly cookie, server pe check |
| Site khulte hi demo user mein auto-login, Logout ke baad refresh = phir login | guest guest hi rehta hai; Logout sach mein logout |
| "Continue with Google" = hamesha "Priya Patel" | hataya (fake tha) |
| Sab users ka ek hi data | har trip `owner` ke saath; doosre ka trip 404 |
| Trips JSON file / MySQL (half) mein | MongoDB Atlas, Mongoose models |
| Contact form kuch nahi bhejta tha | `POST /api/contact` → DB; validation + error dikhte hain |
| Profile pe "Aarav Sharma" sab ke liye | asli naam, email, member since, trip count, demo badge |
| Edit pe interests/pace wapas nahi aate the | trip ke saath preferences save hote hain |
| Unknown URL pe khaali page | 404 page |

### Naye files
- `server/src/models/{User,Trip,ContactMessage,toJSON,index}.js`
- `server/src/services/{tripService,authService,demoService}.js`, `server/src/utils/authToken.js`
- `server/src/controllers/{authController,contactController}.js`, `server/src/routes/{authRoutes,contactRoutes}.js`
- `server/scripts/{seed,test-db}.js`, `server/test/auth.test.js`
- `shared/src/schemas/contact.js`
- `client/src/components/Avatar.jsx`, `client/src/pages/NotFound.jsx`
- `docs/SETUP_MONGODB.md`

### Hataye gaye files
- `server/database/` (schema.sql, seed.sql, seedRunner.js), purana `server/src/config/db.js` (JSON + MySQL)
- `server/src/routes/userRoutes.js`, `server/src/controllers/userController.js` (ab `/api/auth/me`)

### Doosre parts pe asar
- **Part 5:** trip ownership + preferences save ho chuke; bacha hai URLs (`/trips/:id`).
- **Part 6:** per-user AI limit ab possible (login hai); `AiCache` model wahin banega.
- **Part 7 (deploy):** alag domains pe cookie ke liye `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`, `TRUST_PROXY=true`.
- **Part 17 (admin):** `User.role` (`user`/`admin`) aur `requireRole('admin')` pehle se hain.

---

## Part 2 — Shared contracts (tag `part-2`)

### Chalane ke liye
```bash
npm install      # shared mein zod add hua hai
npm run dev
npm run check
```
Koi naya env variable nahi.

### Kya badla
| Pehle | Ab |
| --- | --- |
| Client aur server ke rules alag-alag (ya the hi nahi) | `shared/` ke Zod schemas — dono jagah **same rule, same message** |
| Wizard mein galat input pe sirf `alert()` / kuch nahi | har step pe input ke neeche saaf error; galat step pe wapas le jaata hai |
| Budget field khaali nahi kar sakte the (5000 ban jaata tha) | khaali kar sakte ho; "Budget is required." |
| Travel pace, stay type, food preference wizard mein the hi nahi | Step 3 mein add; server tak jaate hain |
| Travelers sirf 1–4 | 1–20 stepper |
| Default dates `2026-11-12` hardcoded | aaj se 7 din baad (kabhi purani nahi hongi) |
| Dropdown se "Kerala (Munnar & Alleppey)" → map Jaipur pe | dropdown ka value saaf naam (`Kerala`) bhejta hai |
| Explore → Plan Trip: interests galat naam ('Forts') | `tagsToInterests` → sahi interests select |
| Budget numbers add up nahi hote the | `computeBudget`: din ka total = activities ka sum, total = sab buckets ka sum |
| Header pe user ka budget "(est.)" likh ke dikhata tha | "Est. ₹X of ₹Y budget" + Within / Over budget |
| My Trips ka "Past" tab hamesha khaali | Upcoming / Ongoing / Past / All dates se calculate |
| `/itinerary` khulte hi Manali trip ban jaata tha | "No itinerary open" + Create / My Trips buttons |
| Save dobara dabane pe duplicate trip | pehli baar Save, uske baad **Update Trip** (same trip) |
| Edit button khaali form kholta tha | trip load hoke wizard bhar jaata hai, "Regenerate" usi trip ko update karta hai |
| "Share" sirf `/itinerary` URL copy karta tha | "Copy" poora itinerary text copy karta hai (asli share link Part 14 mein) |
| Tests calendar dates pe the (time ke saath fail hote) | sab dates "aaj se X din" relative |

### Naye files
- `shared/src/constants.js`, `shared/src/utils/{dates,budget,interests}.js`
- `shared/src/schemas/{common,preferences,itinerary,trip,auth}.js`, `shared/src/validation.js`, `shared/src/itinerary/normalize.js`
- `shared/test/{dates,budget,schemas,itinerary}.test.js`
- `server/src/middleware/validate.js`
- `client/src/constants/ui.js`
- `docs/CONTRACTS.md`

### Doosre parts pe asar
- **Part 3 (MongoDB):** Mongoose models inhi shapes pe banenge; itinerary save se pehle `normalizeItinerary`.
- **Part 4 (Auth):** `RegisterSchema` / `LoginSchema` ready hain.
- **Part 6 (AI):** Gemini ka output `normalizeItinerary(..., { expectDays })` se check hota hai; galat ho to fallback.
- `server/src/utils/numbers.js` hata diya (schemas ne jagah le li).

---

## Part 1 — Foundation & cleanup (tag `part-1`)

### Pehli baar chalane ke liye
```bash
npm install          # project ROOT se (ab ek hi install sab ke liye)
npm run dev          # server :5000 + client :5173
npm run check        # lint + tests + build
```
- `server/.env` mein **`GEMINI_MODEL`** naya hai (default `gemini-3.8-flash`). `CLERK_*`, `ARCJET_*` hata diye.
- `client/.env` se `VITE_CLERK_PUBLISHABLE_KEY` hataya; `VITE_API_BASE_URL` ab khaali (Vite proxy use hota hai).
- Node.js **20.19+** chahiye.

### Kya fix hua
| Problem (pehle) | Ab |
| --- | --- |
| `.env` imports ke baad load hota tha → Clerk/Arcjet kabhi on nahi | `server/src/config/env.js` sabse pehle `.env` load + Zod validation; sab modules `config` use karte hain |
| `"type": "module"` missing → warning, Node 18 pe crash | add kiya; Node ≥ 20.19 `engines` mein |
| Galat JSON pe HTTP 200 | sahi 400; production mein stack trace nahi |
| `x-user-id` header se kisi ka bhi data | header ignore; `req.user` seam (Part 4 mein asli login) |
| PUT se `userId` badal jaata tha | sirf allowed fields update hote hain |
| Unauthorized delete itinerary uda deta tha | owner match na ho to kuch delete nahi |
| Trip save pe nodemon restart | data `server/data/` mein (git-ignored), `nodemon.json` ignore |
| Budget "abc" → NaN, end < start accept | 400 + field name ke saath clear message |
| Quick search trips ki end date hamesha `2026-11-15` | server end date calculate karta hai, client wahi use karta hai |
| Har jagah "ABESIT" | `shared/src/projectInfo.js` — ABES Engineering College; har page wahi se padhta hai |
| Profile pe fake "Enabled/Active" | `/api/health` se asli status |
| Tailwind v4 classes (55 jagah) kaam nahi karti thi | `tailwindcss-animate` + config extend → sab classes generate hoti hain |
| Clerk, Arcjet, uuid unused/deprecated packages | hata diye; Express 5, Zod 4, Helmet add |
| Client bundle > 500 kB warning | vendor chunks split |

### Naye files
- `shared/` workspace (`projectInfo.js`, tests)
- `server/src/config/env.js`, `server/src/utils/{ApiError,asyncHandler,numbers}.js`, `server/nodemon.json`, `server/scripts/setup-tests.js`, `server/test/api.test.js`
- `client/src/hooks/useSystemStatus.js`
- `eslint.config.js`, `docs/ROADMAP.md`, `docs/CHANGELOG.md`

### Doosre parts pe asar
- **Part 4** sirf `server/src/middleware/auth.js` aur `client/src/context/AuthContext.jsx` ka andar ka code badlega (controllers `req.user.id` pe chalte hain).
- **Part 2** `shared/` mein schemas add karega — client + server dono ko automatically milenge.
- Saari API calls ab sirf `client/src/services/api.js` se; server ka error message `err.message` mein aata hai.

### TODO (aapke liye)
- `shared/src/projectInfo.js` mein **teammates ke naam/roll no.** aur **project guide** ka naam daalein.
