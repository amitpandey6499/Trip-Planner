import { useEffect, useState } from 'react';
import { useTrip } from '../context/TripContext';

/**
 * Make sure the saved trip with this URL id is the one in memory.
 * Returns 'ready' | 'loading' | 'missing'. With no id (new / draft pages) it is 'ready'
 * as soon as the session draft has been restored.
 *
 * If the same trip is already open (e.g. it was regenerated but not saved yet, or the
 * unsaved version came back from the session draft after a refresh) it is NOT reloaded,
 * so unsaved changes are kept.
 */
export const useTripFromUrl = (id) => {
  const { currentTripId, loadTripById, draftReady } = useTrip();
  const [status, setStatus] = useState(!draftReady || (id && id !== currentTripId) ? 'loading' : 'ready');

  useEffect(() => {
    // Wait until TripContext has restored this tab's draft, otherwise a refresh would
    // load the saved version first and then the draft would overwrite it (or the other way round).
    if (!draftReady) {
      setStatus('loading');
      return undefined;
    }
    if (!id || id === currentTripId) {
      setStatus('ready');
      return undefined;
    }
    let active = true;
    setStatus('loading');
    loadTripById(id).then((trip) => {
      if (active) setStatus(trip ? 'ready' : 'missing');
    });
    return () => {
      active = false;
    };
  }, [id, currentTripId, loadTripById, draftReady]);

  return status;
};

export default useTripFromUrl;
