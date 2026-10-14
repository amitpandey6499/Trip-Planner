import { useState } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { LIMITS } from '@tripplanner/shared';

/** Trip title that can be renamed in place (Enter = save, Esc = cancel). */
export const TripTitle = ({ trip, onRename }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(trip.title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cancel = () => {
    setEditing(false);
    setValue(trip.title);
    setError('');
  };

  const save = async () => {
    const title = value.trim();
    if (!title) return setError('Title is required.');
    if (title === trip.title) return cancel();
    setSaving(true);
    try {
      await onRename(trip.id, title);
      setEditing(false);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 group">
        {trip.title}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="p-1 rounded-md text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          aria-label={`Rename ${trip.title}`}
          title="Rename"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </h3>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          aria-label="Trip title"
          value={value}
          maxLength={LIMITS.MAX_TITLE_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
          className="text-sm font-bold text-slate-900 px-2 py-1 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64 max-w-full"
        />
        <button type="button" onClick={save} disabled={saving} className="p-1.5 rounded-md bg-blue-600 text-white" aria-label="Save title">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
        <button type="button" onClick={cancel} className="p-1.5 rounded-md border border-slate-200 text-slate-500" aria-label="Cancel rename">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {error && <p className="text-[11px] font-semibold text-red-600 mt-1">{error}</p>}
    </div>
  );
};

export default TripTitle;
