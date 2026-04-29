import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useApi — fetch helper with loading/error/retry and optional polling.
 * @param {() => Promise<any>} fetcher
 * @param {{ intervalMs?: number, deps?: any[], enabled?: boolean }} options
 */
export function useApi(fetcher, options = {}) {
  const { intervalMs = 0, deps = [], enabled = true } = options;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    try {
      setError(null);
      const result = await fetcherRef.current();
      if (mounted.current) setData(result);
    } catch (e) {
      if (mounted.current) setError(e);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) { setLoading(false); return; }
    setLoading(true);
    run();
    if (intervalMs > 0) {
      const id = setInterval(run, intervalMs);
      return () => { mounted.current = false; clearInterval(id); };
    }
    return () => { mounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, ...deps]);

  return { data, error, loading, refetch: run };
}
