# Changelog

Har roadmap part ka delivery note: kya badla, kis part pe asar, naye env variables, kaun si command chalani hai.

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
