import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Cache with expiration time (5 minutes by default)
const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Custom hook for data fetching with built-in caching
 * 
 * @param url The URL to fetch data from
 * @param options Fetch options
 * @param cacheTime Cache expiration time in milliseconds (default: 5 minutes)
 * @param dependencies Array of dependencies that trigger a re-fetch when changed
 * @returns Object containing the fetched data, loading state, and error
 */
export function useDataFetch<T>(
  url: string,
  options?: RequestInit,
  cacheTime = DEFAULT_CACHE_TIME,
  dependencies: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Extract query parameters from URL for cache key
  const cacheKey = url;

  // Function to fetch data
  const fetchData = useCallback(async (ignoreCache = false) => {
    setLoading(true);
    
    try {
      // Check if we have a valid cached response
      const now = Date.now();
      const cachedResponse = cache.get(cacheKey);
      
      if (!ignoreCache && cachedResponse && now - cachedResponse.timestamp < cacheTime) {
        setData(cachedResponse.data as T);
        setLoading(false);
        return;
      }
      
      // Fetch fresh data
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const json = await response.json();
      
      // Save in cache
      cache.set(cacheKey, {
        data: json,
        timestamp: now
      });
      
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, cacheKey, cacheTime, options, ...dependencies]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Function to manually refetch data and bypass cache
  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Clears the entire cache or a specific entry
 * @param cacheKey Optional specific cache key to clear
 */
export function clearCache(cacheKey?: string) {
  if (cacheKey) {
    cache.delete(cacheKey);
  } else {
    cache.clear();
  }
}