/**
 * Shared validation schemas and patterns for consistent validation across the application.
 * Uses German error messages from validation-messages.ts for consistent localization.
 */

import { validationMessages, isValidEmail } from '../validation-messages';

/**
 * Common validation functions that can be reused across all validators
 */
export const commonValidators = {
  /**
   * Validates that a field is not empty/null/undefined
   */
  required: (value: unknown, field: string): string | null => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return validationMessages.required(field);
    }
    return null;
  },

  /**
   * Validates string length between min and max characters
   */
  stringLength: (value: string, field: string, min: number, max: number): string | null => {
    if (!value) return null; // Let required() handle empty values

    if (value.length < min || value.length > max) {
      return validationMessages.between(field, min, max);
    }
    return null;
  },

  /**
   * Validates minimum string length
   */
  minLength: (value: string, field: string, min: number): string | null => {
    if (!value) return null; // Let required() handle empty values

    if (value.length < min) {
      return validationMessages.minLength(field, min);
    }
    return null;
  },

  /**
   * Validates maximum string length
   */
  maxLength: (value: string, field: string, max: number): string | null => {
    if (!value) return null; // Let required() handle empty values

    if (value.length > max) {
      return validationMessages.maxLength(field, max);
    }
    return null;
  },

  /**
   * Validates email format
   */
  email: (value: string, field: string): string | null => {
    if (!value) return null; // Let required() handle empty values

    if (!isValidEmail(value)) {
      return validationMessages.email(field);
    }
    return null;
  },

  /**
   * Validates that an array has at least one item
   */
  arrayNotEmpty: (value: unknown[], field: string): string | null => {
    if (!value || !Array.isArray(value) || value.length === 0) {
      return validationMessages.atLeastOne(field);
    }
    return null;
  }
};

/**
 * Validation schemas for common field patterns
 */
export const validationSchemas = {
  /**
   * Standard name field (3-100 characters)
   */
  name: {
    required: true,
    minLength: 3,
    maxLength: 100,
    validate: (value: string, field: string = 'name'): string | null => {
      return commonValidators.required(value, field) ||
             commonValidators.stringLength(value, field, 3, 100);
    }
  },

  /**
   * Standard title field (3-200 characters)
   */
  title: {
    required: true,
    minLength: 3,
    maxLength: 200,
    validate: (value: string, field: string = 'title'): string | null => {
      return commonValidators.required(value, field) ||
             commonValidators.stringLength(value, field, 3, 200);
    }
  },

  /**
   * Long description field (50-5000 characters)
   */
  longDescription: {
    required: true,
    minLength: 50,
    maxLength: 5000,
    validate: (value: string, field: string = 'description'): string | null => {
      return commonValidators.required(value, field) ||
             commonValidators.stringLength(value, field, 50, 5000);
    }
  },

  /**
   * Short description/teaser field (10-500 characters)
   */
  shortDescription: {
    required: true,
    minLength: 10,
    maxLength: 500,
    validate: (value: string, field: string = 'teaser'): string | null => {
      return commonValidators.required(value, field) ||
             commonValidators.stringLength(value, field, 10, 500);
    }
  },

  /**
   * Person first name (2-50 characters)
   */
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    validate: (value: string, field: string = 'firstName'): string | null => {
      return commonValidators.required(value, field) ||
             commonValidators.stringLength(value, field, 2, 50);
    }
  },

  /**
   * Person last name (2-50 characters)
   */
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    validate: (value: string, field: string = 'lastName'): string | null => {
      return commonValidators.required(value, field) ||
             commonValidators.stringLength(value, field, 2, 50);
    }
  },

  /**
   * Email field validation
   */
  email: {
    required: true,
    validate: (value: string, field: string = 'email'): string | null => {
      return commonValidators.required(value, field) ||
             commonValidators.email(value, field);
    }
  },

  /**
   * Optional text field with max length
   */
  optionalText: (maxLength: number) => ({
    required: false,
    maxLength,
    validate: (value: string | null | undefined, field: string): string | null => {
      if (!value) return null; // Optional field
      return commonValidators.maxLength(value, field, maxLength);
    }
  }),

  /**
   * Required text content (like status report content)
   */
  content: {
    required: true,
    minLength: 10,
    maxLength: 10000,
    validate: (value: string, field: string = 'content'): string | null => {
      return commonValidators.required(value, field) ||
             commonValidators.stringLength(value, field, 10, 10000);
    }
  }
};

/**
 * Helper function to validate a single field using a schema
 */
export function validateField(
  value: unknown,
  schema: { validate: (value: any, field: string) => string | null },
  fieldName: string
): string | null {
  return schema.validate(value, fieldName);
}

/**
 * Helper function to validate multiple fields and collect errors
 */
export function validateFields(
  data: Record<string, unknown>,
  validationRules: Record<string, { validate: (value: any, field: string) => string | null }>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const [fieldName, rule] of Object.entries(validationRules)) {
    const fieldValue = data[fieldName];
    const error = rule.validate(fieldValue, fieldName);

    if (error) {
      errors[fieldName] = error;
    }
  }

  return errors;
}