# Changelog

Har roadmap part ka delivery note: kya badla, kis part pe asar, naye env variables, kaun si command chalani hai.

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
