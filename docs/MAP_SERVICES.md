# Outside services (Parts 8, 10, 11)

TripPlanner free community services use karta hai: map ke liye OpenStreetMap (Part 8), photos ke liye Wikipedia (Part 10),
mausam ke liye Open-Meteo (Part 11) — neeche. Sabki **usage policy** hai — inhe todna mana hai,
warna server block ho sakta hai. Server in rules ko apne-aap follow karta hai; neeche likha hai kaise.

| Kaam | Service | Default URL | Policy |
| --- | --- | --- | --- |
| Jagah ka naam → position (geocoding) | **Nominatim** | `https://nominatim.openstreetmap.org` | https://operations.osmfoundation.org/policies/nominatim/ |
| Stops ke beech road route, km, time | **OSRM** (FOSSGIS server) | `https://routing.openstreetmap.de/routed-car` | https://map.project-osrm.org/about.html (FOSSGIS terms: max 1 request/second, no heavy use) |
| Map tiles | OpenStreetMap | `tile.openstreetmap.org` | https://operations.osmfoundation.org/policies/tiles/ |

## Policy ke rules aur app unhe kaise follow karti hai

| Rule (policy) | App mein |
| --- | --- |
| Max **1 request / second** (poore app ke liye, har user ke liye nahi) | `services/geo/geoHttp.js`: har service ki **ek queue**, do requests ke beech 1.1 s |
| App ko pehchaan do (valid User-Agent; library ka default nahi chalega) | `User-Agent: TripPlanner/<version> (B.Tech mini project, ...)` — `GEO_USER_AGENT` se badal sakte ho |
| Results **cache** karo, same cheez baar-baar mat poochho | MongoDB `GeoCache` (found: `GEO_CACHE_DAYS`, not found: 7 din); same itinerary dobara = 0 requests |
| Bulk geocoding nahi | Sirf AI wale plans ke places (ek plan mein max 45 lookups); curated places kabhi lookup nahi hote |
| Autocomplete (har key press pe search) mana hai | Use hi nahi kiya — sirf server, plan banne ke baad |
| Attribution dikhao | Map pe "© OpenStreetMap contributors", route ke neeche "Road route: OSRM (OpenStreetMap data)" |

> Zyada users / commercial use ho to public servers ki jagah **apna Nominatim / OSRM** chalao ya koi paid provider lo,
> aur `NOMINATIM_URL` / `OSRM_URL` badal do — API same hai. Network calls band karne ho to `MAP_ENABLED=false`
> (tab distances straight-line estimate hongi aur app saaf "estimate" likhegi).

## Kaise kaam karta hai

```
plan bana / trip khula ──► needsMapUpdate()?  (shared/src/utils/map.js)
                              │ haan
                              ▼
     POST /api/map/enrich  (unsaved plan)      POST /api/trips/:id/map  (saved trip → result trip ke saath save)
                              │
            1. places:  curated → as it is │ AI ke places → "Amber Fort, Jaipur" Nominatim se
                        mila + destination ke 300 km andar → geocoded │ nahi mila → AI ka andaza (ai) ya hata do (none)
            2. routes:  har din ke stops (mapStops) → OSRM → road km, time, line (max 400 points)
                        OSRM down → estimate (straight × 1.35, 25 km/h) + notice │ "NoRoute" (islands) → estimate
            3. map:     { version, updatedAt, located, total, notice }
```

- Offline (curated) plans ki jagahon ki position pehle se hoti hai — lookup nahi. Part 12: editor mein **haath se likhi** nayi jagah
  (position ke bina) dhoondhi jaati hai; curated "idea" apni position saath laata hai. Sirf badle hue din ka route dobara.
- Har din ka route `days[i].route` mein (`provider: osrm | estimate | none`, `signature` = stops ka fingerprint).
  Din badla (Regenerate day) → signature badla → sirf us din ka naya route.
- Progress live aata hai (Server-Sent Events): "Finding places on the map (12/28)", "Road route for Day 2".
- Koi service down ho to app crash nahi hota: estimate + notice, aur map tab mein **Retry**.

## Test

- Server tests (`server/test/map.test.js`) **fake** Nominatim/OSRM use karte hain (internet nahi chahiye): queue ka gap,
  User-Agent, cache, service down, NoRoute, saved trip, sirf owner.
- Asli services ko apne laptop pe check karo: koi bhi AI wala plan banao → Map View → "Road distance" aur line dikhni chahiye.

## Part 10 + 11: photos (Wikipedia) aur mausam (Open-Meteo)

| Kaam | Service | Default URL | Policy |
| --- | --- | --- | --- |
| Destination ki photo (article ki lead image) | **Wikipedia API** (`action=query&prop=pageimages`) | `https://en.wikipedia.org/w/api.php` | https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/documentation/access-policy.html |
| Trip dates ka mausam (16 din forecast) | **Open-Meteo Forecast** | `https://api.open-meteo.com` | https://open-meteo.com/en/terms |
| Aage ki dates ka "typical" mausam | **Open-Meteo Historical (archive)** | `https://archive-api.open-meteo.com` | https://open-meteo.com/en/terms |
| "How to reach" ka road distance | OSRM (upar wala) | — | upar wala |

| Rule (policy) | App mein |
| --- | --- |
| Wikimedia: har API request mein **User-Agent** jo app ko pehchaane (contact ho to behtar) | wahi `User-Agent` (`GEO_USER_AGENT`) — apni site / e-mail daal do |
| Wikimedia: photos ka licence aur credit | sirf free-licence images (`pilicense=free`), har photo pe "Wikipedia (licence)" link file page pe |
| Wikipedia: bina zarurat baar-baar mat poochho | photo **destination ke document mein cache**, 30 din baad refresh, nahi mili to 24 h baad; queue mein 250 ms gap; 26 destinations = 26 requests |
| Open-Meteo free API: **sirf non-commercial**, < 10,000 calls/day (5,000/h, 600/min) | ek trip ke mausam = 1 forecast call + "typical" ke liye 3 archive calls; MongoDB cache (forecast 3 h, typical 180 din); queue mein 150 ms gap |
| Open-Meteo data **CC BY 4.0** → credit dikhana | har weather box ke neeche "Weather data by Open-Meteo.com" link + licence |

- "Typical" = pichhle 3 saal ki **same dates** ka average (max/min °C, kitne saal baarish hui). App pe saaf likha hota hai
  "usual — not a forecast". Trip 16 din ke andar aate hi asli forecast dikhne lagta hai.
- Network band karna ho: `PHOTOS_ENABLED=false` (placeholder dikhega), `WEATHER_ENABLED=false` (mausam ki jagah message).
- Commercial use ho to Open-Meteo ka paid plan / apna server chahiye (unki terms dekho).

**Test:** `server/test/destinations.test.js` (fake Wikipedia) aur `server/test/travel.test.js` (fake Open-Meteo / OSRM / Nominatim).
Yahan (sandbox) se asli services tak internet nahi hai — laptop pe ek baar destination page aur "Weather & Packing" tab khol ke dekh lena.
