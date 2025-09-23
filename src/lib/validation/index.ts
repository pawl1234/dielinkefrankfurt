/**
 * Centralized exports for all validation modules.
 * Import validators from this single location for consistency.
 */

// Export shared validation schemas and utilities
export * from './schemas';

// Export Zod integration utilities (NEW)
export * from './zod-helpers';
export * from './zod-localization';
export * from './zod-schemas';

// Export new Zod-based validation schemas (NEW)
export * from './antrag-schema';
export * from './group-schema';
export * from './status-report-schema';
export * from './appointment-schema';

// Export legacy individual validators (DEPRECATED - will be removed after full migration)
// Selectively export to avoid naming conflicts with new Zod schemas
export {
  validateGroupData,
  validateGroupDataLegacy
} from './group-validator';

export {
  validateStatusReportData,
  validateStatusReportDataLegacy
} from './status-report-validator';

export {
  validateAppointmentData,
  validateAppointmentDataLegacy
} from './appointment-validator';

export {
  validateAntragFormData,
  validateRecaptcha,
  shouldRateLimit,
  cleanupRateLimitMap,
  validateEmail,
  validatePhoneNumber,
  validateTextLength,
  validateFirstName,
  validateLastName,
  validateEmailField,
  validateTitle,
  validateSummary,
  validatePurposes,
  createValidationErrorResponse,
  createValidationError
} from './antrag-validator';

// Re-export ValidationResult and ValidationError from errors.ts for convenience
export type { ValidationResult } from '@/lib/errors';
export { ValidationError, isValidationError } from '@/lib/errors';