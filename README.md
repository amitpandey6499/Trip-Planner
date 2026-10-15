# TripPlanner — AI-Powered Smart Trip Planner

> **B.Tech Mini Project** · ABES Engineering College, Ghaziabad (AKTU) · Department of Computer Science & Engineering · Session 2026–27

TripPlanner turns travel preferences (destination, dates, budget in ₹, travelers, interests) into a day-wise itinerary with
estimated costs, stays, restaurants and an interactive map.

The project is being rebuilt in 18 parts. See **[docs/ROADMAP.md](docs/ROADMAP.md)** for the plan and status, and
**[docs/CHANGELOG.md](docs/CHANGELOG.md)** for what changed in each part. Data shapes and validation rules shared by client and
server are described in **[docs/CONTRACTS.md](docs/CONTRACTS.md)**.

---

## Tech stack (current)

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 6, Tailwind CSS 3, React Router, Leaflet + OpenStreetMap |
| Maps | Nominatim (place positions) + OSRM (road routes), cached in MongoDB — see [docs/MAP_SERVICES.md](docs/MAP_SERVICES.md) |
| Live updates | Server-Sent Events (generation progress, map progress) |
| Backend | Node.js, Express 5, Helmet, express-rate-limit |
| Database | MongoDB Atlas + Mongoose |
| Login | JWT in an httpOnly cookie, bcrypt password hashing |
| Validation | Zod 4 schemas in `shared/`, used by both client and server |
| AI | Google Gemini via `@google/genai` (JSON schema output, cache, daily limit) + offline planner for 8 destinations |
| Tooling | npm workspaces, ESLint, Node test runner + Supertest + mongodb-memory-server |

## Project structure

```
tripplanner/
├── package.json          # npm workspaces + root scripts (dev, check, test, lint, build)
├── eslint.config.js
├── docs/                 # ROADMAP, CHANGELOG, CONTRACTS, SETUP_MONGODB, MAP_SERVICES
├── shared/               # code used by BOTH client and server: schemas, constants, date/budget utils
├── server/               # Express API
│   ├── src/config/env.js # all settings, loaded from server/.env and validated
│   ├── src/models/       # Mongoose: User, Trip, ContactMessage, AiCache, AiUsage, GeoCache
│   ├── src/services/ai/  # Gemini client (+ streaming), prompt, cache/limit, offline planner
│   ├── src/services/geo/ # Nominatim geocoder, OSRM router, map update (Part 8)
│   ├── src/middleware/   # JWT auth, validation, error handler, rate limits
│   ├── src/controllers/  ├── src/routes/  ├── src/services/
│   ├── scripts/          # seed (demo account), test database helper
│   └── test/             # API + auth tests (node --test + supertest)
└── client/               # React app (Vite)
```

## Setup

**Requirements:** Node.js **20.19 or newer** (`node -v`).

```bash
# 1. Install everything (root + shared + server + client) with ONE command
npm install

# 2. Server settings (first time only)
#    Windows PowerShell:  Copy-Item server/.env.example server/.env
#    macOS / Linux:       cp server/.env.example server/.env
#    Then in server/.env set:
#      MONGODB_URI  → free MongoDB Atlas database, see docs/SETUP_MONGODB.md (required)
#      JWT_SECRET   → long random text (required in production)
#      GEMINI_API_KEY → optional, free at https://aistudio.google.com/apikey

# 3. Run server (http://localhost:5000) + client (http://localhost:5173) together
npm run dev
```

Open **http://localhost:5173**, sign up, or click **"Try the demo account"** on the login page (a demo account with a sample
Manali trip is created automatically). Without a Gemini key the app still works: the **offline planner** builds real day plans
from curated places for Manali, Goa, Jaipur, Udaipur, Varanasi, Kerala, Andaman and Rishikesh, and the top banner and Profile
page say so. Other destinations need the Gemini key.

### AI (Google Gemini)

1. Get a free key at **https://aistudio.google.com/apikey** and put it in `server/.env` as `GEMINI_API_KEY`.
2. Restart `npm run dev`. The terminal shows `[AI] Gemini model: ...`, and Profile shows "Configured".
3. Optional settings (see `server/.env.example`): `GEMINI_MODEL`, `AI_DAILY_LIMIT` (per user per day, default 20),
   `AI_TIMEOUT_SECONDS` (45), `AI_CACHE_DAYS` (7).

While a plan is being written, a progress window shows each day as soon as Gemini finishes it (Cancel stops it).
Every day also has **"New plan for this day"** (its own pace, plus a wish for the AI such as "more relaxed").

How one request is answered: **cache** (same request answered before → instant) → **Gemini** (answer must pass the shared
itinerary schema; one retry with the reason if it does not) → **offline planner** with a notice saying why (limit reached,
AI unreachable, bad key, model retired ...) → a clear error if that destination is not covered offline either.
"Regenerate" skips the cache.

## Pages

| URL | Page |
| --- | --- |
| `/trips/new` | Trip wizard (4 steps) |
| `/itinerary` | A new plan that is not saved yet (survives a refresh in the same tab) |
| `/trips/:id` | A saved trip — can be refreshed, bookmarked; "unsaved changes" banner after Regenerate / a new day plan |
| `/map` | The open trip on the map (road routes, stays, restaurants) |
| `/trips/:id/edit` | Edit a saved trip's preferences and regenerate it |
| `/my-trips` | Saved trips: Upcoming / Ongoing / Past tabs, search, sort, rename |

## Useful commands (run from the project root)

| Command | What it does |
| --- | --- |
| `npm run dev` | Start server and client together |
| `npm test` | Run shared + server tests (first run downloads an in-memory MongoDB once, ~70 MB) |
| `npm run seed -w server -- --reset` | Recreate the demo account and its sample trip |
| `npm run lint` | ESLint on the whole project |
| `npm run build` | Production build of the client |
| `npm run check` | lint + tests + build — must pass after every roadmap part |

## API (current)

| Method | Endpoint | Login | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | – | Server, database and integration status |
| POST | `/api/auth/register` | – | Create account → session cookie |
| POST | `/api/auth/login` | – | Log in (`rememberMe` optional) → session cookie |
| POST | `/api/auth/demo` | – | Log in to the shared demo account |
| POST | `/api/auth/logout` | – | Clear the session cookie |
| GET | `/api/auth/me` | ✔ | Current user + trip count + AI plans left today |
| POST | `/api/trips/generate` | ✔ | Generate an itinerary → `{ data, preferences, meta: { source, cached, notice, ai } }`; `?fresh=1` skips the cache; `Accept: text/event-stream` = live progress + days |
| POST | `/api/trips/regenerate-day` | ✔ | New plan for one day `{ preferences, itinerary, dayNumber, pace?, note? }` |
| POST | `/api/map/enrich` | ✔ | Place positions + road routes for an unsaved itinerary (stream or JSON) |
| POST | `/api/trips/:id/map` | ✔ | Same for a saved trip; the result is stored with the trip |
| GET / POST | `/api/trips` | ✔ | List my trips / save (or update with `tripData.id`) |
| GET / PUT / DELETE | `/api/trips/:id` | ✔ | Read / update allowed fields (title, dates, travelers, budget) / delete — own trips only |
| GET | `/api/places/search?q=&category=` | – | Search destinations |
| GET | `/api/recommendations/hotels?destination=` | – | Hotel suggestions |
| GET | `/api/recommendations/restaurants?destination=` | – | Restaurant suggestions |
| POST | `/api/contact` | – | Contact form message (stored in MongoDB) |

Every error response has the shape `{ "success": false, "error": "message", "details": { ... } }` with a proper HTTP status code.
The session is a JWT in an httpOnly cookie (`tp_session`); API tools can also send `Authorization: Bearer <token>`.
