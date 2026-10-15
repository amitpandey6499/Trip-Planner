import { useEffect, useId } from 'react';
import { AlertTriangle } from 'lucide-react';

const TONES = {
  danger: { icon: 'bg-red-100 text-red-600', button: 'bg-red-600 hover:bg-red-700' },
  warning: { icon: 'bg-amber-100 text-amber-600', button: 'bg-blue-600 hover:bg-blue-700' },
};

/** Small "are you sure?" dialog. Esc or Cancel closes it. */
export const ConfirmDialog = ({ title, children, confirmLabel, cancelLabel = 'Cancel', tone = 'danger', busy = false, onConfirm, onCancel }) => {
  const titleId = useId();
  const styles = TONES[tone] ?? TONES.danger;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95"
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${styles.icon}`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h3 id={titleId} className="text-lg font-bold text-slate-900">
            {title}
          </h3>
          <div className="text-xs text-slate-500 mt-1 space-y-1">{children}</div>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="w-1/2 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`w-1/2 py-2 rounded-xl text-white text-xs font-semibold shadow-xs disabled:opacity-70 ${styles.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
