# Deploy — Render + MongoDB Atlas (free) — Part 18

Result: ek public link jaise `https://tripplanner-xxxx.onrender.com` jahan **app aur API dono** chalte hain
(ek hi service). Ek baar ka kaam, ~20 minute. Har baad wala `git push` apne-aap deploy ho jaata hai.

> Kyun ek hi service (Vercel + Render alag nahi)? App aur API ek hi address pe hon to login cookie har browser mein chalti
> hai (Safari doosri site ki cookies block karta hai), live progress (Server-Sent Events) bina extra setting ke chalta hai,
> aur WhatsApp pe share link ka preview (trip ka naam, din) dikhta hai.

---

## Pehle chahiye

| Kya | Kahan | Note |
| --- | --- | --- |
| GitHub account | https://github.com | code yahan rahega |
| Render account | https://render.com | "Sign in with GitHub" — free plan ke liye card nahi chahiye |
| MongoDB Atlas | [SETUP_MONGODB.md](SETUP_MONGODB.md) | free M0 cluster + connection string |
| Gemini API key (optional) | https://aistudio.google.com/apikey | bina key ke offline planner chalega (8 destinations) |

---

## Step 1 — Atlas: Render ko connect hone do

Atlas → **Network Access → Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)**.
Render ke free plan ka IP fixed nahi hota, isliye ye zaroori hai (database user + strong password se data safe rehta hai).

Connection string mein database ka naam `tripplanner` hona chahiye:
```
mongodb+srv://tripuser:PASSWORD@cluster0.xxxxx.mongodb.net/tripplanner?retryWrites=true&w=majority
```

## Step 2 — Code GitHub pe

GitHub pe naya repository banao (Private bhi chalega, **README add mat karna**), phir project folder mein:

```bash
git branch -M main
git remote add origin https://github.com/<tumhara-username>/tripplanner.git
git push -u origin main --tags
```

`server/.env` aur `client/.env` GitHub pe **nahi** jaate (`.gitignore` mein hain) — secrets safe.
Push ke baad GitHub ke **Actions** tab mein CI chalega (lint + saare tests + build) — hara tick = sab theek.

## Step 3 — Render: Blueprint se service banao

1. Render Dashboard → **New → Blueprint**.
2. Apna `tripplanner` repository chuno → Render `render.yaml` padhta hai (1 free web service, Singapore region).
3. Ye values maangega (sirf pehli baar):

   | Variable | Kya daalna hai |
   | --- | --- |
   | `MONGODB_URI` | Step 1 wali Atlas string (**zaroori**) |
   | `GEMINI_API_KEY` | Gemini key, ya khaali chhodo (offline planner) |
   | `ADMIN_EMAILS` | jis e-mail se tum sign up karoge, e.g. `rahul@example.com` (admin dashboard ke liye) |
   | `NOMINATIM_EMAIL` | tumhara e-mail (OpenStreetMap ke operators ke liye contact; optional) |

   `JWT_SECRET` Render khud random bana deta hai, `NODE_ENV=production` aur `TRUST_PROXY=true` pehle se set hain.
4. **Apply** → pehla build ~3–5 minute (`npm ci --include=dev && npm run build`, phir `npm start`).

## Step 4 — Check karo

| Kholo | Kya dikhna chahiye |
| --- | --- |
| `https://<tumhari-app>.onrender.com/api/health` | `"status": "healthy"`, `"database": { "connected": true }` |
| `https://<tumhari-app>.onrender.com/` | TripPlanner home page |
| `/api/docs` | API documentation (saare endpoints) |

Phir: **Sign up** (ADMIN_EMAILS wala e-mail) → trip banao → save → **Share** → link WhatsApp pe bhejo (preview aana chahiye)
→ menu mein **Admin dashboard**.

---

## Free plan — dhyan rakhna

- **15 minute koi request nahi → service so jaati hai.** Agli request pe jaagne mein ~1 minute lagta hai.
  **Viva / demo se 2–3 minute pehle link khol lo.**
- Har mahine **750 free hours** (ek service 24×7 ke liye kaafi). So rahi service hours use nahi karti.
- Shell nahi milta → admin banane ke liye `ADMIN_EMAILS` hi use karo (`npm run admin` wala command sirf apne laptop pe).
- Server ki disk temporary hai — koi baat nahi, saara data Atlas mein hai.
- Details: https://render.com/docs/free

## Update kaise karein

Code badlo → `git add -A && git commit -m "..." && git push` → Render apne-aap naya version deploy karta hai
(Dashboard → Events mein dikhega). Environment variable badalna ho: service → **Environment** → Save → redeploy.

## Apna domain (optional)

Render → service → **Settings → Custom Domains** → domain add karo, DNS mein CNAME daalo.
Phir Environment mein `CLIENT_URL=https://tumhara-domain.com,https://<tumhari-app>.onrender.com` (dono address chalenge).

---

## Problem aaye to

| Error (Render → Logs) | Matlab / fix |
| --- | --- |
| `MONGODB_URI is not set` | Environment mein `MONGODB_URI` daalo |
| `Could not connect to MongoDB … Atlas is not accepting` | Atlas Network Access mein `0.0.0.0/0` |
| `bad auth` / `Authentication failed` | Atlas user ka password galat, ya special character (`@ : / ? #`) — password badlo |
| `JWT_SECRET: must be at least 32 random characters` | Environment mein `JWT_SECRET` (Render ka "Generate" button) |
| Build: `vite: not found` | build command `npm ci --include=dev && npm run build` hi rakho (render.yaml mein yahi hai) |
| Share link / PDF ke QR mein galat address | `CLIENT_URL` khaali chhodo (Render ka address apne-aap use hota hai) ya sahi `https://…` daalo |
| AI ki jagah "offline planner" | `GEMINI_API_KEY` khaali / galat / quota khatam — itinerary page ka notice wajah batata hai |
| Pehla page bahut der se khula | service so rahi thi (free plan) — normal hai |

## Docker (koi bhi Docker host)

```bash
docker build -t tripplanner .
docker run -p 5000:5000 \
  -e MONGODB_URI="mongodb+srv://…/tripplanner" \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  -e CLIENT_URL="http://localhost:5000" \
  -e GEMINI_API_KEY="…" \
  tripplanner
```
→ http://localhost:5000 (app + API). Image: Node 22 Alpine, sirf production packages, non-root user, health check `/api/health`.
