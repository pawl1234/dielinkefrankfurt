import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    expect(result.current).toBe('initial');

    // Change the value
    rerender({ value: 'updated', delay: 500 });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast-forward time by 300ms
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('initial');

    // Fast-forward time by another 200ms (total 500ms)
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('updated');
  });

  it('should cancel previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    // Make rapid changes
    rerender({ value: 'first', delay: 500 });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    
    rerender({ value: 'second', delay: 500 });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    
    rerender({ value: 'third', delay: 500 });
    
    // Value should still be initial
    expect(result.current).toBe('initial');

    // Fast-forward remaining time
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Should have the last value
    expect(result.current).toBe('third');
  });

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 1000 },
      }
    );

    rerender({ value: 'updated', delay: 1000 });

    act(() => {
      jest.advanceTimersByTime(999);
    });
    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });

  it('should handle number values', () => {
    const { result, rerender } = renderHook(() => useDebounce(42, 500));
    
    expect(result.current).toBe(42);
    
    rerender();
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(result.current).toBe(42);
  });

  it('should handle object values', () => {
    const obj = { foo: 'bar' };
    const { result, rerender } = renderHook(() => useDebounce(obj, 500));
    
    expect(result.current).toBe(obj);
    
    const newObj = { foo: 'baz' };
    rerender();
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(result.current).toBe(obj);
  });
});