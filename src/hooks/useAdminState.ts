import { useState, useEffect, useCallback } from 'react';

export interface AdminState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  searchTerm: string;
  tabValue: number;
  timestamp: number; // For cache busting
  notification: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  };
}

export const useAdminState = <T>() => {
  const [state, setState] = useState<AdminState<T>>({
    items: [],
    loading: true,
    error: null,
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
    searchTerm: '',
    tabValue: 0,
    timestamp: Date.now(),
    notification: {
      open: false,
      message: '',
      severity: 'info'
    }
  });

  const setItems = useCallback((items: T[]) => {
    setState(prev => ({ ...prev, items }));
  }, []);
  
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);
  
  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);
  
  const setPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, page }));
  }, []);
  
  const setPageSize = useCallback((pageSize: number) => {
    setState(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);
  
  const setTabValue = useCallback((tabValue: number) => {
    setState(prev => ({ ...prev, tabValue, page: 1 }));
  }, []);
  
  const setSearchTerm = useCallback((searchTerm: string) => {
    setState(prev => ({ ...prev, searchTerm }));
  }, []);
  
  const refreshTimestamp = useCallback(() => {
    setState(prev => ({ ...prev, timestamp: Date.now() }));
  }, []);
  
  const setPaginationData = useCallback((data: { totalItems?: number, totalPages?: number }) => {
    setState(prev => ({
      ...prev,
      totalItems: data.totalItems || prev.totalItems,
      totalPages: data.totalPages || prev.totalPages
    }));
  }, []);
  
  const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setState(prev => ({
      ...prev,
      notification: {
        open: true,
        message,
        severity
      }
    }));
  }, []);
  
  const closeNotification = useCallback(() => {
    setState(prev => ({
      ...prev,
      notification: {
        ...prev.notification,
        open: false
      }
    }));
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [state.searchTerm, state.tabValue, setPage]);

  return {
    ...state,
    setItems,
    setLoading,
    setError,
    setPage,
    setPageSize,
    setTabValue,
    setSearchTerm,
    refreshTimestamp,
    setPaginationData,
    showNotification,
    closeNotification
  };
};