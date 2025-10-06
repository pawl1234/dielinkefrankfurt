/**
 * Newsletter validation utilities
 * 
 * Centralized validation logic for newsletter settings to avoid repetitive code
 * and ensure consistent validation across the application.
 */

import { NEWSLETTER_LIMIT_FIELDS, NewsletterLimitField } from './constants';
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

