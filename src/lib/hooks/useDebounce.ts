import { useState, useEffect } from 'react';

/**
 * A hook that delays updating a value until a specific time has passed
 * Useful for reducing unnecessary renders or API calls
 * 
 * @param value The value to debounce
 * @param delay The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear the timeout if value changes or component unmounts
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * A hook that returns a debounced function that will only execute
 * after waiting for a specific time to pass since the last invocation
 * 
 * @param fn The function to debounce
 * @param delay The delay in milliseconds (default: 300ms)
 * @returns The debounced function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear timeout on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (...args: Parameters<T>) => {
    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    const id = setTimeout(() => {
      fn(...args);
      setTimeoutId(null);
    }, delay);

    setTimeoutId(id);
  };
}

/**
 * A hook that returns a throttled function that will execute at most once
 * in the specified time period, always running the latest invocation
 * 
 * @param fn The function to throttle
 * @param delay The delay in milliseconds (default: 300ms)
 * @returns The throttled function
 */
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => void {
  const [lastExec, setLastExec] = useState(0);

  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastExec >= delay) {
      fn(...args);
      setLastExec(now);
    }
  };
}