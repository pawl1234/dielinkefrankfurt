/**
 * Centralized validation messages for consistent error handling across the application.
 * Uses German field labels and messages for a unified user experience.
 */

/**
 * Comprehensive field labels mapping for all validation scenarios.
 * Consolidated from validation-messages.ts and localization.ts.
 * This ensures consistency between client and server validation messages.
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
  'mainText': 'Haupttext',
  'startDateTime': 'Startdatum und -zeit',
  'endDateTime': 'Enddatum und -zeit',
  'street': 'Straße',
  'city': 'Ort',
  'state': 'Bundesland',
  'postalCode': 'Postleitzahl',
  'recurringText': 'Wiederholungsbeschreibung',
  'coverImage': 'Cover-Bild',

  // Status report form fields
  'groupId': 'Gruppe',
  'content': 'Inhalt',
  'reporterFirstName': 'Vorname des Berichterstatters',
  'reporterLastName': 'Nachname des Berichterstatters',

  // Antrag fields and nested purposes
  'summary': 'Zusammenfassung',
  'purposes': 'Verwendungszweck',
  'purposes.zuschuss': 'Finanzieller Zuschuss',
  'purposes.zuschuss.enabled': 'Finanzieller Zuschuss aktiviert',
  'purposes.zuschuss.amount': 'Betrag für Zuschuss',
  'purposes.personelleUnterstuetzung': 'Personelle Unterstützung',
  'purposes.personelleUnterstuetzung.enabled': 'Personelle Unterstützung aktiviert',
  'purposes.personelleUnterstuetzung.details': 'Details zur personellen Unterstützung',
  'purposes.raumbuchung': 'Raumbuchung',
  'purposes.raumbuchung.enabled': 'Raumbuchung aktiviert',
  'purposes.raumbuchung.location': 'Ort für Raumbuchung',
  'purposes.raumbuchung.numberOfPeople': 'Anzahl der Personen',
  'purposes.raumbuchung.details': 'Details zur Raumbuchung',
  'purposes.weiteres': 'Weitere Anliegen',
  'purposes.weiteres.enabled': 'Weitere Anliegen aktiviert',
  'purposes.weiteres.details': 'Details zu weiteren Anliegen',

  // Responsible persons array (nested paths)
  'responsiblePersons.firstName': 'Vorname (Verantwortliche Person)',
  'responsiblePersons.lastName': 'Nachname (Verantwortliche Person)',
  'responsiblePersons.email': 'E-Mail-Adresse (Verantwortliche Person)',

  // File handling
  'files': 'Dateianhänge',
  'fileUrls': 'Datei-URLs',

  // Common validation fields
  'general': 'Allgemein',
  'amount': 'Betrag',
  'numberOfPeople': 'Anzahl der Personen',
  'location': 'Ort',
  'details': 'Details',

  // Business logic resources
  'group': 'Gruppe',
  'statusReport': 'Statusbericht',
  'status': 'Status',
  'file': 'Datei'
};

/**
 * Comprehensive validation message templates for all validation patterns.
 * Consolidated from all validation files to provide single source of truth.
 */
export const validationMessages = {
  // Basic field validation
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
   * Field must be a valid email address
   */
  email: (field: string): string => {
    const label = fieldLabels[field] || field;
    return `${label} muss eine gültige E-Mail-Adresse sein`;
  },

  /**
   * Email format validation (alternative message)
   */
  emailFormat: (_field: string): string => {
    return 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
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

  // Character pattern validation
  /**
   * Invalid characters - only German characters allowed
   */
  invalidCharacters: (field: string): string => {
    const label = fieldLabels[field] || field;
    return `${label} enthält ungültige Zeichen`;
  },

  /**
   * German character pattern message
   */
  germanCharacterPattern: (): string => {
    return 'Nur deutsche Zeichen, Leerzeichen, Bindestriche und Apostrophe sind erlaubt';
  },

  // Number validation
  /**
   * Must be a valid number
   */
  mustBeNumber: (field: string): string => {
    const label = fieldLabels[field] || field;
    return `${label} muss eine gültige Zahl sein`;
  },

  /**
   * Must be a whole number
   */
  mustBeInteger: (_field: string): string => {
    return 'Muss eine ganze Zahl sein';
  },

  /**
   * Must be at least minimum value
   */
  minValue: (field: string, min: number): string => {
    const label = fieldLabels[field] || field;
    return `${label} muss mindestens ${min} betragen`;
  },

  /**
   * Must not exceed maximum value
   */
  maxValue: (field: string, max: number): string => {
    const label = fieldLabels[field] || field;
    return `${label} darf maximal ${max} betragen`;
  },

  // Date/time validation
  /**
   * Invalid date or time format
   */
  invalidDateTime: (_field: string): string => {
    return 'Ungültiges Datum oder Uhrzeit-Format';
  },

  // File validation
  /**
   * File size exceeds limit
   */
  fileSizeExceeds: (field: string, maxSizeMB: number): string => {
    const label = fieldLabels[field] || field;
    return `${label}: Dateigröße überschreitet das Limit von ${maxSizeMB}MB`;
  },

  /**
   * File size exceeds limit (short version)
   */
  fileSizeExceedsShort: (_field: string): string => {
    return 'überschreitet das 5MB Limit';
  },

  /**
   * Unsupported file type
   */
  unsupportedFileType: (field: string): string => {
    const label = fieldLabels[field] || field;
    return `${label}: Nicht unterstützter Dateityp`;
  },

  /**
   * Unsupported file type (short version)
   */
  unsupportedFileTypeShort: (_field: string): string => {
    return 'Nicht unterstützter Dateityp';
  },

  /**
   * Too many files
   */
  tooManyFiles: (field: string, max: number): string => {
    const label = fieldLabels[field] || field;
    return `${label}: Maximal ${max} Dateien erlaubt`;
  },

  /**
   * Too many files (short version)
   */
  tooManyFilesShort: (max: number): string => {
    return `Maximal ${max} Dateien erlaubt`;
  },

  // URL validation
  /**
   * Invalid URL format
   */
  invalidUrl: (_field: string): string => {
    return 'Ungültige URL';
  },

  /**
   * Invalid time format (HH:MM)
   */
  invalidTimeFormat: (_field: string): string => {
    return 'Ungültiges Zeitformat (HH:MM)';
  },

  /**
   * At least one email address required
   */
  atLeastOneEmailRequired: (_field: string): string => {
    return 'Mindestens eine E-Mail-Adresse ist erforderlich';
  },

  /**
   * At least one ID required
   */
  atLeastOneIdRequired: (_field: string): string => {
    return 'Mindestens eine ID ist erforderlich';
  },

  /**
   * Status is required
   */
  statusRequired: (_field: string): string => {
    return 'Status ist erforderlich';
  },

  // Business logic error messages
  /**
   * Resource not found error
   */
  resourceNotFound: (resource: string, id?: string): string => {
    const label = fieldLabels[resource] || resource;
    return id ? `${label} mit ID ${id} nicht gefunden` : `${label} nicht gefunden`;
  },

  /**
   * Resource not active error
   */
  resourceNotActive: (resource: string): string => {
    const label = fieldLabels[resource] || resource;
    return `${label} ist nicht aktiv`;
  },

  /**
   * Invalid status error
   */
  invalidStatus: (field: string, validStatuses: string[]): string => {
    const label = fieldLabels[field] || field;
    return `Ungültiger ${label}. Gültige Werte: ${validStatuses.join(', ')}`;
  },

  /**
   * Upload failed error
   */
  uploadFailed: (_field: string): string => {
    return 'Upload fehlgeschlagen. Bitte versuchen Sie es später erneut.';
  },

  /**
   * Upload failed with retry attempts
   */
  uploadFailedWithRetries: (_field: string): string => {
    return 'Upload nach mehreren Versuchen fehlgeschlagen. Bitte versuchen Sie es später erneut.';
  }
};

/**
 * Antrag-specific validation messages.
 * Consolidates all messages from zodCustomMessages and hardcoded strings.
 */
export const antragMessages = {
  // Purpose validation
  atLeastOnePurpose: 'Mindestens ein Zweck muss ausgewählt werden',

  // Zuschuss (financial support) validation
  zuschussAmountRequired: 'Betrag für finanziellen Zuschuss ist erforderlich',
  zuschussAmountMinimum: 'Betrag muss mindestens 1 Euro betragen',
  zuschussAmountMaximum: 'Betrag darf maximal 999.999 Euro betragen',
  zuschussAmountInvalid: 'Betrag muss eine gültige Zahl sein',

  // Personelle Unterstützung validation
  personelleDetailsRequired: 'Details zur personellen Unterstützung sind erforderlich',

  // Raumbuchung validation
  raumbuchungLocationRequired: 'Ort für Raumbuchung ist erforderlich',
  raumbuchungPeopleRequired: 'Anzahl der Personen für Raumbuchung ist erforderlich',
  raumbuchungPeopleMinimum: 'Anzahl der Personen muss mindestens 1 sein',
  raumbuchungPeopleMaximum: 'Anzahl der Personen darf maximal 1000 sein',
  raumbuchungDetailsRequired: 'Ort für Raumbuchung ist erforderlich',

  // Weiteres validation
  weiteresDetailsRequired: 'Details zu weiteren Anliegen sind erforderlich',
  weiteresDetailsMaxLength: 'Details zu weiteren Anliegen dürfen maximal 1000 Zeichen lang sein'
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

/**
 * Get the appropriate field label for a given field path.
 * Handles nested object paths like 'purposes.zuschuss.amount' and array paths like 'responsiblePersons.0.firstName'
 *
 * @param fieldPath - The field path (e.g., 'name', 'purposes.zuschuss.amount', 'responsiblePersons.0.firstName')
 * @returns German field label or the original field path if no label found
 */
export function getFieldPathLabel(fieldPath: string): string {
  // First try exact match
  if (fieldLabels[fieldPath]) {
    return fieldLabels[fieldPath];
  }

  // Try the last part of the path (for array items like 'responsiblePersons.0.firstName')
  const pathParts = fieldPath.split('.');
  const lastPart = pathParts[pathParts.length - 1];

  if (fieldLabels[lastPart]) {
    return fieldLabels[lastPart];
  }

  // Try without array indexes (e.g., 'responsiblePersons.0.firstName' -> 'responsiblePersons.firstName')
  const withoutIndexes = fieldPath.replace(/\.\d+\./g, '.');
  if (fieldLabels[withoutIndexes]) {
    return fieldLabels[withoutIndexes];
  }

  // Fallback to original field path
  return fieldPath;
}