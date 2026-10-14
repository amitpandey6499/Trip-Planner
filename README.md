# TripPlanner — AI-Powered Smart Trip Planner

> **College Mini Project**  
> **Institution:** ABES Institute of Technology (ABESIT), Ghaziabad  
> **Department:** Department of Computer Science & Engineering  
> **Academic Session:** 2026–2027  
> **Project Title:** TripPlanner — AI-Powered Smart Trip Planner  

---

## 🌟 Executive Summary

**TripPlanner** is a full-stack, AI-powered travel planning web application that solves the problem of fragmented and generic travel planning. By utilizing modern Generative AI (Google Gemini), relational persistence (MySQL), robust security with rate limiting (Arcjet), interactive mapping (Mapbox / Leaflet), and secure session management (Clerk), TripPlanner synthesizes personalized, budget-aware, day-wise itineraries in Indian Rupees (₹) tailored to user-specified destinations, dates, group sizes, and interest profiles.

---

## 📸 Key Features & Included Pages

The application faithfully reproduces all 9 screens from the UI/UX design specifications:

1. **Page 1: Home / Landing Page (`/`)**
   - High-impact travel hero with scenic photography and typography.
   - Interactive quick-search bar with destination autocomplete, date picker, duration selector, and budget filters.
   - Highlights for AI-Personalized Itineraries, Budget Planning, Stays, Maps, and Hidden Gems.
   - 3-step "How It Works" workflow and featured destination previews.

2. **Page 2: Sign Up / Login (`/auth`)**
   - Clean two-column authentication layout with coastal Amalfi photography.
   - Clerk session management + 1-Click Demo Login (`Aarav Sharma`) for immediate evaluator review.

3. **Page 3: Create Your Trip Wizard (`/create-trip`)**
   - 4-step wizard with visual progress bar:
     - **Step 1:** Destination autocomplete, start/end dates, automatic duration calculator.
     - **Step 2:** Travelers count, INR (₹) budget input, budget tiers (Budget, Moderate, Luxury).
     - **Step 3:** Multi-select interest chips (Nature & Outdoors, Adventure, History & Culture, Food & Cuisine, Beaches, Shopping, Wildlife, Nightlife, Relaxation, Photography, Spiritual Places, Hidden Gems) + special preferences text area.
     - **Step 4:** Comprehensive trip summary review and generation trigger.

4. **Page 4: Explore Destinations (`/explore`)**
   - Instant search and category filter pills (`All`, `Popular`, `Beaches`, `Mountains`, `Cultural`, `Adventure`, `Spiritual`, `Hidden Gems`).
   - Cards with real photographs, ratings, region metadata, tags, favorite bookmarks, and quick-detail modals.

5. **Page 5: AI-Generated Itinerary (`/itinerary`)**
   - Dynamic trip title, duration badges, traveler count, and total estimated budget.
   - Day selector sidebar with custom day themes.
   - Vertical timeline layout with timestamps, activity photos, estimated durations, descriptions, costs, and practical travel tips.
   - Tab bar: `Itinerary`, `Map View`, `Hotels`, `Restaurants`, `Places`, `Cost Breakdown`.
   - Actions: `Save Trip` to MySQL, `Share Link`, `Export PDF / Print`, `Regenerate`.

6. **Page 6: Interactive Map & Route View (`/map`)**
   - Integrated map with route visualization.
   - Waypoint timeline with timestamps and custom pins:
     - 🟢 **Hotels** (Green pin)
     - 🔵 **Attractions / Sights** (Blue pin)
     - 🟠 **Restaurants & Cafes** (Amber pin)
   - Route statistics cards: **Total Distance (98 km)** and **Estimated Travel Time (3.5 hours)**.

7. **Page 7: Hotel Recommendations (`/hotels`)**
   - Handpicked stays matched to user budget and destination.
   - Photo, rating, price per night (₹), amenity chips (Free WiFi, Mountain View, Breakfast), distance from sights.

8. **Page 8: Restaurant Recommendations (`/restaurants`)**
   - Top eateries with cuisine tags, average cost for two, dietary suitability, and location.

9. **Page 9: My Trips Dashboard (`/my-trips`)**
   - Personalized dashboard for authenticated users.
   - Filter tabs: `Upcoming`, `Past`, `Saved`.
   - Trip cards with thumbnail, dates, budget, `View Itinerary`, `Edit`, and `Delete` with confirmation modal.
   - Persisted in MySQL (with multi-tier persistent fallback).

10. **Page 10: Profile & System Status (`/profile`)**
    - User account info, session token status, college mini project specification, and live status of integrated APIs.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, Tailwind CSS 3, React Router DOM, Lucide React, Leaflet, Canvas Confetti |
| **Backend API** | Node.js, Express.js REST API, Morgan logger, CORS, dotenv |
| **Database** | MySQL (with `mysql2/promise` connection pool) + Resilient persistent storage fallback |
| **Artificial Intelligence** | Google Gemini Generative AI SDK (`@google/generative-ai`) |
| **Authentication** | Clerk Authentication SDK (`@clerk/clerk-sdk-node` & `@clerk/clerk-react`) + Demo session provider |
| **Security & Rate Limiting** | Arcjet security shield (`@arcjet/node`) + `express-rate-limit` |
| **Location & Maps** | Mapbox GL / Leaflet OpenStreetMap tiles with custom SVG marker layer |

---

## 📁 Project Directory Structure

```
trip-planner/
├── package.json               # Root scripts orchestrating client & server
├── .gitignore
├── README.md                  # Project documentation & setup manual
│
├── client/                    # React Frontend
│   ├── package.json
│   ├── vite.config.js         # API proxy configured to port 5000
│   ├── tailwind.config.js     # Design system color tokens
│   ├── postcss.config.js
│   ├── index.html
│   ├── .env.example
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            # Router and page route configurations
│       ├── index.css          # Base styles & font imports
│       ├── context/
│       │   ├── AuthContext.jsx # Clerk & 1-click Demo auth state
│       │   └── TripContext.jsx # Global itinerary & trips state
│       ├── services/
│       │   └── api.js         # Axios API client with token interceptor
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── Footer.jsx
│       │   ├── DemoModeBanner.jsx
│       │   ├── QuickSearchForm.jsx
│       │   ├── DestinationCard.jsx
│       │   ├── DayTimeline.jsx
│       │   ├── InteractiveMap.jsx
│       │   ├── HotelCard.jsx
│       │   ├── RestaurantCard.jsx
│       │   ├── CostBreakdown.jsx
│       │   └── ProtectedRoute.jsx
│       └── pages/
│           ├── Home.jsx           (Page 1: Landing)
│           ├── Auth.jsx           (Page 2: Login / Sign Up)
│           ├── CreateTrip.jsx     (Page 3: Wizard)
│           ├── Explore.jsx        (Page 4: Destinations)
│           ├── ItineraryView.jsx  (Page 5: AI Itinerary)
│           ├── MapView.jsx        (Page 6: Interactive Route)
│           ├── HotelsView.jsx     (Page 7: Hotels)
│           ├── RestaurantsView.jsx(Page 8: Restaurants)
│           ├── MyTrips.jsx        (Page 9: Dashboard)
│           ├── Profile.jsx        (Page 10: Settings)
│           ├── About.jsx
│           └── Contact.jsx
│
└── server/                    # Node / Express Backend API
    ├── package.json
    ├── .env.example
    ├── database/
    │   ├── schema.sql         # Full MySQL table definitions
    │   ├── seed.sql           # Curated destinations, stays, and demo trip
    │   └── seedRunner.js      # Database migration & seeding runner
    ├── src/
    │   ├── server.js          # Server bootstrap
    │   ├── app.js             # Express application & middleware
    │   ├── config/
    │   │   ├── db.js          # MySQL pool with multi-tier storage fallback
    │   │   └── arcjet.js      # Arcjet rate limiting & security
    │   ├── middleware/
    │   │   ├── auth.js        # Clerk JWT & demo token verification
    │   │   ├── rateLimiter.js # Sliding window rate limiter
    │   │   └── errorHandler.js# Global error handling
    │   ├── controllers/
    │   │   ├── tripController.js
    │   │   ├── placesController.js
    │   │   └── userController.js
    │   ├── services/
    │   │   ├── aiService.js   # Gemini AI & offline itinerary synthesizer
    │   │   └── placesService.js
    │   ├── routes/
    │   │   ├── healthRoutes.js
    │   │   ├── tripRoutes.js
    │   │   ├── placesRoutes.js
    │   │   ├── recommendationsRoutes.js
    │   │   └── userRoutes.js
    │   └── data/
    │       ├── destinations.json
    │       └── sampleItineraries.json
    └── test/
        └── trip.test.js       # Node unit test runner
```

---

## 🚀 Setup & Execution Guide (Windows / Mac / Linux)

### Prerequisites
- **Node.js** (v18.0.0 or later recommended).
- **MySQL** (Optional: If MySQL is running locally, it connects to it; otherwise it runs seamlessly using the built-in persistent storage without crashing!).

---

### Step 1: Install Dependencies

From the project root folder:

```powershell
# Install root, backend, and frontend dependencies
npm run install:all
```

Or install separately:
```powershell
# Root dependencies
npm install

# Backend dependencies
cd server
npm install
cd ..

# Frontend dependencies
cd client
npm install
cd ..
```

---

### Step 2: Configure Environment Variables

#### Backend Configuration:
Create a `.env` file in the `server/` directory (you can copy from `server/.env.example`):

```ini
PORT=5000
NODE_ENV=development

# MySQL Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=tripplanner_db
DB_PORT=3306

# Clerk Authentication (Optional for demo)
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key

# Google Gemini AI (Optional for demo - uses smart synthesizer if omitted)
GEMINI_API_KEY=your_gemini_api_key

# Client URL for CORS
CLIENT_URL=http://localhost:5173
```

#### Frontend Configuration:
Create a `.env` file in the `client/` directory (you can copy from `client/.env.example`):

```ini
VITE_API_BASE_URL=http://localhost:5000/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token
```

---

### Step 3: (Optional) Initialize MySQL Database

If you have MySQL installed and running:

```powershell
cd server
npm run seed
cd ..
```

*Note:* If MySQL is not running on the local machine during the presentation or evaluation, **TripPlanner automatically switches to its persistent storage layer**. Saving, viewing, updating, and deleting trips works 100% reliably out of the box!

---

### Step 4: Run the Application

Start both backend and frontend concurrently with a single command:

```powershell
npm start
```

Or run in separate terminal tabs:
- **Terminal 1 (Backend):**
  ```powershell
  cd server
  npm run dev
  ```
  *(Backend runs on `http://localhost:5000`)*

- **Terminal 2 (Frontend):**
  ```powershell
  cd client
  npm run dev
  ```
  *(Frontend runs on `http://localhost:5173`)*

Open your browser at **`http://localhost:5173`**!

---

## 🧪 Testing Backend Logic

Run the automated backend test suite:

```powershell
cd server
npm test
```

Tests verify:
- Destination search and category filtering
- Multi-day structured itinerary generation
- Budget breakdown mathematical consistency

---

## 🔑 External API Guide (Optional Setup)

| Service | Where to Get Free Keys | Purpose |
| :--- | :--- | :--- |
| **Google Gemini AI** | [Google AI Studio](https://aistudio.google.com/) | Real-time AI generative itinerary generation |
| **Clerk** | [Clerk Dashboard](https://dashboard.clerk.com/) | Social & email user authentication |
| **Mapbox** | [Mapbox Account](https://account.mapbox.com/) | Satellite & street tile maps |
| **Google Places** | [Google Cloud Console](https://console.cloud.google.com/) | Live destination & business lookups |
| **Arcjet** | [Arcjet Dashboard](https://arcjet.com/) | Rate limit shielding & bot attack protection |

---

## 🎓 Academic Presentation Notes

- **Institution:** ABES Institute of Technology (ABESIT), Ghaziabad
- **Academic Session:** 2026–27
- **Demo Mode:** When evaluated without active API credentials, the platform operates in full **Interactive Demo Mode**, utilizing verified geographic coordinates, real photographs, and complete 4-day travel plans for Manali, Goa, Jaipur, and Udaipur.
