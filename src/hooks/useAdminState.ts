import { useState, useEffect } from 'react';

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

  const setItems = (items: T[]) => setState(prev => ({ ...prev, items }));
  const setLoading = (loading: boolean) => setState(prev => ({ ...prev, loading }));
  const setError = (error: string | null) => setState(prev => ({ ...prev, error }));
  const setPage = (page: number) => setState(prev => ({ ...prev, page }));
  const setPageSize = (pageSize: number) => setState(prev => ({ ...prev, pageSize, page: 1 }));
  const setTabValue = (tabValue: number) => setState(prev => ({ ...prev, tabValue, page: 1 }));
  const setSearchTerm = (searchTerm: string) => setState(prev => ({ ...prev, searchTerm }));
  const refreshTimestamp = () => setState(prev => ({ ...prev, timestamp: Date.now() }));
  
  const setPaginationData = (data: { totalItems?: number, totalPages?: number }) => {
    setState(prev => ({
      ...prev,
      totalItems: data.totalItems || prev.totalItems,
      totalPages: data.totalPages || prev.totalPages
    }));
  };
  
  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setState(prev => ({
      ...prev,
      notification: {
        open: true,
        message,
        severity
      }
    }));
  };
  
  const closeNotification = () => {
    setState(prev => ({
      ...prev,
      notification: {
        ...prev.notification,
        open: false
      }
    }));
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    if (state.page !== 1) {
      setPage(1);
    }
  }, [state.searchTerm, state.tabValue]);

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