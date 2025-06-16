import { useState, useCallback, useEffect } from 'react';
import { useDataFetch } from './useDataFetch';

// Generic interface for paginated responses
interface PaginatedResponse<T> {
  items?: T[];
  [key: string]: unknown; // Allow additional fields like groups, statusReports, etc.
  totalItems?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  success?: boolean;
  error?: string;
}

/**
 * Custom hook for working with paginated data
 * 
 * @param baseUrl The base URL for the API endpoint
 * @param initialPage Initial page number
 * @param initialPageSize Initial page size
 * @param additionalParams Additional URL params to include in requests
 * @param dataExtractor Function to extract items array from response (defaults to response.items)
 * @returns Object containing paginated data, loading state, pagination controls, etc.
 */
export function usePaginatedData<T>(
  baseUrl: string,
  initialPage = 1,
  initialPageSize = 10,
  additionalParams: Record<string, string> = {},
  dataExtractor: (response: Record<string, unknown>) => T[] = (response) => {
    const items = response.items || response.groups || response.statusReports;
    return Array.isArray(items) ? items as T[] : [];
  }
) {
  // Pagination state
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Build URL with query parameters
  const buildUrl = useCallback(() => {
    const url = new URL(baseUrl, window.location.origin);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('pageSize', pageSize.toString());
    
    // Add additional params
    Object.entries(additionalParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    
    // Add cache buster
    url.searchParams.append('t', Date.now().toString());
    
    return url.toString();
  }, [baseUrl, page, pageSize, additionalParams]);
  
  // Get data with the useDataFetch hook
  const { 
    data: responseData, 
    loading, 
    error,
    refetch 
  } = useDataFetch<PaginatedResponse<T>>(
    buildUrl(),
    undefined,
    60 * 1000, // 1 minute cache
    [page, pageSize, ...Object.values(additionalParams)]
  );
  
  // Extract data and pagination info
  const [items, setItems] = useState<T[]>([]);
  
  useEffect(() => {
    if (responseData) {
      // Extract items using the provided extractor function
      const extractedItems = dataExtractor(responseData);
      setItems(extractedItems);
      
      // Set pagination data
      setTotalItems(responseData.totalItems || 0);
      setTotalPages(responseData.totalPages || 1);
      
      // If current page is higher than total pages, adjust it
      if (responseData.totalPages && page > responseData.totalPages) {
        setPage(responseData.totalPages);
      }
    }
  }, [responseData, dataExtractor, page]);
  
  // Pagination controls
  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  }, [totalPages]);
  
  const goToNextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
    }
  }, [page, totalPages]);
  
  const goToPreviousPage = useCallback(() => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  }, [page]);
  
  const changePageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  }, []);
  
  return {
    items,
    loading,
    error,
    page,
    pageSize,
    totalItems,
    totalPages,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    changePageSize,
    refetch
  };
}