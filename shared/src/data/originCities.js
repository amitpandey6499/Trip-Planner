/**
 * Part 11 — starting cities for "How to reach": position, nearest airport (IATA) and main railway station (code).
 * A city not in this list can still be typed; the server then finds it on the map (without airport / station).
 */
const city = (name, state, lat, lng, airport, station, stationName) => ({ name, state, lat, lng, airport, station, stationName });

export const ORIGIN_CITIES = Object.freeze([
  city('Delhi', 'Delhi', 28.6139, 77.209, 'DEL', 'NDLS', 'New Delhi'),
  city('Ghaziabad', 'Uttar Pradesh', 28.6692, 77.4538, 'DEL', 'GZB', 'Ghaziabad'),
  city('Noida', 'Uttar Pradesh', 28.5355, 77.391, 'DEL', 'NDLS', 'New Delhi'),
  city('Gurugram', 'Haryana', 28.4595, 77.0266, 'DEL', 'GGN', 'Gurgaon'),
  city('Mumbai', 'Maharashtra', 19.076, 72.8777, 'BOM', 'CSMT', 'Mumbai CSMT'),
  city('Pune', 'Maharashtra', 18.5204, 73.8567, 'PNQ', 'PUNE', 'Pune Junction'),
  city('Bengaluru', 'Karnataka', 12.9716, 77.5946, 'BLR', 'SBC', 'KSR Bengaluru'),
  city('Chennai', 'Tamil Nadu', 13.0827, 80.2707, 'MAA', 'MAS', 'Chennai Central'),
  city('Kolkata', 'West Bengal', 22.5726, 88.3639, 'CCU', 'HWH', 'Howrah'),
  city('Hyderabad', 'Telangana', 17.385, 78.4867, 'HYD', 'SC', 'Secunderabad'),
  city('Ahmedabad', 'Gujarat', 23.0225, 72.5714, 'AMD', 'ADI', 'Ahmedabad Junction'),
  city('Surat', 'Gujarat', 21.1702, 72.8311, 'STV', 'ST', 'Surat'),
  city('Jaipur', 'Rajasthan', 26.9124, 75.7873, 'JAI', 'JP', 'Jaipur Junction'),
  city('Lucknow', 'Uttar Pradesh', 26.8467, 80.9462, 'LKO', 'LKO', 'Lucknow Charbagh'),
  city('Varanasi', 'Uttar Pradesh', 25.3176, 82.9739, 'VNS', 'BSB', 'Varanasi Junction'),
  city('Chandigarh', 'Chandigarh', 30.7333, 76.7794, 'IXC', 'CDG', 'Chandigarh'),
  city('Amritsar', 'Punjab', 31.634, 74.8723, 'ATQ', 'ASR', 'Amritsar Junction'),
  city('Dehradun', 'Uttarakhand', 30.3165, 78.0322, 'DED', 'DDN', 'Dehradun'),
  city('Bhopal', 'Madhya Pradesh', 23.2599, 77.4126, 'BHO', 'BPL', 'Bhopal Junction'),
  city('Indore', 'Madhya Pradesh', 22.7196, 75.8577, 'IDR', 'INDB', 'Indore Junction'),
  city('Nagpur', 'Maharashtra', 21.1458, 79.0882, 'NAG', 'NGP', 'Nagpur Junction'),
  city('Patna', 'Bihar', 25.5941, 85.1376, 'PAT', 'PNBE', 'Patna Junction'),
  city('Guwahati', 'Assam', 26.1445, 91.7362, 'GAU', 'GHY', 'Guwahati'),
  city('Bhubaneswar', 'Odisha', 20.2961, 85.8245, 'BBI', 'BBS', 'Bhubaneswar'),
  city('Visakhapatnam', 'Andhra Pradesh', 17.6868, 83.2185, 'VTZ', 'VSKP', 'Visakhapatnam'),
  city('Kochi', 'Kerala', 9.9312, 76.2673, 'COK', 'ERS', 'Ernakulam Junction'),
  city('Coimbatore', 'Tamil Nadu', 11.0168, 76.9558, 'CJB', 'CBE', 'Coimbatore Junction'),
]);

const ALIASES = {
  'new delhi': 'Delhi',
  bangalore: 'Bengaluru',
  bombay: 'Mumbai',
  calcutta: 'Kolkata',
  madras: 'Chennai',
  gurgaon: 'Gurugram',
  cochin: 'Kochi',
  vizag: 'Visakhapatnam',
};

/** "ghaziabad", "Ghaziabad, UP", "New Delhi", "Bangalore" → the city, or null. */
export const findOriginCity = (text) => {
  const wanted = String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!wanted) return null;
  const aliasName = ALIASES[wanted] ?? Object.entries(ALIASES).find(([alias]) => wanted.startsWith(`${alias} `))?.[1];
  return (
    ORIGIN_CITIES.find((c) => c.name.toLowerCase() === wanted || c.name === aliasName) ??
    ORIGIN_CITIES.find((c) => wanted.startsWith(`${c.name.toLowerCase()} `)) ??
    null
  );
};
