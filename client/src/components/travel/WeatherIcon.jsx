import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun } from 'lucide-react';

const ICONS = { sun: Sun, 'cloud-sun': CloudSun, cloud: Cloud, fog: CloudFog, drizzle: CloudDrizzle, rain: CloudRain, snow: Snowflake, storm: CloudLightning };
const COLORS = { sun: 'text-amber-500', 'cloud-sun': 'text-amber-500', cloud: 'text-slate-500', fog: 'text-slate-400', drizzle: 'text-sky-500', rain: 'text-blue-600', snow: 'text-cyan-500', storm: 'text-indigo-600' };

export const WeatherIcon = ({ icon, className = 'w-5 h-5' }) => {
  const Icon = ICONS[icon] ?? Cloud;
  return <Icon className={`${className} ${COLORS[icon] ?? 'text-slate-500'}`} aria-hidden="true" />;
};

export default WeatherIcon;
