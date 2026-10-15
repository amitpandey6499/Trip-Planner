/**
 * An error that already knows its HTTP status.
 * Throw it anywhere in a route / service; the global error handler turns it into JSON.
 *   throw new ApiError(404, 'Trip not found');
 *   throw ApiError.badRequest('Destination is required', { field: 'destination' });
 */
export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    if (details !== undefined) this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Please log in to continue.') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You are not allowed to do this.') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not found.') {
    return new ApiError(404, message);
  }

  static conflict(message, details) {
    return new ApiError(409, message, details);
  }
}

export default ApiError;
