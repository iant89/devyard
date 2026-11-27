import { useCallback, useEffect, useState } from 'react';

export type Resource<T> =
  | { state: 'loading'; data?: T; error?: undefined }
  | { state: 'ready'; data: T; error?: undefined }
  | { state: 'error'; data?: T; error: Error };

interface Settled<T> {
  token: string;
  data?: T;
  error?: Error;
}

/**
 * Loads `load()` whenever `key` changes (put every input of `load` in it) and exposes `reload()`.
 * Responses for an older key are dropped; the previous data stays visible while the next load runs.
 */
export function useResource<T>(
  load: () => Promise<T>,
  key: string,
): Resource<T> & { reload: () => void } {
  const [tick, setTick] = useState(0);
  // A settled result only counts if it carries the current token.
  const token = `${tick}:${key}`;
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setSettled({ token, data }),
      (error: unknown) =>
        live &&
        setSettled((prev) => ({
          token,
          data: prev?.data,
          error: error instanceof Error ? error : new Error(String(error)),
        })),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  if (!settled || settled.token !== token) return { state: 'loading', data: settled?.data, reload };
  if (settled.error) return { state: 'error', data: settled.data, error: settled.error, reload };
  return { state: 'ready', data: settled.data as T, reload };
}
