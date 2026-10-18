import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/** Any request that reached here matched no route. */
export const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Cannot find endpoint ${req.method} ${req.originalUrl}`));
};

/**
 * Global error handler. Every error ends up here and leaves as:
 *   { success: false, error: "message", details?: ... }
 */
// Express needs all 4 arguments to treat this function as an error handler.
export const errorHandler = (err, req, res, _next) => {
  let status = Number(err.statusCode ?? err.status) || 500;
  let message = err.message || 'Internal Server Error';

  // Errors thrown by express.json()
  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large.';
  }

  if (status < 400 || status > 599) status = 500;

  // ApiErrors are messages we wrote on purpose (safe to show). Anything else that is a 5xx is a bug.
  const expected = err instanceof ApiError || status < 500;

  if (!expected) {
    const routePath = typeof req.route?.path === 'string' ? req.route.path : '[unmatched route]';
    const code = typeof err.code === 'number' || (typeof err.code === 'string' && /^[A-Z0-9_-]{1,32}$/i.test(err.code)) ? err.code : undefined;
    console.error('[Error] Unexpected request failure', {
      method: req.method,
      route: `${req.baseUrl ?? ''}${routePath}`,
      status,
      error: typeof err.name === 'string' ? err.name : 'Error',
      ...(code !== undefined && { code }),
    });
    // Never leak internal details to users in production.
    if (config.isProd) message = 'Something went wrong on our side. Please try again.';
  } else if (config.isDev) {
    console.warn(`[${status}] ${req.method} ${req.originalUrl} - ${message}`);
  }

  res.status(status).json({
    success: false,
    error: message,
    ...(err.details !== undefined && expected && { details: err.details }),
    ...(config.isDev && !expected && { stack: err.stack }),
  });
};
