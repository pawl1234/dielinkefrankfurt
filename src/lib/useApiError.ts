'use client';

import { useState, useCallback } from 'react';

export type ApiErrorDetails = {
  type?: string;
  fieldErrors?: Record<string, string>;
  context?: Record<string, any>;
};

export type ApiError = {
  message: string;
  details: ApiErrorDetails;
};

/**
 * Custom hook for handling API errors in a consistent way across the application
 */
export function useApiError() {
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle API response and extract error information if present
   */
  const handleApiResponse = useCallback(async (response: Response) => {
    if (!response.ok) {
      try {
        const errorData = await response.json();
        const apiError: ApiError = {
          message: errorData.error || 'Ein unbekannter Fehler ist aufgetreten',
          details: {
            type: errorData.type,
            fieldErrors: errorData.fieldErrors,
            context: errorData.context
          }
        };
        setError(apiError);
        return null;
      } catch (err) {
        // If we can't parse the error response
        setError({
          message: `${response.status} ${response.statusText || 'Fehler'}`,
          details: {}
        });
        return null;
      }
    }

    try {
      return await response.json();
    } catch (err) {
      // This is not necessarily an error; some responses don't have JSON bodies
      return {};
    }
  }, []);

  /**
   * Execute an API call with error handling
   */
  const executeApiCall = useCallback(async <T>(
    apiCall: () => Promise<Response>
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiCall();
      const result = await handleApiResponse(response);
      return result as T;
    } catch (err) {
      // Handle network errors or other exceptions
      setError({
        message: err instanceof Error ? err.message : 'Ein Netzwerkfehler ist aufgetreten',
        details: {}
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleApiResponse]);

  /**
   * Clear any existing error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Extract field-specific errors for form validation
   */
  const getFieldError = useCallback((fieldName: string): string | undefined => {
    if (error?.details?.fieldErrors && error.details.fieldErrors[fieldName]) {
      return error.details.fieldErrors[fieldName];
    }
    return undefined;
  }, [error]);

  return {
    error,
    isLoading,
    executeApiCall,
    clearError,
    getFieldError,
    setError
  };
}

/**
 * Utility function to handle common fetch errors outside of the hook
 */
export async function handleFetchError(response: Response): Promise<any> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: `${response.status} ${response.statusText}`
    }));
    
    throw {
      message: errorData.error || 'Ein unbekannter Fehler ist aufgetreten',
      status: response.status,
      details: {
        type: errorData.type,
        fieldErrors: errorData.fieldErrors,
        context: errorData.context
      }
    };
  }
  
  return response.json().catch(() => ({}));
}