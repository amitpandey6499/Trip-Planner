import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // bundled (no CDN needed)
import { AlertTriangle, Clock, Loader2, MapPin, Navigation, RefreshCw, Route } from 'lucide-react';
import { formatDuration, formatKm, mapStops } from '@tripplanner/shared';

/**
 * Part 8 — one day on the map: numbered stops in visiting order, the real road route (OSRM) or a dashed
 * estimate, stays and restaurants as their own pins, and the list of stops with the drive between them.
 */

const COLORS = { stop: '#2563EB', food: '#D97706', stay: '#059669' };

// Leaflet 1.9 finishes a zoom animation in a 250 ms timer. If the map is removed in between (the user
// switches tab while it zooms), that timer used to throw "reading '_leaflet_pos'". Skip it for a removed map.
if (!L.Map.prototype._tpSafeZoomEnd) {
  const finishZoom = L.Map.prototype._onZoomTransitionEnd;
  L.Map.prototype._onZoomTransitionEnd = function safeZoomEnd(...args) {
    if (!this._mapPane) {
      this._animatingZoom = false;
      return undefined;
    }
    return finishZoom.apply(this, args);
  };
  L.Map.prototype._tpSafeZoomEnd = true;
}

const pin = (color, label) =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,.3)"><div style="transform:rotate(45deg);color:white;font-weight:bold;font-size:11px">${label}</div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });

const hasPosition = (place) => Boolean(place?.coordinates) && place.locationSource !== 'none' && Number.isFinite(place.coordinates.lat);
const latLng = (place) => [place.coordinates.lat, place.coordinates.lng];

/** Zoom so that everything of this day fits; only when the day (or the layers) change, not on every render. */
const FitToPoints = ({ points, fitKey }) => {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (points.length === 0) return;
    // The first fit jumps straight there (no zoom animation while the map is still appearing).
    const animate = !first.current;
    first.current = false;
    if (points.length === 1) map.setView(points[0], 14, { animate });
    else map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 15, animate });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fit only when the set of points changes
  }, [map, fitKey]);
  // (No map.stop() on unmount: react-leaflet has already removed the map by then, and remove() stops it.)
  return null;
};

/** Fly to a place and open its popup (card "View on Map", list click). */
const FocusPlace = ({ target, markers }) => {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const marker = markers.current[target.key];
    if (!marker) return;
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 15), { duration: 0.6 });
    marker.openPopup();
  }, [map, target, markers]);
  return null;
};

const sourceNote = (place) =>
  place.locationSource === 'ai' ? 'Approximate position (from the AI)' : place.locationSource === 'none' ? 'Position unknown' : null;

export const InteractiveMap = ({ day, hotels = [], restaurants = [], focus = null, mapStatus = null, onRetryRoutes, title }) => {
  const markers = useRef({});
  const [showStays, setShowStays] = useState(focus?.kind === 'stay');
  const [showFood, setShowFood] = useState(focus?.kind === 'food');
  const [target, setTarget] = useState(null);

  // A card's "View on Map" turns its layer on and focuses the pin.
  useEffect(() => {
    if (!focus) return;
    if (focus.kind === 'stay') setShowStays(true);
    if (focus.kind === 'food') setShowFood(true);
    setTarget({ key: `${focus.kind}:${focus.id}`, at: focus.at });
  }, [focus]);

  const activities = useMemo(() => day?.activities ?? [], [day]);
  const stops = useMemo(() => mapStops(day), [day]);
  const stopNumber = useMemo(() => new Map(stops.map((s, i) => [s.id, i + 1])), [stops]);
  // A route made for other stops (the day changed) is not shown.
  const route = day?.route && day.route.stopIds?.join() === stops.map((s) => s.id).join() ? day.route : null;
  const legAfter = useMemo(() => {
    const legs = new Map();
    if (route) route.stopIds.forEach((id, i) => route.legs[i] && legs.set(id, route.legs[i]));
    return legs;
  }, [route]);

  const placedActivities = activities.filter(hasPosition);
  const stays = showStays ? hotels.filter(hasPosition) : [];
  const food = showFood ? restaurants.filter(hasPosition) : [];
  const line = route?.geometry?.length > 1 ? route.geometry : stops.map((s) => [s.coordinates.lat, s.coordinates.lng]);

  const points = [...placedActivities.map(latLng), ...stays.map(latLng), ...food.map(latLng), ...(route?.geometry ?? [])];
  const fitKey = `${day?.dayNumber}|${placedActivities.length}|${stays.length}|${food.length}|${route?.signature ?? ''}`;
  const center = points[0] ?? [22.5, 79]; // India

  const working = mapStatus?.state === 'working';
  const estimated = route?.provider === 'estimate';
  const hasRoute = route && route.provider !== 'none';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-soft">
      {/* Left: stops in order, with the drive between them */}
      <div className="lg:col-span-5 flex flex-col justify-between gap-4 min-w-0">
        <div>
          <div className="border-b border-slate-100 pb-3 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Day route</span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">{title ?? `Day ${day?.dayNumber}`}</h3>
          </div>

          {working && (
            <div className="mb-3 p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-[11px] text-blue-800" role="status" data-testid="map-status">
              <div className="flex items-center gap-1.5 font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {mapStatus.message}
              </div>
              <div className="h-1.5 mt-2 rounded-full bg-blue-100 overflow-hidden">
                <div className="h-full bg-blue-600 transition-all" style={{ width: `${mapStatus.percent ?? 10}%` }} />
              </div>
            </div>
          )}
          {!working && (mapStatus?.notice || mapStatus?.state === 'error') && (
            <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5" role="status" data-testid="map-notice">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span className="flex-1">{mapStatus.state === 'error' ? `Map update failed: ${mapStatus.message}` : mapStatus.notice}</span>
              {onRetryRoutes && (
                <button type="button" onClick={onRetryRoutes} className="font-semibold underline whitespace-nowrap inline-flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              )}
            </div>
          )}

          <ol className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {activities.map((activity, index) => {
              const number = stopNumber.get(String(activity.id));
              const leg = number ? legAfter.get(String(activity.id)) : null;
              const placed = hasPosition(activity);
              const isFood = activity.category === 'Restaurant';
              return (
                <li key={activity.id ?? index}>
                  <button
                    type="button"
                    disabled={!placed}
                    onClick={() => setTarget({ key: `act:${activity.id}`, at: Date.now() })}
                    className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 enabled:hover:bg-blue-50/60 border border-slate-200/60 text-left text-xs disabled:opacity-60"
                    title={placed ? 'Show on the map' : 'This stop has no position on the map'}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                          number ? (isFood ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white') : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {number ?? '•'}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-bold text-slate-800 truncate">{activity.placeName}</span>
                        <span className="block text-[11px] text-slate-500">
                          {activity.category}
                          {sourceNote(activity) ? ` • ${sourceNote(activity)}` : ''}
                        </span>
                      </span>
                    </span>
                    <span className="font-semibold text-slate-600 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-200/80 whitespace-nowrap">
                      <Clock className="w-3 h-3 text-blue-600" />
                      {activity.timeSlot?.split(' - ')[0] || '—'}
                    </span>
                  </button>
                  {leg && (
                    <p className="ml-9 my-1 text-[10px] font-semibold text-slate-500 flex items-center gap-1" data-testid="route-leg">
                      <Navigation className="w-3 h-3 text-slate-400" />
                      {estimated ? '≈ ' : ''}
                      {formatKm(leg.distanceKm)} • {formatDuration(leg.durationMin)} by road{estimated ? ' (estimate)' : ''}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Route className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-700 block">{estimated ? 'Distance (estimate)' : 'Road distance'}</span>
              <span className="text-xs font-bold text-slate-900" data-testid="route-distance">
                {hasRoute ? `${estimated ? '≈ ' : ''}${formatKm(route.distanceKm)}` : working ? '…' : '—'}
              </span>
            </div>
          </div>
          <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Driving time</span>
              <span className="text-xs font-bold text-slate-900" data-testid="route-time">
                {hasRoute ? `${estimated ? '≈ ' : ''}${formatDuration(route.durationMin)}` : working ? '…' : '—'}
              </span>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 -mt-2">
          <MapPin className="w-3 h-3 inline -mt-0.5" /> {placedActivities.length} of {activities.length} stops on the map.{' '}
          {route?.provider === 'osrm' && 'Road route: OSRM (OpenStreetMap data); drive times are without traffic.'}
          {estimated && 'Straight lines between stops; real roads are longer.'}
        </p>
      </div>

      {/* Right: the map */}
      <div className="lg:col-span-7 h-[420px] lg:h-[500px] rounded-xl overflow-hidden border border-slate-200 relative" data-testid="day-map">
        <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="w-full h-full">
          <FitToPoints points={points} fitKey={fitKey} />
          <FocusPlace target={target} markers={markers} />
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {line.length > 1 && (
            <Polyline
              positions={line}
              pathOptions={{ color: COLORS.stop, opacity: 0.75, weight: route?.provider === 'osrm' ? 5 : 4, dashArray: route?.provider === 'osrm' ? undefined : '6 8' }}
            />
          )}

          {placedActivities.map((activity) => {
            const number = stopNumber.get(String(activity.id));
            const isFood = activity.category === 'Restaurant';
            return (
              <Marker
                key={`act:${activity.id}`}
                ref={(m) => {
                  if (m) markers.current[`act:${activity.id}`] = m;
                }}
                position={latLng(activity)}
                icon={pin(isFood ? COLORS.food : COLORS.stop, number ?? '•')}
              >
                <Popup>
                  <div className="max-w-[220px]">
                    <p className="font-bold text-sm text-slate-900">{activity.placeName}</p>
                    <p className="text-xs text-slate-500">{activity.timeSlot}</p>
                    {sourceNote(activity) && <p className="text-[11px] text-amber-700 mt-0.5">{sourceNote(activity)}</p>}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {stays.map((hotel) => (
            <Marker
              key={`stay:${hotel.id}`}
              ref={(m) => {
                if (m) markers.current[`stay:${hotel.id}`] = m;
              }}
              position={latLng(hotel)}
              icon={pin(COLORS.stay, 'H')}
            >
              <Popup>
                <p className="font-bold text-sm">{hotel.name}</p>
                {hotel.address && <p className="text-xs text-slate-500">{hotel.address}</p>}
              </Popup>
            </Marker>
          ))}
          {food.map((restaurant) => (
            <Marker
              key={`food:${restaurant.id}`}
              ref={(m) => {
                if (m) markers.current[`food:${restaurant.id}`] = m;
              }}
              position={latLng(restaurant)}
              icon={pin(COLORS.food, 'R')}
            >
              <Popup>
                <p className="font-bold text-sm">{restaurant.name}</p>
                {restaurant.cuisine && <p className="text-xs text-slate-500">{restaurant.cuisine}</p>}
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Layers */}
        <div className="absolute top-3 right-3 bg-white/95 px-2.5 py-2 rounded-lg border border-slate-200 shadow-md z-[1000] text-[11px] space-y-1">
          <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={showStays} onChange={(e) => setShowStays(e.target.checked)} />
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS.stay }} /> Stays
          </label>
          <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={showFood} onChange={(e) => setShowFood(e.target.checked)} />
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS.food }} /> Restaurants
          </label>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMap;
