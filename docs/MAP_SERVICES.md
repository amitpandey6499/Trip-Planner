# Map services (Part 8)

TripPlanner do free OpenStreetMap community services use karta hai. Dono ki **usage policy** hai — inhe todna mana hai,
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

- Har din ka route `days[i].route` mein (`provider: osrm | estimate | none`, `signature` = stops ka fingerprint).
  Din badla (Regenerate day) → signature badla → sirf us din ka naya route.
- Progress live aata hai (Server-Sent Events): "Finding places on the map (12/28)", "Road route for Day 2".
- Koi service down ho to app crash nahi hota: estimate + notice, aur map tab mein **Retry**.

## Test

- Server tests (`server/test/map.test.js`) **fake** Nominatim/OSRM use karte hain (internet nahi chahiye): queue ka gap,
  User-Agent, cache, service down, NoRoute, saved trip, sirf owner.
- Asli services ko apne laptop pe check karo: koi bhi AI wala plan banao → Map View → "Road distance" aur line dikhni chahiye.
