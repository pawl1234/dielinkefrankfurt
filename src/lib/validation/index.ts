/**
 * Centralized exports for all validation modules.
 * Import validators from this single location for consistency.
 */

// Export shared validation schemas and utilities
export * from './schemas';

// Export individual validators
export * from './group-validator';
export * from './status-report-validator';
export * from './appointment-validator';
export * from './antrag-validator';

// Re-export ValidationResult and ValidationError from errors.ts for convenience
export type { ValidationResult } from '@/lib/errors';
export { ValidationError, isValidationError } from '@/lib/errors';