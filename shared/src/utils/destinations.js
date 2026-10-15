import { OFFLINE_PLANNER_DESTINATIONS } from '../constants.js';

const normalize = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z&()\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Which offline-planner destination a typed place means, or null.
 * "Goa", "Panjim", "Manali, Himachal Pradesh", "Kerala (Munnar & Alleppey)" all match; "Shimla" does not.
 */
export const findOfflinePlannerDestination = (destination) => {
  const wanted = normalize(destination);
  if (!wanted) return null;
  const aliasesOf = (d) => d.aliases.map(normalize);
  return (
    OFFLINE_PLANNER_DESTINATIONS.find((d) => aliasesOf(d).includes(wanted)) ??
    OFFLINE_PLANNER_DESTINATIONS.find((d) => aliasesOf(d).some((alias) => wanted.startsWith(`${alias} `) || wanted.startsWith(`${alias},`))) ??
    null
  );
};

export const OFFLINE_PLANNER_NAMES = Object.freeze(OFFLINE_PLANNER_DESTINATIONS.map((d) => d.name));
