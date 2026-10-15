import { Check } from 'lucide-react';
import { useTrip } from '../context/TripContext';

/** One place for success messages (saved, updated, renamed, deleted), on every page. Optional button (e.g. Undo). */
export const Toast = () => {
  const { successToast, toastAction, hideToast } = useTrip();
  if (!successToast) return null;
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 bg-slate-900 text-white pl-5 ${toastAction ? 'pr-3' : 'pr-5'} py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 border border-slate-700 no-print`}
      role="status"
    >
      <Check className="w-4 h-4 text-emerald-400" />
      <span>{successToast}</span>
      {toastAction && (
        <button
          type="button"
          onClick={() => {
            toastAction.onClick();
            hideToast();
          }}
          className="ml-2 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-blue-200 font-bold"
        >
          {toastAction.label}
        </button>
      )}
    </div>
  );
};

export default Toast;
