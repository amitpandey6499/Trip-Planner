/**
 * Wraps an async route handler so a rejected promise goes to the error handler
 * instead of crashing the request (Express 4 does not do this by itself).
 */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export default asyncHandler;
