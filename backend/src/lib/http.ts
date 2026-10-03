import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { ApiError, badRequest, notFound } from "./errors";
import type { ApiFailure, ApiSuccess } from "@/types/api";

/** Consistent success envelope: { ok: true, data } */
export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true, data }, init);
}

function fail(err: ApiError): NextResponse<ApiFailure> {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    },
    { status: err.status },
  );
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/**
 * Wraps a route handler so every error becomes a consistent JSON response.
 * Unexpected errors are logged server-side and returned as a generic 500 —
 * database messages and stack traces never reach the client.
 */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      const res = await handler(req, ctx);
      res.headers.set("Cache-Control", "no-store");
      return res;
    } catch (err) {
      if (err instanceof ApiError) return fail(err);
      console.error(`[api] ${req.method} ${req.nextUrl.pathname} failed:`, err);
      return fail(new ApiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again."));
    }
  };
}

/** Parses a JSON object body; rejects non-objects (arrays, primitives, malformed JSON). */
export async function readJsonObject(req: NextRequest): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw badRequest("Request body must be a JSON object");
  }
  return body as Record<string, unknown>;
}

/** Converts a path parameter into an ObjectId, answering 404 for malformed ids. */
export function parseObjectId(value: string, what = "Resource"): ObjectId {
  if (!/^[a-f\d]{24}$/i.test(value)) throw notFound(what);
  return new ObjectId(value);
}

export type IdParams = { params: Promise<{ id: string }> };
