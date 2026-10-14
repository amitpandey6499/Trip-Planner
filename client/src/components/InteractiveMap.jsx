import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Clock, Navigation, MapPin, Gauge } from 'lucide-react';

// Fix Leaflet marker icon issue in Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored SVG pin creators
const createCustomIcon = (color = '#2563EB', label = '') => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: 11px;
        ">${label}</div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
};

// Component to dynamically re-center map when coordinates change
const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

export const InteractiveMap = ({
  stops = [],
  dayTitle = 'Day Route View',
  totalDistance = '98 km (approx.)',
  estimatedTime = '3.5 hours',
  defaultCenter = [32.2432, 77.1892]
}) => {
  // Extract coordinates for markers and polylines
  const validStops = stops.filter(s => s.coordinates && s.coordinates.lat && s.coordinates.lng);
  
  const mapCenter = validStops.length > 0 
    ? [validStops[0].coordinates.lat, validStops[0].coordinates.lng] 
    : defaultCenter;

  const polylinePositions = validStops.map(s => [s.coordinates.lat, s.coordinates.lng]);

  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const tileUrl = mapboxToken
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const attribution = mapboxToken
    ? '© <a href="https://www.mapbox.com/">Mapbox</a>'
    : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-soft">
      
      {/* Left Stops Timeline & Metrics */}
      <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
        <div>
          <div className="border-b border-slate-100 pb-3 mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Itinerary Waypoints
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">{dayTitle}</h3>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {stops.map((stop, index) => {
              const isHotel = stop.category === 'Hotel' || (stop.placeName && stop.placeName.toLowerCase().includes('hotel'));
              const isTransit = stop.category === 'Transit';
              const isRestaurant = stop.category === 'Restaurant';

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200/60 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white ${
                        isHotel ? 'bg-emerald-600' : isRestaurant ? 'bg-amber-600' : 'bg-blue-600'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">{stop.placeName}</p>
                      <p className="text-[11px] text-slate-500 capitalize">{stop.category || 'Stop'}</p>
                    </div>
                  </div>

                  <span className="font-semibold text-slate-600 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-200/80">
                    <Clock className="w-3 h-3 text-blue-600" />
                    {stop.timeSlot || `${9 + index}:00 AM`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Distance & Travel Time Cards (matching Screen 6) */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-700 block">Total Distance</span>
              <span className="text-xs font-bold text-slate-900">{totalDistance}</span>
            </div>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Est. Travel Time</span>
              <span className="text-xs font-bold text-slate-900">{estimatedTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Interactive Map */}
      <div className="lg:col-span-7 h-[420px] lg:h-[480px] rounded-xl overflow-hidden border border-slate-200 relative">
        <MapContainer
          center={mapCenter}
          zoom={12}
          scrollWheelZoom={false}
          className="w-full h-full"
        >
          <MapRecenter center={mapCenter} />
          <TileLayer
            attribution={attribution}
            url={tileUrl}
          />

          {/* Route line connecting stops */}
          {polylinePositions.length > 1 && (
            <Polyline
              positions={polylinePositions}
              color="#2563EB"
              weight={4}
              opacity={0.8}
              dashArray="6, 8"
            />
          )}

          {/* Stop markers */}
          {validStops.map((stop, idx) => {
            const isHotel = stop.category === 'Hotel' || (stop.placeName && stop.placeName.toLowerCase().includes('hotel'));
            const isRestaurant = stop.category === 'Restaurant';
            const color = isHotel ? '#059669' : isRestaurant ? '#D97706' : '#2563EB';

            return (
              <Marker
                key={idx}
                position={[stop.coordinates.lat, stop.coordinates.lng]}
                icon={createCustomIcon(color, idx + 1)}
              >
                <Popup>
                  <div className="p-1 max-w-[200px]">
                    <h4 className="font-bold text-sm text-slate-900">{stop.placeName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{stop.timeSlot || ''}</p>
                    {stop.description && (
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{stop.description}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Legend Overlay */}
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-md z-[1000] text-[10px] flex items-center gap-3">
          <span className="flex items-center gap-1 font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Hotel
          </span>
          <span className="flex items-center gap-1 font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span> Sight
          </span>
          <span className="flex items-center gap-1 font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-amber-600"></span> Food
          </span>
        </div>
      </div>

    </div>
  );
};

export default InteractiveMap;
