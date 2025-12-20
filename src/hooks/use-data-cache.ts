import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface UseDataCacheOptions<T> {
  cacheKey: string;
  fetchFn: () => Promise<T>;
  staleTime?: number; // Time in ms before data is considered stale (default: 5 minutes)
  cacheTime?: number; // Time in ms before cache expires (default: 30 minutes)
  enabled?: boolean;
}

export function useDataCache<T>({
  cacheKey,
  fetchFn,
  staleTime = 5 * 60 * 1000, // 5 minutes
  cacheTime = 30 * 60 * 1000, // 30 minutes
  enabled = true
}: UseDataCacheOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());

  const getCachedData = useCallback((key: string): T | null => {
    const entry = cacheRef.current.get(key);
    if (!entry) return null;

    const now = Date.now();
    
    // Check if cache has expired
    if (now > entry.expiresAt) {
      cacheRef.current.delete(key);
      return null;
    }

    return entry.data;
  }, []);

  const setCachedData = useCallback((key: string, data: T) => {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + cacheTime
    };
    cacheRef.current.set(key, entry);
  }, [cacheTime]);

  const isStale = useCallback((key: string): boolean => {
    const entry = cacheRef.current.get(key);
    if (!entry) return true;
    
    const now = Date.now();
    return (now - entry.timestamp) > staleTime;
  }, [staleTime]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    // Check cache first
    const cachedData = getCachedData(cacheKey);
    const shouldUseCache = cachedData && !forceRefresh && !isStale(cacheKey);

    if (shouldUseCache) {
      setData(cachedData);
      setLoading(false);
      setError(null);
      return cachedData;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await fetchFn();
      setData(result);
      setCachedData(cacheKey, result);
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      // If we have stale data, use it while showing error
      if (cachedData) {
        setData(cachedData);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [enabled, cacheKey, fetchFn, getCachedData, setCachedData, isStale]);

  const invalidateCache = useCallback(() => {
    cacheRef.current.delete(cacheKey);
  }, [cacheKey]);

  const clearAllCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(true),
    invalidateCache,
    clearAllCache
  };
}

// Global cache manager for cross-component cache invalidation
class CacheManager {
  private static instance: CacheManager;
  private listeners: Map<string, Set<() => void>> = new Map();

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  subscribe(key: string, callback: () => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  invalidate(key: string) {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => callback());
    }
  }

  invalidatePattern(pattern: string) {
    const regex = new RegExp(pattern);
    for (const key of this.listeners.keys()) {
      if (regex.test(key)) {
        this.invalidate(key);
      }
    }
  }
}

export const cacheManager = CacheManager.getInstance();
