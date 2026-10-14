import { useEffect, useState } from 'react';
import { tripApi } from '../services/api';

// One request per page load, shared by every component that needs it.
let cachedPromise = null;

const loadStatus = () => {
  if (!cachedPromise) {
    cachedPromise = tripApi.getHealth().catch((err) => {
      cachedPromise = null; // allow a retry on the next mount
      throw err;
    });
  }
  return cachedPromise;
};

/**
 * Real server status from GET /api/health.
 * Returns { status, error, loading } where status = { services, database, ... } or null.
 */
export const useSystemStatus = () => {
  const [state, setState] = useState({ status: null, error: null, loading: true });

  useEffect(() => {
    let active = true;
    loadStatus()
      .then((status) => active && setState({ status, error: null, loading: false }))
      .catch((error) => active && setState({ status: null, error, loading: false }));
    return () => {
      active = false;
    };
  }, []);

  return state;
};

export default useSystemStatus;
