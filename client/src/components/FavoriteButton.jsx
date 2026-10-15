import { Heart } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';

/** ❤️ toggle, saved on the account (Part 10). */
export const FavoriteButton = ({ slug, name, className = '' }) => {
  const { isFavorite, toggle, busy } = useFavorites();
  const on = isFavorite(slug);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
      disabled={busy === slug}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from favourites` : `Save ${name} to favourites`}
      title={on ? 'Saved to favourites' : 'Save to favourites'}
      className={`w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-sm transition-colors hover:text-red-500 disabled:opacity-60 ${on ? 'text-red-500' : 'text-slate-700'} ${className}`}
    >
      <Heart className={`w-4 h-4 ${on ? 'fill-red-500' : ''}`} />
    </button>
  );
};

export default FavoriteButton;
