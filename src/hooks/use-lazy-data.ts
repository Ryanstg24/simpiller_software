import { useState, useEffect, useCallback } from 'react';

interface LazyDataOptions {
  delay?: number;
  enabled?: boolean;
}

export function useLazyData<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = [],
  options: LazyDataOptions = {}
) {
  const { delay = 300, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      // Add delay to prevent rapid successive calls
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [fetchFn, delay, enabled]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

// Hook for debounced data fetching
export function useDebouncedData<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = [],
  delay: number = 500
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchFn();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, dependencies);

  return { data, loading, error };
}
