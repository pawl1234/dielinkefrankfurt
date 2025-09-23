/**
 * Centralized validation messages for consistent error handling across the application.
 * Uses German field labels and messages for a unified user experience.
 */

/**
 * Field labels mapping - matching the ones in useValidationErrors hook
 * This ensures consistency between client and server validation messages
 */
export const fieldLabels: Record<string, string> = {
  // Group form fields
  'name': 'Gruppenname',
  'description': 'Beschreibung',
  'responsiblePersons': 'Verantwortliche Personen',
  'logo': 'Logo',
  'firstName': 'Vorname',
  'lastName': 'Nachname',
  'email': 'E-Mail-Adresse',

  // Appointment form fields
  'title': 'Titel',
  'teaser': 'Kurzbeschreibung',
  'mainText': 'Beschreibung',
  'startDateTime': 'Startdatum',
  'endDateTime': 'Enddatum',
  'street': 'Straße',
  'city': 'Ort',
  'state': 'Bundesland',
  'postalCode': 'Postleitzahl',
  'recurringText': 'Wiederholungsbeschreibung',
  'coverImage': 'Cover-Bild',

  // Status report form fields
  'groupId': 'Gruppe',
  'content': 'Inhalt',
  'reporterFirstName': 'Vorname des Erstellers',
  'reporterLastName': 'Nachname des Erstellers',

  // Antrag fields
  'summary': 'Zusammenfassung',
  'purposes': 'Verwendungszweck',

  // Common fields
  'files': 'Datei-Anhänge'
};

/**
 * Validation message templates for common validation patterns
 */
export const validationMessages = {
  /**
   * Field is required
   */
  required: (field: string): string => {
    const label = fieldLabels[field] || field;
    return `${label} ist erforderlich`;
  },

  /**
   * Field must have minimum length
   */
  minLength: (field: string, min: number): string => {
    const label = fieldLabels[field] || field;
    return `${label} muss mindestens ${min} Zeichen lang sein`;
  },

  /**
   * Field must not exceed maximum length
   */
  maxLength: (field: string, max: number): string => {
    const label = fieldLabels[field] || field;
    return `${label} darf maximal ${max} Zeichen lang sein`;
  },

  /**
   * Field must be between min and max length
   */
  between: (field: string, min: number, max: number): string => {
    const label = fieldLabels[field] || field;
    return `${label} muss zwischen ${min} und ${max} Zeichen lang sein`;
  },

  /**
   * Field must be a valid email
   */
  email: (field: string): string => {
    const label = fieldLabels[field] || field;
    return `${label} muss eine gültige E-Mail-Adresse sein`;
  },

  /**
   * At least one item required in array field
   */
  atLeastOne: (field: string): string => {
    const label = fieldLabels[field] || field;
    return `Mindestens ein Eintrag für ${label} ist erforderlich`;
  },

  /**
   * Invalid format
   */
  invalidFormat: (field: string): string => {
    const label = fieldLabels[field] || field;
    return `${label} hat ein ungültiges Format`;
  },

  /**
   * File size exceeds limit
   */
  fileSizeExceeds: (field: string, maxSizeMB: number): string => {
    const label = fieldLabels[field] || field;
    return `${label}: Dateigröße überschreitet das Limit von ${maxSizeMB}MB`;
  },

  /**
   * Unsupported file type
   */
  unsupportedFileType: (field: string): string => {
    const label = fieldLabels[field] || field;
    return `${label}: Nicht unterstützter Dateityp`;
  },

  /**
   * Too many files
   */
  tooManyFiles: (field: string, max: number): string => {
    const label = fieldLabels[field] || field;
    return `${label}: Maximal ${max} Dateien erlaubt`;
  }
};

/**
 * Specific validation messages for responsible persons
 */
export const responsiblePersonMessages = {
  firstNameRequired: 'Vorname ist erforderlich für alle verantwortlichen Personen',
  firstNameLength: 'Vorname muss zwischen 2 und 50 Zeichen lang sein für alle verantwortlichen Personen',
  lastNameRequired: 'Nachname ist erforderlich für alle verantwortlichen Personen',
  lastNameLength: 'Nachname muss zwischen 2 und 50 Zeichen lang sein für alle verantwortlichen Personen',
  emailRequired: 'E-Mail-Adresse ist erforderlich für alle verantwortlichen Personen',
  emailInvalid: 'Gültige E-Mail-Adresse ist erforderlich für alle verantwortlichen Personen'
};

/**
 * Get a localized field label
 */
export function getFieldLabel(field: string): string {
  return fieldLabels[field] || field;
}

/**
 * Helper to create a field-specific error message
 */
export function createFieldError(field: string, message: string): Record<string, string> {
  return { [field]: message };
}

/**
 * Helper to validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}