import { AlertTriangle, CheckCircle2, Check, Loader2, Plus, Redo2, Undo2 } from 'lucide-react';
import { formatINR } from '@tripplanner/shared';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '');
const MOD = isMac ? '⌘' : 'Ctrl';

const ToolButton = ({ onClick, disabled, label, shortcut, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={shortcut ? `${label} (${shortcut})` : label}
    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:hover:bg-white"
  >
    {children}
  </button>
);

/**
 * Part 12 — stays at the top while editing: what you can do, the live estimate (budget follows every change),
 * Undo / Redo, Add, Done. Nothing is stored until the trip is saved.
 */
export const EditToolbar = ({ itinerary, canUndo, canRedo, onUndo, onRedo, onAdd, onDone, mapWorking }) => {
  const over = itinerary.totalBudget > 0 && !itinerary.withinBudget;
  return (
    <div
      className="sticky top-16 sm:top-20 z-30 mb-6 bg-white/95 backdrop-blur-md rounded-2xl border border-blue-200 shadow-soft p-2.5 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3 no-print"
      role="toolbar"
      aria-label="Edit the plan"
      data-testid="edit-toolbar"
    >
      <div className="min-w-0 hidden sm:block">
        <p className="text-sm font-bold text-slate-900">Editing your plan</p>
        <p className="hidden sm:block text-[11px] text-slate-500">
          Drag <span className="font-bold">⠿</span> to change the order, or drop it on a day on the left. Times follow the new order. Save the trip to keep your changes.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border ${
            over ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
          data-testid="edit-estimate"
          aria-live="polite"
        >
          {over ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Est. {formatINR(itinerary.estimatedTotal)}
          {itinerary.totalBudget > 0 && <span className="font-normal">of {formatINR(itinerary.totalBudget)}</span>}
        </span>
        {mapWorking && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500" role="status">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Map
          </span>
        )}
        <ToolButton onClick={onUndo} disabled={!canUndo} label="Undo" shortcut={`${MOD}+Z`}>
          <Undo2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Undo</span>
        </ToolButton>
        <ToolButton onClick={onRedo} disabled={!canRedo} label="Redo" shortcut={isMac ? '⌘+Shift+Z' : 'Ctrl+Y'}>
          <Redo2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Redo</span>
        </ToolButton>
        <ToolButton onClick={onAdd} label="Add activity">
          <Plus className="w-3.5 h-3.5" /> Add
        </ToolButton>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
        >
          <Check className="w-3.5 h-3.5" /> Done
        </button>
      </div>
    </div>
  );
};

export default EditToolbar;
