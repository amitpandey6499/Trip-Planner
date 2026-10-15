import { formatDate, formatINR } from '@tripplanner/shared';

/** Plain-text version of an itinerary (clipboard, WhatsApp). */
export const itineraryAsText = (it, url = null) =>
  [
    `${it.title}`,
    `${it.durationDays} days • ${it.travelersCount} travelers • Est. ${formatINR(it.estimatedTotal)}`,
    ...(url ? [url] : []),
    '',
    ...it.days.flatMap((day) => [
      `Day ${day.dayNumber}${day.date ? ` (${formatDate(day.date)})` : ''}: ${day.title}`,
      ...day.activities.map((a) => `  - ${a.timeSlot ? `${a.timeSlot} ` : ''}${a.placeName}${a.cost ? ` (${formatINR(a.cost)})` : ''}`),
      '',
    ]),
  ].join('\n');
