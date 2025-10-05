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