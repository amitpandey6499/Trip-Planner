import { useEffect, useState } from 'react';
import { travelApi } from '../services/api';

/** Part 11 — weather for a date range (forecast / typical / actual, decided by the server). */
export const useWeather = ({ destination, start, end, lat, lng, enabled = true }) => {
  const [state, setState] = useState({ data: null, loading: false, error: null });

  useEffect(() => {
    if (!enabled || !destination || !start || !end) return undefined;
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    const position = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {};
    travelApi
      .weather({ destination, start, end, ...position })
      .then((res) => active && setState({ data: res.data, loading: false, error: null }))
      .catch((err) => active && setState({ data: null, loading: false, error: err.message }));
    return () => {
      active = false;
    };
  }, [destination, start, end, lat, lng, enabled]);

  return state;
};

export default useWeather;
