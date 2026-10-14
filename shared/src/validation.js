import { PREFERENCE_STEP_SCHEMAS } from './schemas/preferences.js';

/**
 * Turn a ZodError into the shape used everywhere in the app:
 *   { message: 'first error', field: 'totalBudget', fields: { totalBudget: '...', endDate: '...' } }
 * The server sends this as `error` + `details`; the client shows `fields[name]` under each input.
 */
export const formatZodError = (error) => {
  const fields = {};
  for (const issue of error?.issues ?? []) {
    const key = issue.path.join('.') || '_';
    if (!(key in fields)) fields[key] = issue.message;
    // Forms show one message per input, so also key it by the top-level field ("interests.0" → "interests").
    const top = issue.path.length ? String(issue.path[0]) : '_';
    if (!(top in fields)) fields[top] = issue.message;
  }
  const first = error?.issues?.[0];
  return {
    message: first?.message ?? 'Invalid input.',
    field: first && first.path.length ? first.path.join('.') : null,
    fields,
  };
};

/**
 * Validate any schema → { success: true, data } or { success: false, message, field, fields }.
 */
export const validate = (schema, input) => {
  const result = schema.safeParse(input);
  return result.success ? { success: true, data: result.data } : { success: false, ...formatZodError(result.error) };
};

/** Validate one Create Trip wizard step (1, 2 or 3). */
export const validatePreferenceStep = (step, input) => {
  const schema = PREFERENCE_STEP_SCHEMAS[step];
  return schema ? validate(schema, input) : { success: true, data: input };
};
