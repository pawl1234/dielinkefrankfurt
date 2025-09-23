/**
 * Extended German localization for Zod validation schemas.
 * Adds field labels for nested objects and Zod-specific validation patterns.
 */

import { fieldLabels } from '@/lib/validation-messages';

/**
 * Extended field labels for Zod validation including nested object paths
 * Used by zod-helpers.ts to provide German field names for complex validations
 */
export const zodFieldLabels: Record<string, string> = {
  // Inherit existing field labels
  ...fieldLabels,

  // Antrag purposes - nested object field labels
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

  // Responsible persons array
  'responsiblePersons': 'Verantwortliche Personen',
  'responsiblePersons.firstName': 'Vorname (Verantwortliche Person)',
  'responsiblePersons.lastName': 'Nachname (Verantwortliche Person)',
  'responsiblePersons.email': 'E-Mail-Adresse (Verantwortliche Person)',

  // Status report specific fields
  'groupId': 'Gruppe',
  'reporterFirstName': 'Vorname des Berichterstatters',
  'reporterLastName': 'Nachname des Berichterstatters',

  // Appointment specific fields
  'mainText': 'Haupttext',
  'startDateTime': 'Startdatum und -zeit',
  'endDateTime': 'Enddatum und -zeit',
  'postalCode': 'Postleitzahl',
  'recurringText': 'Wiederholungsbeschreibung',

  // File handling
  'fileUrls': 'Datei-URLs',
  'files': 'Dateianhänge',

  // Common validation fields
  'general': 'Allgemein',
  'summary': 'Zusammenfassung',
  'teaser': 'Kurzbeschreibung'
};

/**
 * Specific German error messages for complex Zod validation scenarios
 * Used for custom validation rules that don't fit standard patterns
 */
export const zodCustomMessages = {
  // Array validation messages
  arrayEmpty: (fieldName: string): string => {
    const label = zodFieldLabels[fieldName] || fieldName;
    return `${label} darf nicht leer sein`;
  },

  atLeastOne: (fieldName: string): string => {
    const label = zodFieldLabels[fieldName] || fieldName;
    return `Mindestens ein Eintrag für ${label} ist erforderlich`;
  },

  // Object validation messages
  objectRequired: (fieldName: string): string => {
    const label = zodFieldLabels[fieldName] || fieldName;
    return `${label} ist erforderlich`;
  },

  // Antrag-specific validation messages
  atLeastOnePurpose: 'Mindestens ein Verwendungszweck muss ausgewählt werden',
  zuschussAmountRequired: 'Betrag für finanziellen Zuschuss ist erforderlich',
  zuschussAmountMinimum: 'Betrag muss mindestens 1 Euro betragen',
  zuschussAmountMaximum: 'Betrag darf maximal 999.999 Euro betragen',
  zuschussAmountInvalid: 'Betrag muss eine gültige Zahl sein',

  // Purpose details required messages
  personelleDetailsRequired: 'Details zur personellen Unterstützung sind erforderlich',
  raumbuchungLocationRequired: 'Ort für Raumbuchung ist erforderlich',
  raumbuchungPeopleRequired: 'Anzahl der Personen für Raumbuchung ist erforderlich',
  raumbuchungPeopleMinimum: 'Anzahl der Personen muss mindestens 1 sein',
  raumbuchungPeopleMaximum: 'Anzahl der Personen darf maximal 1000 sein',
  raumbuchungDetailsRequired: 'Details zur Raumbuchung sind erforderlich',
  weiteresDetailsRequired: 'Details zu weiteren Anliegen sind erforderlich',

  // File validation messages
  fileSizeExceeded: 'Dateigröße überschreitet das erlaubte Limit',
  unsupportedFileType: 'Nicht unterstützter Dateityp',
  tooManyFiles: 'Zu viele Dateien ausgewählt',

  // Date/time validation messages
  invalidDateTime: 'Ungültiges Datum oder Uhrzeit',
  startDateRequired: 'Startdatum ist erforderlich',
  endDateBeforeStart: 'Enddatum darf nicht vor dem Startdatum liegen',

  // Character limit messages
  germanCharacterPattern: 'Nur deutsche Zeichen, Leerzeichen, Bindestriche und Apostrophe sind erlaubt'
};

/**
 * Get the appropriate German field label for a given field path
 * Handles nested object paths like 'purposes.zuschuss.amount'
 *
 * @param fieldPath - The field path (e.g., 'name', 'purposes.zuschuss.amount')
 * @returns German field label or the original field path if no label found
 */
export function getZodFieldLabel(fieldPath: string): string {
  // First try exact match
  if (zodFieldLabels[fieldPath]) {
    return zodFieldLabels[fieldPath];
  }

  // Try the last part of the path (for array items like 'responsiblePersons.0.firstName')
  const pathParts = fieldPath.split('.');
  const lastPart = pathParts[pathParts.length - 1];

  if (zodFieldLabels[lastPart]) {
    return zodFieldLabels[lastPart];
  }

  // Try without array indexes (e.g., 'responsiblePersons.0.firstName' -> 'responsiblePersons.firstName')
  const withoutIndexes = fieldPath.replace(/\.\d+\./g, '.');
  if (zodFieldLabels[withoutIndexes]) {
    return zodFieldLabels[withoutIndexes];
  }

  // Fallback to original field path
  return fieldPath;
}