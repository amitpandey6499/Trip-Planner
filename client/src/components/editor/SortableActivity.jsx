import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import ActivityCard from '../ActivityCard';

/**
 * Part 12 — an activity in edit mode: drag it by the handle (mouse, touch or keyboard: Space, arrows, Space),
 * or use Edit / Remove. A day keeps at least one activity, so its last one can not be removed.
 */
export const SortableActivity = ({ activity, leg, estimated, overlap, canRemove, onEdit, onRemove }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: String(activity.id) });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} data-testid="sortable-activity">
      <ActivityCard
        activity={activity}
        leg={isDragging ? null : leg}
        estimated={estimated}
        overlap={overlap}
        dimmed={isDragging}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Move ${activity.placeName}`}
            title="Drag to change the order, or drop on a day on the left"
            className="no-print self-stretch md:self-auto flex items-center justify-center w-full md:w-8 h-8 md:h-auto md:min-h-[4rem] rounded-xl border border-dashed border-slate-300 text-slate-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 touch-none"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        }
        actions={
          <span className="no-print flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(activity)}
              aria-label={`Edit ${activity.placeName}`}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-300"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(activity)}
              disabled={!canRemove}
              aria-label={`Remove ${activity.placeName}`}
              title={canRemove ? 'Remove from this day' : 'A day needs at least one activity'}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-300 disabled:opacity-40 disabled:hover:text-slate-500 disabled:hover:border-slate-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </span>
        }
      />
    </div>
  );
};

export default SortableActivity;
