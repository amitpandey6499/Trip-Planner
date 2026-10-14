import { formatZodError } from '@tripplanner/shared';
import { ApiError } from '../utils/ApiError.js';

/**
 * Validate req.body with a shared Zod schema (same schema the client uses).
 * On success req.body is replaced by the clean, typed data (defaults filled in, unknown fields removed).
 * On failure → 400 { error: 'first message', details: { field, fields } }.
 */
export const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const { message, field, fields } = formatZodError(result.error);
    return next(ApiError.badRequest(message, { field, fields }));
  }
  req.body = result.data;
  return next();
};
