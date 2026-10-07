const { ObjectId } = require("mongodb");
const { ApiError, badRequest, notFound } = require("./errors");

/** Consistent success envelope: { ok: true, data }. Sets the status and disables caching. */
function ok(res, data, status = 200) {
  res.status(status).set("Cache-Control", "no-store").json({ ok: true, data });
}

function sendFailure(res, err) {
  const body = {
    ok: false,
    error: {
      code: err.code,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    },
  };
  res.status(err.status).set("Cache-Control", "no-store").json(body);
}

/**
 * Wraps an async Express handler so a rejected promise reaches the error
 * middleware instead of crashing the process (Express 4 does not do this
 * automatically for async functions).
 */
function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/**
 * Final error-handling middleware (registered after all routes).
 * Known ApiErrors become their JSON envelope; anything else is logged
 * server-side and reported as a generic 500 — no driver messages or stack
 * traces reach the client. Also normalises express.json()'s body-parser
 * errors (malformed JSON) into the same 400 shape.
 */
function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) return sendFailure(res, err);
  if (err && err.type === "entity.parse.failed") {
    return sendFailure(res, badRequest("Request body must be valid JSON"));
  }
  console.error(`[api] ${req.method} ${req.originalUrl} failed:`, err);
  sendFailure(res, new ApiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again."));
}

/** Validates the parsed JSON body is a plain object (rejects arrays, primitives, missing bodies). */
function readJsonObject(req) {
  const body = req.body;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw badRequest("Request body must be a JSON object");
  }
  return body;
}

/** Converts a path parameter into an ObjectId, answering 404 for malformed ids. */
function parseObjectId(value, what = "Resource") {
  if (!/^[a-f\d]{24}$/i.test(value)) throw notFound(what);
  return new ObjectId(value);
}

module.exports = { ok, asyncRoute, errorHandler, readJsonObject, parseObjectId };
