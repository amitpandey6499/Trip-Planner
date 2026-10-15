import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Bed, ChevronRight, GripVertical, Map } from 'lucide-react';
import { formatDate, formatINR } from '@tripplanner/shared';
import { useTrip } from '../../context/TripContext';
import DayTimeline from '../DayTimeline';
import ActivityDialog from './ActivityDialog';
import EditToolbar from './EditToolbar';

const DAY_PREFIX = 'day-';
const isDayTarget = (id) => String(id).startsWith(DAY_PREFIX);

/**
 * Over a day in the left list → that day (move the activity there); otherwise the nearest activity of the open day.
 * The keyboard has no pointer, so it only sorts inside the day (other days: Edit → Day).
 */
const collisionDetection = (args) => {
  const overDay = pointerWithin(args).filter((c) => isDayTarget(c.id));
  if (overDay.length) return overDay;
  return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => !isDayTarget(c.id)) });
};

/**
 * Arrow keys step through the day's activities only (dnd-kit's helper would also jump to a day in the left list
 * when it happens to be nearer). Moving to another day by keyboard: the activity's Edit → Day.
 */
const keyboardCoordinates = (event, args) => {
  const all = args.context.droppableContainers;
  const activitiesOnly = { getEnabled: () => all.getEnabled().filter((c) => !isDayTarget(c.id)), get: (id) => all.get(id) };
  return sortableKeyboardCoordinates(event, { ...args, context: { ...args.context, droppableContainers: activitiesOnly } });
};

const DayButton = ({ day, selected, editing, onSelect }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `${DAY_PREFIX}${day.dayNumber}`, disabled: !editing || selected });
  return (
    <button
      ref={setNodeRef}
      onClick={() => onSelect(day.dayNumber)}
      data-testid={`day-button-${day.dayNumber}`}
      aria-current={selected ? 'true' : undefined}
      className={`w-full text-left p-3.5 rounded-xl transition-all flex items-center justify-between ${
        isOver
          ? 'bg-emerald-50 text-emerald-900 border-2 border-dashed border-emerald-500 scale-[1.02]'
          : selected
            ? 'bg-blue-50/90 text-blue-900 border-2 border-blue-600 shadow-xs'
            : editing
              ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-2 border-dashed border-slate-300'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-extrabold text-xs ${
            selected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
          }`}
        >
          {day.dayNumber}
        </span>
        <div className="min-w-0">
          <p className="font-bold text-xs sm:text-sm">Day {day.dayNumber}</p>
          <p className="text-[11px] text-slate-500 truncate max-w-[170px]">
            {day.date ? `${formatDate(day.date)} • ` : ''}
            {day.title}
          </p>
          {editing && (
            <p className="text-[10px] font-semibold text-slate-500">
              {day.activities.length} {day.activities.length === 1 ? 'activity' : 'activities'} • {formatINR(day.estimatedDailyExpense)}
            </p>
          )}
        </div>
      </div>
      {isOver ? <span className="text-[10px] font-bold text-emerald-700">Drop here</span> : <ChevronRight className={`w-4 h-4 ${selected ? 'text-blue-600' : 'text-slate-400'}`} />}
    </button>
  );
};

const hoursLabel = (hours) => (hours === 1 ? '1 hour' : `${hours} hours`);
const position = (lat, lng) => (Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined);

/**
 * Ideas for "Add an activity" that are not in the plan yet, best first:
 * curated places (offline planner destinations: position, typical fee, time needed, tip), the destination's highlights,
 * then places to eat (the plan's own list, then the catalog). Costs are for the whole group.
 */
const useIdeas = (itinerary, destinationFacts) =>
  useMemo(() => {
    const travelers = itinerary.travelersCount || 1;
    const perGroup = (costForTwo) => (costForTwo > 0 ? Math.round(((costForTwo / 2) * travelers) / 10) * 10 : 0);
    const used = itinerary.days.flatMap((d) => d.activities.map((a) => a.placeName.toLowerCase()));
    const taken = (name, list) => list.some((u) => u.includes(name) || name.includes(u));
    const ideas = [];
    const add = (idea) => {
      const key = idea.placeName?.trim().toLowerCase();
      if (!key || taken(key, used) || taken(key, ideas.map((i) => i.placeName.toLowerCase()))) return;
      ideas.push(idea);
    };
    for (const p of destinationFacts?.places ?? []) {
      add({
        placeName: p.name,
        category: p.category,
        estimatedDuration: p.fullDay ? 'Full day' : hoursLabel(p.hours),
        description: p.description,
        tips: p.tips,
        cost: (p.feePerPerson ?? 0) * travelers,
        coordinates: position(p.lat, p.lng),
      });
    }
    for (const name of destinationFacts?.highlights ?? []) add({ placeName: name, category: 'Attraction' });
    for (const r of itinerary.restaurants ?? []) {
      add({ placeName: r.name, category: 'Restaurant', description: r.cuisine, cost: perGroup(r.costForTwo), coordinates: r.coordinates });
    }
    for (const e of destinationFacts?.eateries ?? []) {
      add({ placeName: e.name, category: 'Restaurant', description: e.cuisine, cost: perGroup(e.costForTwo), coordinates: position(e.lat, e.lng) });
    }
    return ideas;
  }, [itinerary, destinationFacts]);

/**
 * Part 12 — the "Itinerary" tab: days on the left, the open day on the right.
 * Edit mode: drag activities (inside the day, or onto a day on the left), add / edit / remove them, rename days,
 * Undo / Redo (also Ctrl+Z / Ctrl+Y). Every change goes through TripContext.editItinerary (shared applyEdit),
 * so the budget is recalculated at once and changed days get a new road route a moment later.
 */
export const ItineraryBoard = ({
  itinerary,
  preferences,
  selectedDayNumber,
  onSelectDay,
  onShowTab,
  editing,
  onStopEditing,
  destinationFacts,
  timelineProps,
}) => {
  const { editItinerary, undoEdit, redoEdit, canUndo, canRedo, showToast, mapStatus } = useTrip();
  const [dialog, setDialog] = useState(null); // { dayNumber, activity? }
  const [dragging, setDragging] = useState(null); // the activity being dragged
  const [problem, setProblem] = useState(null); // an edit that was refused

  const days = itinerary.days;
  const day = days.find((d) => d.dayNumber === selectedDayNumber) ?? days[0];
  const ideas = useIdeas(itinerary, destinationFacts);
  const nameOf = useCallback((id) => day.activities.find((a) => String(a.id) === String(id))?.placeName ?? 'The activity', [day]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  );

  /** Apply edits; on success a toast with Undo, on failure the reason above the day. */
  const run = useCallback(
    (edits, message) => {
      const result = editItinerary(edits);
      if (!result.ok) {
        setProblem(result.error);
        return result;
      }
      setProblem(null);
      if (result.changed && message) showToast(message, { label: 'Undo', onClick: undoEdit });
      return result;
    },
    [editItinerary, showToast, undoEdit],
  );

  // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y while editing (not while typing in a box or with the dialog open).
  useEffect(() => {
    if (!editing || dialog) return undefined;
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (undoEdit()) setProblem(null);
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        if (redoEdit()) setProblem(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, dialog, undoEdit, redoEdit]);

  useEffect(() => {
    if (!editing) setProblem(null);
  }, [editing]);

  const onDragEnd = ({ active, over }) => {
    setDragging(null);
    if (!over || over.id === active.id) return;
    const activityId = String(active.id);
    const name = nameOf(activityId);
    if (isDayTarget(over.id)) {
      const toDay = Number(String(over.id).slice(DAY_PREFIX.length));
      run({ type: 'move', fromDay: day.dayNumber, activityId, toDay }, `Moved ${name} to Day ${toDay}`);
      return;
    }
    const toIndex = day.activities.findIndex((a) => String(a.id) === String(over.id));
    if (toIndex >= 0) run({ type: 'move', fromDay: day.dayNumber, activityId, toDay: day.dayNumber, toIndex }, `Moved ${name}`);
  };

  // Screen readers hear place names instead of ids.
  const accessibility = useMemo(() => {
    const where = (over) => (isDayTarget(over.id) ? `Day ${String(over.id).slice(DAY_PREFIX.length)}` : `position ${day.activities.findIndex((a) => String(a.id) === String(over.id)) + 1} of ${day.activities.length}`);
    return {
      screenReaderInstructions: {
        draggable:
          'To move an activity, press Space or Enter, use the up and down arrow keys, then press Space or Enter again to drop it, or Escape to cancel. To move it to another day, use its Edit button.',
      },
      announcements: {
        onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
        onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} is over ${where(over)}.` : `${nameOf(active.id)} is not over a place to drop.`),
        onDragEnd: ({ active, over }) => (over ? `${nameOf(active.id)} was dropped at ${where(over)}.` : `${nameOf(active.id)} was put back.`),
        onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
      },
    };
  }, [day, nameOf]);

  const submitDialog = (edits, { targetDay, placeName }) => {
    const adding = !dialog.activity;
    const moved = !adding && targetDay !== dialog.dayNumber;
    const result = run(edits, adding ? `Added ${placeName} to Day ${targetDay}` : moved ? `Moved ${placeName} to Day ${targetDay}` : `Changed ${placeName}`);
    if (result.ok) {
      setDialog(null);
      if (targetDay !== day.dayNumber) onSelectDay(targetDay);
    }
    return result;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={({ active }) => setDragging(day.activities.find((a) => String(a.id) === String(active.id)) ?? null)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
      accessibility={accessibility}
    >
      {editing && (
        <EditToolbar
          itinerary={itinerary}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={() => undoEdit() && setProblem(null)}
          onRedo={() => redoEdit() && setProblem(null)}
          onAdd={() => setDialog({ dayNumber: day.dayNumber })}
          onDone={onStopEditing}
          mapWorking={mapStatus.state === 'working'}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Days (in edit mode: drop an activity on a day to move it there) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-soft space-y-3 no-print lg:sticky lg:top-40">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
            {editing ? 'Days — drop an activity here to move it' : 'Trip Timeline Days'}
          </span>
          <div className="space-y-2">
            {days.map((d) => (
              <DayButton key={d.dayNumber} day={d} selected={d.dayNumber === day.dayNumber} editing={editing} onSelect={onSelectDay} />
            ))}
          </div>
          {!editing && (
            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => onShowTab('map')}
                className="w-1/2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1"
              >
                <Map className="w-3.5 h-3.5" />
                <span>View Map</span>
              </button>
              <button
                onClick={() => onShowTab('hotels')}
                className="w-1/2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1"
              >
                <Bed className="w-3.5 h-3.5" />
                <span>Stays</span>
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 space-y-3">
          {problem && (
            <p className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 no-print" role="alert" data-testid="edit-problem">
              {problem}
            </p>
          )}
          <DayTimeline
            day={day}
            {...timelineProps}
            editing={editing}
            routeUpdating={mapStatus.state === 'working'}
            onEditActivity={(activity) => setDialog({ dayNumber: day.dayNumber, activity })}
            onAddActivity={(dayNumber) => setDialog({ dayNumber })}
            onRemoveActivity={(activity) => run({ type: 'remove', dayNumber: day.dayNumber, activityId: String(activity.id) }, `Removed ${activity.placeName}`)}
            onRenameDay={(title) => run({ type: 'updateDay', dayNumber: day.dayNumber, changes: { title } }, `Renamed Day ${day.dayNumber}`)}
          />
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="px-4 py-3 rounded-xl bg-white shadow-2xl border-2 border-blue-500 text-sm font-bold text-slate-900 flex items-center gap-2 max-w-xs cursor-grabbing">
            <GripVertical className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="truncate">{dragging.placeName}</span>
          </div>
        )}
      </DragOverlay>

      {dialog && (
        <ActivityDialog
          key={`${dialog.dayNumber}:${dialog.activity?.id ?? 'new'}`}
          activity={dialog.activity ?? null}
          dayNumber={dialog.dayNumber}
          days={days}
          travelers={preferences?.travelersCount ?? itinerary.travelersCount ?? 1}
          suggestions={ideas}
          onSubmit={submitDialog}
          onClose={() => setDialog(null)}
        />
      )}
    </DndContext>
  );
};

export default ItineraryBoard;
