/**
 * Part 9 — while Gemini is still writing its JSON answer, find each day of `"days": [ … ]`
 * as soon as its closing brace arrives, so the app can show "Day 2 of 4 ready".
 *
 * A tiny character scanner: it understands strings (and escapes inside them) and nesting depth,
 * which is all that is needed to cut complete day objects out of an unfinished JSON text.
 * The finished answer is still parsed and validated as a whole afterwards — the days found here
 * are only a preview.
 */
export const createDayExtractor = (onDay) => {
  let pos = 0; // next character to read
  let depth = 0;
  let inString = false;
  let escaped = false;
  let stringStart = -1;
  let lastTopLevelString = null; // the last string seen directly inside the top-level object (= a key)
  let daysDepth = -1; // depth inside the "days" array
  let dayStart = -1;
  let found = 0;

  return (text) => {
    for (; pos < text.length; pos += 1) {
      const ch = text[pos];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') {
          inString = false;
          if (depth === 1) lastTopLevelString = text.slice(stringStart + 1, pos);
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
        stringStart = pos;
      } else if (ch === '{' || ch === '[') {
        if (ch === '[' && depth === 1 && lastTopLevelString === 'days' && daysDepth === -1) daysDepth = depth + 1;
        if (ch === '{' && depth === daysDepth) dayStart = pos;
        depth += 1;
      } else if (ch === '}' || ch === ']') {
        depth -= 1;
        if (ch === '}' && depth === daysDepth && dayStart !== -1) {
          const raw = text.slice(dayStart, pos + 1);
          dayStart = -1;
          try {
            onDay(JSON.parse(raw), found);
            found += 1;
          } catch {
            // not valid JSON on its own: skip the preview, the full answer decides
          }
        }
        if (ch === ']' && depth === daysDepth - 1) daysDepth = -2; // the days array is finished
      }
    }
    return found;
  };
};
