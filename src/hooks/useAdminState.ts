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

  console.log('🔧 useAdminState hook re-rendered, current state:', {
    page: state.page,
    pageSize: state.pageSize,
    tabValue: state.tabValue,
    searchTerm: state.searchTerm,
    timestamp: state.timestamp,
    loading: state.loading,
    itemsCount: state.items.length
  });

  const setItems = useCallback((items: T[]) => {
    console.log('🔄 setItems called with', items.length, 'items');
    setState(prev => ({ ...prev, items }));
  }, []);
  
  const setLoading = useCallback((loading: boolean) => {
    console.log('🔄 setLoading called with', loading);
    setState(prev => ({ ...prev, loading }));
  }, []);
  
  const setError = useCallback((error: string | null) => {
    console.log('🔄 setError called with', error);
    setState(prev => ({ ...prev, error }));
  }, []);
  
  const setPage = useCallback((page: number) => {
    console.log('🔄 setPage called with', page);
    setState(prev => ({ ...prev, page }));
  }, []);
  
  const setPageSize = useCallback((pageSize: number) => {
    console.log('🔄 setPageSize called with', pageSize);
    setState(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);
  
  const setTabValue = useCallback((tabValue: number) => {
    console.log('🔄 setTabValue called with', tabValue);
    setState(prev => ({ ...prev, tabValue, page: 1 }));
  }, []);
  
  const setSearchTerm = useCallback((searchTerm: string) => {
    console.log('🔄 setSearchTerm called with', searchTerm);
    setState(prev => ({ ...prev, searchTerm }));
  }, []);
  
  const refreshTimestamp = useCallback(() => {
    console.log('🔄 refreshTimestamp called');
    setState(prev => ({ ...prev, timestamp: Date.now() }));
  }, []);
  
  const setPaginationData = useCallback((data: { totalItems?: number, totalPages?: number }) => {
    console.log('🔄 setPaginationData called with', data);
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