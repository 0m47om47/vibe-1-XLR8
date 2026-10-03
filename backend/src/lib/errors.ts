export type ErrorCode =
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TRIP_CLASH"
  | "INVALID_STATE"
  | "INTERNAL_ERROR";

/**
 * An error that is safe to show to the client. Anything that is not an ApiError
 * is treated as unexpected and reported as a generic 500.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, "BAD_REQUEST", message, details);
export const validationError = (details: Record<string, string>) =>
  new ApiError(400, "VALIDATION_ERROR", "Some fields are invalid", details);
export const unauthenticated = (message = "Please log in to continue") =>
  new ApiError(401, "UNAUTHENTICATED", message);
export const forbidden = (message = "You do not have permission to do this") =>
  new ApiError(403, "FORBIDDEN", message);
export const notFound = (what = "Resource") => new ApiError(404, "NOT_FOUND", `${what} not found`);
export const conflict = (message: string, details?: unknown) =>
  new ApiError(409, "CONFLICT", message, details);
export const invalidState = (message: string, details?: unknown) =>
  new ApiError(409, "INVALID_STATE", message, details);
