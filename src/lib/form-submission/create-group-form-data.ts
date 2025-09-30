/**
 * Creates FormData for group submission with logo file and responsible persons
 */
export function createGroupFormData<T extends Record<string, unknown>>(
  data: T,
  logo?: File | Blob | null
): FormData {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined) return;

    if (key === 'responsiblePersons' && Array.isArray(value)) {
      formData.append('responsiblePersonsCount', value.length.toString());
      value.forEach((person: any, index: number) => {
        if (person.firstName) {
          formData.append(`responsiblePerson[${index}].firstName`, person.firstName);
        }
        if (person.lastName) {
          formData.append(`responsiblePerson[${index}].lastName`, person.lastName);
        }
        if (person.email) {
          formData.append(`responsiblePerson[${index}].email`, person.email);
        }
      });
    } else if (key === 'logo') {
      return;
    } else if (value instanceof Date) {
      formData.append(key, value.toISOString());
    } else if (typeof value === 'boolean') {
      formData.append(key, value.toString());
    } else if (typeof value === 'string' || typeof value === 'number') {
      formData.append(key, String(value));
    }
  });

  if (logo) {
    formData.append('logo', logo);
  }

  return formData;
}