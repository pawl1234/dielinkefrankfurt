/**
 * Submits FormData to API endpoint with consistent error handling.
 */
export async function submitForm(
  endpoint: string,
  formData: FormData,
  method: 'POST' | 'PUT' = 'POST'
): Promise<Response> {
  console.log(`[SubmitForm] Starting ${method} request to ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method,
      body: formData
    });

    console.log('[SubmitForm] Fetch completed', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SubmitForm] Server returned error response', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 200) // Log first 200 chars
      });

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

    console.log('[SubmitForm] Request successful');
    return response;

  } catch (error) {
    // Log network errors separately from HTTP errors
    if (error instanceof TypeError) {
      // TypeError usually means network error (CORS, network failure, etc.)
      console.error('[SubmitForm] Network error during fetch', {
        error: error.message,
        name: error.name,
        endpoint
      });
    } else {
      console.error('[SubmitForm] Fetch error', {
        error: error instanceof Error ? error.message : String(error),
        endpoint
      });
    }

    throw error;
  }
}