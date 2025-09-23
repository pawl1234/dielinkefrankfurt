/**
 * Status report validation using centralized schemas and ValidationResult pattern.
 * Includes async newsletter settings lookup for configurable limits.
 */

import { validationSchemas, commonValidators } from './schemas';
import { ValidationResult } from '@/lib/errors';
import { getNewsletterSettings } from '@/lib/newsletter-service';
import { validationMessages } from '@/lib/validation-messages';

/**
 * Types for status report validation data
 */
export interface StatusReportCreateData {
  groupId: string;
  title: string;
  content: string;
  reporterFirstName: string;
  reporterLastName: string;
  fileUrls?: string[];
}

/**
 * Validates status report submission data with configurable limits from newsletter settings
 *
 * @param data - Status report data to validate
 * @returns ValidationResult with isValid flag and field errors in German
 */
export async function validateStatusReportData(data: Partial<StatusReportCreateData>): Promise<ValidationResult> {
  const errors: Record<string, string> = {};

  // Type guard to ensure we have an object to work with
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: { general: 'Ungültige Daten erhalten' }
    };
  }

  // Validate required groupId
  const groupIdError = commonValidators.required(data.groupId, 'groupId');
  if (groupIdError) {
    errors.groupId = groupIdError;
  }

  // Validate required title and content initially
  const titleRequiredError = commonValidators.required(data.title, 'title');
  if (titleRequiredError) {
    errors.title = titleRequiredError;
  }

  const contentRequiredError = commonValidators.required(data.content, 'content');
  if (contentRequiredError) {
    errors.content = contentRequiredError;
  }

  // Validate reporter names using shared schemas
  const reporterValidation = {
    reporterFirstName: validationSchemas.firstName,
    reporterLastName: validationSchemas.lastName
  };

  // Apply reporter field validation
  for (const [fieldName, schema] of Object.entries(reporterValidation)) {
    const fieldValue = data[fieldName as keyof StatusReportCreateData];
    const stringValue = typeof fieldValue === 'string' ? fieldValue : '';
    const fieldError = schema.validate(stringValue, fieldName);
    if (fieldError) {
      errors[fieldName] = fieldError;
    }
  }

  // Get configurable limits from newsletter settings for title and content validation
  try {
    const settings = await getNewsletterSettings();
    const titleLimit = settings.statusReportTitleLimit || 100;
    const contentLimit = settings.statusReportContentLimit || 5000;

    // Validate title length with configurable limit (only if title exists)
    if (data.title && !titleRequiredError) {
      if (data.title.length < 3 || data.title.length > titleLimit) {
        errors.title = `Berichtstitel muss zwischen 3 und ${titleLimit} Zeichen lang sein`;
      }
    }

    // Validate content length with configurable limit (only if content exists)
    if (data.content && !contentRequiredError) {
      if (data.content.length > contentLimit) {
        errors.content = `Berichtsinhalt darf maximal ${contentLimit} Zeichen lang sein`;
      }
    }
  } catch (settingsError) {
    // Fallback to default limits if settings cannot be retrieved
    console.warn('Could not retrieve newsletter settings, using default limits:', settingsError);

    // Validate title length with default limit (only if title exists)
    if (data.title && !titleRequiredError) {
      if (data.title.length < 3 || data.title.length > 100) {
        errors.title = validationMessages.between('title', 3, 100);
      }
    }

    // Validate content length with default limit (only if content exists)
    if (data.content && !contentRequiredError) {
      if (data.content.length > 5000) {
        errors.content = validationMessages.maxLength('content', 5000);
      }
    }
  }

  // Return validation result
  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
}

/**
 * Legacy compatibility function that returns string error message or null
 * for existing code that hasn't been migrated to ValidationResult pattern
 *
 * @deprecated Use validateStatusReportData() which returns ValidationResult
 */
export async function validateStatusReportDataLegacy(data: Partial<StatusReportCreateData>): Promise<string | null> {
  const result = await validateStatusReportData(data);

  if (!result.isValid && result.errors) {
    // Return the first error message for legacy compatibility
    const firstError = Object.values(result.errors)[0];
    return firstError || 'Validierung fehlgeschlagen';
  }

  return null;
}