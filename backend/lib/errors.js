/**
 * An error that is safe to show to the client. Anything that is not an ApiError
 * is treated as unexpected and reported as a generic 500.
 *
 * Valid codes: VALIDATION_ERROR, BAD_REQUEST, UNAUTHENTICATED, FORBIDDEN,
 * NOT_FOUND, CONFLICT, TRIP_CLASH, INVALID_STATE, INTERNAL_ERROR.
 */
class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (message, details) => new ApiError(400, "BAD_REQUEST", message, details);
const validationError = (details) => new ApiError(400, "VALIDATION_ERROR", "Some fields are invalid", details);
const unauthenticated = (message = "Please log in to continue") => new ApiError(401, "UNAUTHENTICATED", message);
const forbidden = (message = "You do not have permission to do this") => new ApiError(403, "FORBIDDEN", message);
const notFound = (what = "Resource") => new ApiError(404, "NOT_FOUND", `${what} not found`);
const conflict = (message, details) => new ApiError(409, "CONFLICT", message, details);
const invalidState = (message, details) => new ApiError(409, "INVALID_STATE", message, details);

module.exports = { ApiError, badRequest, validationError, unauthenticated, forbidden, notFound, conflict, invalidState };
