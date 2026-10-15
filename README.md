# TripPlanner — AI-Powered Smart Trip Planner

> **B.Tech Mini Project** · ABES Engineering College, Ghaziabad (AKTU) · Department of Computer Science & Engineering · Session 2026–27 · **v2.0.0**

TripPlanner turns travel preferences — destination, dates, budget in ₹, travellers, interests, pace, stay type, food
preference — into a day-wise itinerary with timings, costs and tips, shows every day on a map with real road routes, and
then lets you edit, share and export the plan and split the trip's expenses.

| | |
| --- | --- |
| 🤖 **AI plans** | Google Gemini writes the plan (structured JSON, checked by a schema); days appear live while it writes. No key or AI down → an **offline planner** builds real plans for 8 destinations. |
| 🗺️ **Real map** | Places located with Nominatim, road routes / km / drive time with OSRM, on a Leaflet + OpenStreetMap map. |
| ✏️ **Editor** | Drag & drop activities (mouse, touch, keyboard), add / edit / remove, undo / redo; budget and routes follow. |
| 🌦️ **Travel info** | Weather (16-day forecast or typical weather), packing list with reasons, how to reach from 27 cities. |
| 🔗 **Share & export** | Read-only share link, WhatsApp, QR code, PDF, calendar (.ics), "save a copy". |
| 💸 **Expenses** | Split equally or exactly (in paise), balances, settle up with the fewest payments, CSV. |
| 📊 **Admin** | Usage charts, contact-message inbox, accounts. |
| 📘 **API docs** | `/api/docs` (readable) and `/api/openapi.json` (OpenAPI 3.1, generated from the shared schemas). |

**Docs:** [ARCHITECTURE](docs/ARCHITECTURE.md) (diagrams, data model, algorithms) · [DEPLOY](docs/DEPLOY.md) (Render + Atlas, free) ·
[TESTING](docs/TESTING.md) · [SETUP_MONGODB](docs/SETUP_MONGODB.md) · [MAP_SERVICES](docs/MAP_SERVICES.md) ·
[CONTRACTS](docs/CONTRACTS.md) (data shapes) · [ROADMAP](docs/ROADMAP.md) · [CHANGELOG](docs/CHANGELOG.md)

---

## Run it on your computer

**Needs:** Node.js **20.19 or newer** (22 recommended — `node -v`) and a free **MongoDB Atlas** database ([setup, 10 min](docs/SETUP_MONGODB.md)).

```bash
# 1. Install everything (root + shared + server + client) with ONE command
npm install

# 2. Server settings (first time only)
#    Windows PowerShell:  Copy-Item server/.env.example server/.env
#    macOS / Linux:       cp server/.env.example server/.env
#    then in server/.env set:
#      MONGODB_URI     → your Atlas connection string (required)
#      GEMINI_API_KEY  → optional, free at https://aistudio.google.com/apikey
#      ADMIN_EMAILS    → optional, your e-mail → admin dashboard

# 3. Start server (http://localhost:5000) + app (http://localhost:5173) together
npm run dev
```

Open **http://localhost:5173** → sign up, or **"Try the demo account"** (a demo account with a sample Manali trip is created
automatically). Without a Gemini key the offline planner covers **Manali, Goa, Jaipur, Udaipur, Varanasi, Kerala, Andaman and
Rishikesh**; the app says so on the wizard, the itinerary and the Profile page. API documentation: **http://localhost:5000/api/docs**.

## Put it online (free)

One Render web service runs the built app **and** the API; data stays in MongoDB Atlas. `render.yaml` describes everything:

1. Push this repository to GitHub.
2. Render → **New → Blueprint** → pick the repository → fill `MONGODB_URI` (and optionally `GEMINI_API_KEY`, `ADMIN_EMAILS`).
3. Open `https://<your-app>.onrender.com`.

Full step-by-step guide, free-plan limits and troubleshooting: **[docs/DEPLOY.md](docs/DEPLOY.md)**.
A `Dockerfile` is included for any Docker host. GitHub Actions (`.github/workflows/ci.yml`) runs lint + all tests + build on every push.

## Commands (from the project root)

| Command | What it does |
| --- | --- |
| `npm run dev` | Server + app together, with auto-reload |
| `npm run check` | Lint + all tests + production build — must pass before every commit |
| `npm test` | Shared + server tests (165) |
| `npm run build` | Production build of the app (`client/dist`) |
| `npm start` | Start the server; with `NODE_ENV=production` it also serves `client/dist` (what Render runs) |
| `npm run seed -w server -- --reset` | Recreate the demo account and its sample trip |
| `npm run photos -w server` | Look up destination photos on Wikipedia again (normally automatic) |
| `npm run admin -w server -- add you@example.com` | Make an account admin (`remove`, `list` too) |
| `npm run lint` | ESLint on the whole project |

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 6, Tailwind CSS 3, React Router 7, Leaflet + OpenStreetMap, @dnd-kit |
| Backend | Node.js 22, Express 5, Helmet (CSP), express-rate-limit, Server-Sent Events, PDFKit, qrcode |
| Database | MongoDB Atlas + Mongoose 9 (TTL caches for AI, map and weather answers) |
| Login | JWT in an httpOnly cookie, bcrypt password hashing, admin role |
| Shared | Zod 4 schemas + business logic (`shared/`) used by client **and** server |
| AI | Google Gemini via `@google/genai` (JSON schema, streaming, cache, daily limit) + offline planner |
| Outside services (free) | Nominatim, OSRM, Open-Meteo, Wikipedia API — polite queues + MongoDB cache |
| Quality | ESLint, Node test runner + Supertest on a real MongoDB, GitHub Actions CI |
| Hosting | Render (one web service) + MongoDB Atlas, or Docker |

## Project structure

```
tripplanner/
├── package.json          npm workspaces + root scripts
├── render.yaml           Render Blueprint (one free web service)
├── Dockerfile            app + API in one container
├── .github/workflows/    CI: lint + tests (MongoDB 7) + build
├── docs/                 ARCHITECTURE (+ diagrams/), DEPLOY, TESTING, CONTRACTS, ROADMAP, CHANGELOG, …
├── shared/               schemas, constants, itinerary normalize/edit, expenses ledger, dates, budget, map,
│                         weather codes, packing list, calendar (.ics)
├── server/
│   ├── src/config/       env.js (validated settings), db.js
│   ├── src/models/       User, Trip, Expense, Destination, ContactMessage, AiCache, AiUsage, GeoCache
│   ├── src/routes/ → controllers/ → services/   (services/ai: Gemini + offline planner, services/geo: maps)
│   ├── src/middleware/   auth (JWT), validation, rate limits, error handler
│   ├── src/docs/         OpenAPI description + /api/docs page
│   ├── src/web/          serves the built app in production, link previews for /share pages
│   ├── scripts/          seed, photos, admin, test helpers
│   └── test/             104 API tests (Supertest + real MongoDB, fake outside services)
└── client/src/           pages/, components/ (itinerary, editor, map, share, expenses, admin), services/api.js
```

## Pages

| URL | Page |
| --- | --- |
| `/` | Home: quick search, good time to go now |
| `/trips/new` | Trip wizard |
| `/itinerary` | A new plan that is not saved yet (survives a refresh) |
| `/trips/:id` | A saved trip: itinerary, map, stays, restaurants, cost breakdown, weather & packing, getting there, expenses; Edit plan, Share |
| `/trips/:id/edit` | Change a saved trip's details and regenerate |
| `/my-trips` | Saved trips: Upcoming / Ongoing / Past, search, sort, rename |
| `/explore`, `/destinations/:slug` | 26 Indian destinations, favourites |
| `/hotels`, `/restaurants`, `/map` | Where to stay / eat, the open trip on the map |
| `/share/:slug` | A shared trip (no login needed), PDF, calendar, "save a copy" |
| `/admin` | Admin dashboard (admins only) |
| `/profile`, `/about`, `/contact`, `/auth` | Account and service status, project info, contact form, login / sign up |

## API

All endpoints are listed with their parameters and rules at **`/api/docs`**; the machine-readable description is
**`/api/openapi.json`** (import it into Postman or Swagger Editor). A test makes sure the documentation always lists exactly
the routes the server has.

Every answer is JSON: `{ "success": true, "data": … }` or `{ "success": false, "error": "message", "details": … }` with the
right HTTP status. The session is a JWT in an httpOnly cookie (`tp_session`); API tools can also send `Authorization: Bearer <token>`.

## Project status

18-part rebuild ([ROADMAP](docs/ROADMAP.md)): Parts 1–6, 8–12, 14, 15, 17 and 18 done (Part 7 merged into 18).
Part 13 (AI trip chat) is on hold and Part 16 (dark mode / Hindi) was skipped — see Future scope in the roadmap.
