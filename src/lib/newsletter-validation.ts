/**
 * Newsletter validation utilities
 * 
 * Centralized validation logic for newsletter settings to avoid repetitive code
 * and ensure consistent validation across the application.
 */

import { NEWSLETTER_LIMIT_FIELDS, NewsletterLimitField } from './newsletter-constants';
import { NewsletterSettings } from '@/types/newsletter-types';

/**
 * Validates newsletter content limit fields
 * 
 * @param data - Partial newsletter settings data to validate
 * @throws Error if any limit is outside the valid range
 */
export function validateNewsletterLimits(data: Partial<NewsletterSettings>): void {
  for (const [fieldName, rules] of Object.entries(NEWSLETTER_LIMIT_FIELDS)) {
    const value = data[fieldName as NewsletterLimitField];
    
    if (value !== undefined) {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        throw new Error(`${fieldName} must be a valid integer`);
      }
      
      if (value < rules.MIN || value > rules.MAX) {
        throw new Error(`${fieldName} must be between ${rules.MIN} and ${rules.MAX}`);
      }
    }
  }
}

/**
 * Gets the default value for a newsletter limit field
 * 
 * @param fieldName - The field name to get the default for
 * @returns The default value for the field
 */
export function getNewsletterLimitDefault(fieldName: NewsletterLimitField): number {
  return NEWSLETTER_LIMIT_FIELDS[fieldName].DEFAULT;
}

/**
 * Gets the validation range for a newsletter limit field
 * 
 * @param fieldName - The field name to get the range for
 * @returns Object with min and max values
 */
export function getNewsletterLimitRange(fieldName: NewsletterLimitField): { min: number; max: number } {
  const rules = NEWSLETTER_LIMIT_FIELDS[fieldName];
  return { min: rules.MIN, max: rules.MAX };
}