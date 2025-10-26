import crypto from 'crypto';
import { HashedRecipient } from '@prisma/client';
import { logger } from '../logger';
import { ValidatedEmails } from '@/types/email-types';
import { findHashedRecipientsByEmails, createHashedRecipient } from '@/lib/db/newsletter-operations';
import { getNewsletterSettings, updateNewsletterSettings } from '@/lib/newsletter';
import { EMAIL_REGEX } from '@/lib/validation/schemas';

/**
 * Result of batch email validation and hashing
 */
export interface ValidationResult {
  valid: number;
  invalid: number;
  new: number;
  existing: number;
  hashedEmails: HashedRecipient[];
  invalidEmails: string[];
  validatedEmails: ValidatedEmails;
}

/**
 * Cleans email by removing invisible characters and normalizing whitespace
 *
 * @param email - Raw email string
 * @returns Cleaned email string
 */
function cleanEmail(email: string): string {
  if (!email) return '';

  return email
    .replace(/[\u200B-\u200D\u2060\uFEFF\u00A0\u180E\u2000-\u200A\u202F\u205F\u3000]/g, '')
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .replace(/[\r\n]/g, '')
    .replace(/\t/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates email format for SMTP compatibility
 * EXPECTS PRE-CLEANED EMAIL (do not call cleanEmail here)
 *
 * Uses EMAIL_REGEX from validation schemas as single source of truth.
 *
 * @param cleanedEmail - Already cleaned email string
 * @returns Boolean indicating validity
 */
function validateEmail(cleanedEmail: string): boolean {
  if (!cleanedEmail) return false;

  // Check for SMTP-problematic characters
  if (cleanedEmail.includes('<') || cleanedEmail.includes('>') || cleanedEmail.includes('"')) {
    return false;
  }

  // Use shared EMAIL_REGEX constant to ensure consistency with Zod validation
  return EMAIL_REGEX.test(cleanedEmail) && cleanedEmail.length <= 254;
}

/**
 * Gets or creates salt from database
 * Uses service layer which handles proper settings creation with all required fields
 *
 * @returns Promise resolving to salt string
 */
async function initializeSalt(): Promise<string> {
  try {
    // Use service layer which creates settings properly if needed
    const settings = await getNewsletterSettings();

    if (settings.emailSalt) {
      return settings.emailSalt;
    }

    // Generate new salt
    const newSalt = crypto.randomBytes(16).toString('hex');

    // Update using service layer (settings definitely exist now)
    await updateNewsletterSettings({ emailSalt: newSalt });

    return newSalt;
  } catch (error) {
    logger.error('Failed to initialize email salt', { context: { error } });
    throw new Error('Failed to initialize email salt');
  }
}

/**
 * Hashes email using SHA-256 with salt
 * EXPECTS PRE-NORMALIZED EMAIL (lowercase, trimmed)
 *
 * @param normalizedEmail - Normalized email address
 * @param salt - Salt for hashing
 * @returns Hashed email string
 */
export function hashEmail(normalizedEmail: string, salt: string): string {
  if (!normalizedEmail || !salt) {
    throw new Error('Email and salt are required for hashing');
  }

  return crypto
    .createHash('sha256')
    .update(normalizedEmail + salt)
    .digest('hex');
}

/**
 * Validates, normalizes, hashes, and stores emails
 * SINGLE PASS: clean → validate → normalize → hash
 * Used ONLY by /api/admin/newsletter/validate
 *
 * @param emailList - Newline-separated email list
 * @returns ValidationResult with statistics and recipients
 */
export async function validateAndHashEmails(emailList: string): Promise<ValidationResult> {
  if (!emailList) {
    return {
      valid: 0,
      invalid: 0,
      new: 0,
      existing: 0,
      hashedEmails: [],
      invalidEmails: [],
      validatedEmails: []
    };
  }

  try {
    const result: ValidationResult = {
      valid: 0,
      invalid: 0,
      new: 0,
      existing: 0,
      hashedEmails: [],
      invalidEmails: [],
      validatedEmails: []
    };

    const salt = await initializeSalt();
    const emails = emailList
      .split('\n')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    // Process each email in a single pass: clean → validate → normalize
    const validEmails: string[] = [];

    for (const rawEmail of emails) {
      const cleaned = cleanEmail(rawEmail);

      if (validateEmail(cleaned)) {
        const normalized = cleaned.toLowerCase();
        result.valid++;
        validEmails.push(normalized);
        result.validatedEmails.push(normalized);
      } else {
        result.invalid++;
        result.invalidEmails.push(rawEmail);
      }
    }

    // Hash valid emails (expects normalized emails)
    const hashedEmails = validEmails.map(email => hashEmail(email, salt));

    // Check existing recipients
    const existingRecipients = await findHashedRecipientsByEmails(hashedEmails);

    const existingHashSet = new Set(existingRecipients.map(r => r.hashedEmail));

    // Create new recipients
    for (let i = 0; i < validEmails.length; i++) {
      const hashedEmail = hashedEmails[i];

      if (existingHashSet.has(hashedEmail)) {
        result.existing++;
        const existingRecipient = existingRecipients.find(r => r.hashedEmail === hashedEmail);
        if (existingRecipient) {
          result.hashedEmails.push(existingRecipient);
        }
      } else {
        result.new++;
        const newRecipient = await createHashedRecipient({
          hashedEmail: hashedEmail,
          firstSeen: new Date()
        });
        result.hashedEmails.push(newRecipient);
      }
    }

    return result;
  } catch (error) {
    logger.error('Error in validateAndHashEmails', { context: { error } });
    throw new Error('Failed to process email list');
  }
}
