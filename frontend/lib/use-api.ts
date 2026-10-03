'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';

interface ApiData<T> {
  data: T | undefined;
  error: ApiError | undefined;
  /** True until the current path has loaded, and while a reload is in flight. */
  loading: boolean;
  /** Re-fetch the current path; keeps showing the current data meanwhile. */
  reload: () => Promise<void>;
  /** Replace the data locally (e.g. with an API response after a mutation). */
  setData: (data: T) => void;
}

type Result<T> = { path: string | null; data?: T; error?: ApiError };

function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError(0, 'INTERNAL_ERROR', 'Something went wrong.');
}

/**
 * Fetches `/api{path}` on mount and whenever `path` changes; pass null to skip.
 * With `keepPrevious`, the last result stays visible while a new path loads
 * (used by filter tabs); otherwise data is undefined until the new path loads.
 */
export function useApiData<T>(path: string | null, opts: { keepPrevious?: boolean } = {}): ApiData<T> {
  const [result, setResult] = useState<Result<T>>({ path: null });
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (path === null) return;
    let active = true;
    api
      .get<T>(path)
      .then((data) => active && setResult({ path, data }))
      .catch((err) => active && setResult((prev) => ({ path, data: prev.path === path ? prev.data : undefined, error: toApiError(err) })));
    return () => {
      active = false;
    };
  }, [path]);

  const reload = useCallback(async () => {
    if (path === null) return;
    setReloading(true);
    try {
      const data = await api.get<T>(path);
      setResult({ path, data });
    } catch (err) {
      setResult((prev) => ({ ...prev, path, error: toApiError(err) }));
    } finally {
      setReloading(false);
    }
  }, [path]);

  const setData = useCallback((data: T) => setResult({ path, data }), [path]);

  const current = result.path === path;
  return {
    data: current || opts.keepPrevious ? result.data : undefined,
    error: current ? result.error : undefined,
    loading: path !== null && (!current || reloading),
    reload,
    setData,
  };
}
