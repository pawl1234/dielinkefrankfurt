/**
 * Centralized exports for all validation modules.
 * Import validators from this single location for consistency.
 */

// Export validation messages and localization
export * from './validation-messages';

// Export Zod integration utilities and schemas
export * from './helpers';
export * from './schemas';
export * from './file-schemas';

// Export Zod-based validation schemas
export * from './antrag';
export * from './group';
export * from './status-report';
export * from './appointment';
export * from './admin-schemas';

// Re-export ValidationResult and ValidationError from errors.ts for convenience
export type { ValidationResult } from '@/lib/errors';
export { ValidationError, isValidationError } from '@/lib/errors';