# MongoDB Atlas setup (free) — Part 3

TripPlanner ka data (users, trips, contact messages) **MongoDB Atlas** mein rehta hai — cloud database, laptop pe kuch install nahi.
Ek baar ka kaam hai, ~10 minute.

## 1. Account
1. https://www.mongodb.com/cloud/atlas/register pe sign up karo (Google se bhi ho jaata hai).
2. Welcome questions aayein to kuch bhi choose karke aage badho.

## 2. Free cluster banao
1. **Project Overview → Create** (cluster).
2. **M0 / Free** chuno (free cluster kabhi expire nahi hota).
3. Provider koi bhi (AWS theek hai), region apne paas ka (India ho to **Mumbai** agar list mein hai).
4. Cluster name: `Cluster0` (default) → **Create**.

## 3. Database user
Security Quickstart khulega:
1. Username: `tripuser`
2. Password: **Autogenerate** karo aur copy karke kahin save karo.
   (Khud likh rahe ho to sirf letters + numbers rakho — `@ : / ? #` jaise characters URL mein dikkat dete hain.)
3. **Create Database User**.

## 4. Network access (kaun connect kar sakta hai)
- Apne laptop ke liye: **Add My Current IP Address**.
- College WiFi / phone hotspot ka IP badalta rehta hai, aur Part 7 (deploy) mein Render se bhi connect karna hai —
  isliye **Network Access → Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)** sabse aasaan hai.
  (Database user + strong password ki wajah se ye project ke liye theek hai.)

## 5. Connection string
1. **Overview → Connect → Drivers** (Node.js).
2. String copy karo, kuch aisi dikhegi:
   ```
   mongodb+srv://tripuser:<db_password>@cluster0.abcd123.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
3. `<db_password>` ki jagah apna password, aur `/?` se pehle database ka naam **`tripplanner`** daalo:
   ```
   mongodb+srv://tripuser:MyPass123@cluster0.abcd123.mongodb.net/tripplanner?retryWrites=true&w=majority&appName=Cluster0
   ```

## 6. `server/.env` mein daalo
```ini
MONGODB_URI=mongodb+srv://tripuser:MyPass123@cluster0.abcd123.mongodb.net/tripplanner?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=<neeche wali command ka output>
```
JWT secret banane ke liye (project folder mein):
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 7. Chalao
```bash
npm run dev
```
Terminal mein ye dikhna chahiye:
```
[DB] Connected to MongoDB "tripplanner" at ...
```
Server start hote hi **demo account** (sample Manali trip ke saath) apne-aap ban jaata hai.
Login page pe **"Try the demo account"** dabao. Demo ko reset karna ho: `npm run seed -w server -- --reset`

Data dekhna ho to: Atlas → **Browse Collections** (`users`, `trips`, `contactmessages`).

---

## Problem aaye to

| Error (terminal mein) | Matlab / fix |
| --- | --- |
| `MONGODB_URI is not set` | `server/.env` mein `MONGODB_URI=` khaali hai. |
| `querySrv ENOTFOUND` / `querySrv ECONNREFUSED` | Network `mongodb+srv` ka DNS lookup block kar raha hai (college WiFi mein common). Laptop ka DNS `8.8.8.8` karo, ya hotspot use karo, ya Atlas → Connect → Drivers mein **purane driver version** wali (non-srv, `mongodb://...:27017,...`) string use karo. |
| `bad auth : Authentication failed` | Username/password galat, ya password mein special character hai → URL-encode karo (`@` → `%40`, `#` → `%23`). |
| `Server selection timed out` | Atlas tumhara IP accept nahi kar raha → step 4 (`0.0.0.0/0`). |
| `ECONNREFUSED 127.0.0.1:27017` | Local MongoDB string di hai par local MongoDB chal nahi raha. |

## Atlas ki jagah local MongoDB (optional)
MongoDB Community Server + Compass install karo, phir:
```ini
MONGODB_URI=mongodb://127.0.0.1:27017/tripplanner
```

## Tests ke baare mein
`npm test` asli MongoDB ko **memory mein** chalata hai (`mongodb-memory-server`), tumhara Atlas data kabhi touch nahi hota.
Pehli baar MongoDB download hota hai (~70 MB, ek hi baar). Chaho to apna test server de sakte ho: `TEST_MONGODB_URI=mongodb://127.0.0.1:27017`.
