/**
 * Centralized exports for all validation modules.
 * Import validators from this single location for consistency.
 */

// Export Zod integration utilities and schemas
export * from './helpers';
export * from './localization';
export * from './schemas';

// Export Zod-based validation schemas
export * from './antrag';
export * from './group';
export * from './status-report';
export * from './appointment';

// Export validation utilities
export * from './utils';

// Re-export ValidationResult and ValidationError from errors.ts for convenience
export type { ValidationResult } from '@/lib/errors';
export { ValidationError, isValidationError } from '@/lib/errors';