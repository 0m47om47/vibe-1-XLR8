/**
 * Typed client for the backend. Requests go to same-origin `/api/*`, which
 * next.config.ts rewrites to the backend server — so the HTTP-only session
 * cookie is first-party and never handled by JavaScript.
 *
 * All business rules (clash detection, boarding, completion) are enforced by
 * the backend; the UI only reflects what it returns.
 */

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TRIP_CLASH'
  | 'INVALID_STATE'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field → message map for VALIDATION_ERROR responses. */
  get fieldErrors(): Record<string, string> {
    return this.code === 'VALIDATION_ERROR' && this.details && typeof this.details === 'object'
      ? (this.details as Record<string, string>)
      : {};
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection.');
  }

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // non-JSON (e.g. backend down behind the proxy)
  }

  const envelope = payload as
    | { ok: true; data: T }
    | { ok: false; error: { code: ApiErrorCode; message: string; details?: unknown } }
    | null;

  if (envelope && envelope.ok === true) return envelope.data;
  if (envelope && envelope.ok === false) {
    throw new ApiError(res.status, envelope.error.code, envelope.error.message, envelope.error.details);
  }
  throw new ApiError(
    res.status || 502,
    'INTERNAL_ERROR',
    res.status === 502 || res.status === 500 ? 'The Toto server is not responding. Is the backend running?' : 'Unexpected response from server.',
  );
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
};

/** Human-readable message for any thrown value. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const fields = Object.values(err.fieldErrors);
    return fields.length > 0 ? fields[0] : err.message;
  }
  return 'Something went wrong. Please try again.';
}
