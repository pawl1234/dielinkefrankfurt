import { logger } from '@/lib/logger';

/**
 * Submits FormData to API endpoint with consistent error handling.
 */
export async function submitForm(
  endpoint: string,
  formData: FormData,
  method: 'POST' | 'PUT' = 'POST'
): Promise<Response> {
  const response = await fetch(endpoint, {
    method,
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();

    // Log ALL non-200 responses with full context
    logger.error('HTTP error during form submission', {
      module: 'form-submission',
      context: {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        method,
        errorBody: errorText.substring(0, 500) // First 500 chars
      },
      tags: ['form-submission', 'http-error', `status-${response.status}`]
    });

    // Parse JSON error response for other errors
    let errorMessage = 'Übermittlung fehlgeschlagen. Bitte versuchen Sie es erneut.';
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error) {
        errorMessage = errorJson.error;
      }
    } catch {
      // Use default error message if JSON parsing fails
    }

    throw new Error(errorMessage);
  }

  return response;
}