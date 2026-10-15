/**
 * Part 11 — WMO weather codes (used by Open-Meteo) → short text + icon name.
 * https://open-meteo.com/en/docs (weather_code)
 */
const CODES = [
  [[0], 'Clear sky', 'sun'],
  [[1], 'Mostly clear', 'sun'],
  [[2], 'Partly cloudy', 'cloud-sun'],
  [[3], 'Cloudy', 'cloud'],
  [[45, 48], 'Fog', 'fog'],
  [[51, 53, 55, 56, 57], 'Drizzle', 'drizzle'],
  [[61, 63, 66, 80, 81], 'Rain', 'rain'],
  [[65, 67, 82], 'Heavy rain', 'rain'],
  [[71, 73, 75, 77, 85, 86], 'Snow', 'snow'],
  [[95, 96, 99], 'Thunderstorm', 'storm'],
];

export const weatherInfo = (code) => {
  const found = CODES.find(([codes]) => codes.includes(Number(code)));
  return found ? { summary: found[1], icon: found[2] } : { summary: 'Mixed weather', icon: 'cloud' };
};

/** Higher = worse weather (used to pick the "typical" code when years disagree). */
export const weatherSeverity = (code) => {
  const c = Number(code);
  if (c >= 95) return 9;
  if (c >= 71 && c <= 86 && ![80, 81, 82].includes(c)) return 8;
  if ([65, 67, 82].includes(c)) return 7;
  if ([61, 63, 66, 80, 81].includes(c)) return 6;
  if (c >= 51 && c <= 57) return 5;
  if (c === 45 || c === 48) return 4;
  return Math.min(3, Math.max(0, c));
};

/** Is this a day to plan around (rain, snow, storms)? */
export const isWetDay = (day) =>
  Boolean(day) && ((day.rainChance ?? 0) >= 50 || (day.rainMm ?? 0) >= 3 || ['rain', 'storm', 'snow'].includes(weatherInfo(day.code).icon));
