import { formatZodError } from '@tripplanner/shared';
import { ApiError } from '../utils/ApiError.js';

/**
 * Like validateBody, for query strings: the clean values are put on req.validQuery
 * (Express 5 does not allow replacing req.query).
 */
export const validateQuery = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.query ?? {});
  if (!result.success) {
    const { message, field, fields } = formatZodError(result.error);
    return next(ApiError.badRequest(message, { field, fields }));
  }
  req.validQuery = result.data;
  return next();
};
