import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { favoritesApi } from '../services/api';

/**
 * Part 10 — ❤️ favourite destinations (saved on the account).
 * Guests are sent to the login page and come back to the same page afterwards.
 */
export const useFavorites = () => {
  const { user, setFavorites } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(null);
  const favorites = useMemo(() => user?.favorites ?? [], [user?.favorites]);

  const isFavorite = useCallback((slug) => favorites.includes(slug), [favorites]);

  const toggle = useCallback(
    async (slug) => {
      if (!user) {
        navigate('/auth', { state: { from: location.pathname + location.search, message: 'Sign in to save favourite destinations.' } });
        return;
      }
      setBusy(slug);
      try {
        const res = favorites.includes(slug) ? await favoritesApi.remove(slug) : await favoritesApi.add(slug);
        setFavorites(res.data);
      } catch (err) {
        console.warn('Favourite not saved:', err.message);
      } finally {
        setBusy(null);
      }
    },
    [user, favorites, navigate, location, setFavorites],
  );

  return { favorites, isFavorite, toggle, busy };
};

export default useFavorites;
