/**
 * Creates FormData from typed object for API submission.
 * Handles files, dates, booleans, and standard form fields.
 */
export function createFormData<T extends Record<string, unknown>>(
  data: T,
  files?: File[]
): FormData {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined) return;

    if (value instanceof Date) {
      formData.append(key, value.toISOString());
    } else if (typeof value === 'boolean') {
      formData.append(key, value.toString());
    } else if (typeof value === 'string' || typeof value === 'number') {
      formData.append(key, String(value));
    }
  });

  if (files && files.length > 0) {
    files.forEach(file => formData.append('files', file));
  }

  return formData;
}

/**
 * Creates FormData for edit operations with existing file tracking.
 */
export function createEditFormData<T extends Record<string, unknown>>(
  data: T,
  files?: File[],
  existingFileUrls?: string[]
): FormData {
  const formData = createFormData(data, files);

  if (existingFileUrls && existingFileUrls.length > 0) {
    formData.append('existingFileUrls', JSON.stringify(existingFileUrls));
  }

  return formData;
}