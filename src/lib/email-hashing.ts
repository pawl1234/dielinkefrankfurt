import crypto from 'crypto';
import prisma from './prisma';
import { HashedRecipient as PrismaHashedRecipient } from '@prisma/client';
import { logger } from './logger';

/**
 * Interface matching the Prisma HashedRecipient model
 */
export interface HashedRecipient {
  id: string;
  hashedEmail: string;
  firstSeen: Date;
  lastSent: Date | null;
}

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
}

/**
 * Validates an email using a regex pattern
 * @param email Email to validate
 * @returns Boolean indicating if the email is valid
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  
  // Email regex pattern - basic validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Gets or creates a salt from the Newsletter settings
 * @returns Promise resolving to the salt string
 */
export async function initializeSalt(): Promise<string> {
  try {
    // Get settings from database
    const dbSettings = await prisma.newsletter.findFirst();
    
    if (dbSettings?.emailSalt) {
      return dbSettings.emailSalt;
    }
    
    // If no salt exists, create a new one
    const newSalt = crypto.randomBytes(16).toString('hex');
    
    // Update or create newsletter settings with the new salt
    await prisma.newsletter.upsert({
      where: { id: dbSettings?.id || 1 },
      update: { emailSalt: newSalt },
      create: { 
        emailSalt: newSalt,
        batchSize: 100,
        batchDelay: 1000
      }
    });
    
    return newSalt;
  } catch (error) {
    logger.error('Failed to initialize email salt:', error);
    throw new Error('Failed to initialize email salt');
  }
}

/**
 * Hashes an email using SHA-256 with a salt
 * @param email Email to hash
 * @param salt Salt to use in hashing
 * @returns Hashed email string
 */
export function hashEmail(email: string, salt: string): string {
  if (!email || !salt) {
    throw new Error('Email and salt are required for hashing');
  }
  
  // Normalize email by trimming and converting to lowercase
  const normalizedEmail = email.trim().toLowerCase();
  
  // Create hash using SHA-256
  return crypto
    .createHash('sha256')
    .update(normalizedEmail + salt)
    .digest('hex');
}

/**
 * Processes a list of emails - validates, hashes, and checks against existing records
 * @param emailList Newline-separated list of emails
 * @returns Promise resolving to ValidationResult with statistics
 */
export async function validateAndHashEmails(emailList: string): Promise<ValidationResult> {
  if (!emailList) {
    return {
      valid: 0,
      invalid: 0,
      new: 0,
      existing: 0,
      hashedEmails: [],
      invalidEmails: []
    };
  }
  
  try {
    // Initialize result object
    const result: ValidationResult = {
      valid: 0,
      invalid: 0,
      new: 0,
      existing: 0,
      hashedEmails: [],
      invalidEmails: []
    };
    
    // Get salt for hashing
    const salt = await initializeSalt();
    
    // Split email list by newlines and filter out empty lines
    const emails = emailList
      .split('\n')
      .map(email => email.trim())
      .filter(email => email.length > 0);
    
    // Process each email
    const validEmails: string[] = [];
    
    for (const email of emails) {
      if (validateEmail(email)) {
        result.valid++;
        validEmails.push(email.trim().toLowerCase());
      } else {
        result.invalid++;
        result.invalidEmails.push(email);
      }
    }
    
    // Hash valid emails
    const hashedEmails = validEmails.map(email => hashEmail(email, salt));
    
    // Check for existing recipients
    const existingRecipients = await prisma.hashedRecipient.findMany({
      where: {
        hashedEmail: {
          in: hashedEmails
        }
      }
    });
    
    // Map of existing hashed emails
    const existingHashedEmails = new Set(existingRecipients.map(r => r.hashedEmail));
    
    // Create new recipients and update result
    const newRecipients: PrismaHashedRecipient[] = [];
    
    for (let i = 0; i < validEmails.length; i++) {
      const hashedEmail = hashedEmails[i];
      
      if (existingHashedEmails.has(hashedEmail)) {
        result.existing++;
        // Find the existing recipient
        const existingRecipient = existingRecipients.find(r => r.hashedEmail === hashedEmail);
        if (existingRecipient) {
          result.hashedEmails.push(existingRecipient);
        }
      } else {
        result.new++;
        // Create a new recipient record
        const newRecipient = await prisma.hashedRecipient.create({
          data: {
            hashedEmail: hashedEmail,
            firstSeen: new Date()
          }
        });
        
        newRecipients.push(newRecipient);
        result.hashedEmails.push(newRecipient);
      }
    }
    
    return result;
  } catch (error) {
    logger.error('Error in validateAndHashEmails:', error);
    throw new Error('Failed to process email list');
  }
}

/**
 * Updates the lastSent timestamp for a list of hashed recipients
 * @param recipientIds Array of recipient IDs
 */
export async function updateLastSentTimestamp(recipientIds: string[]): Promise<void> {
  if (!recipientIds.length) return;
  
  try {
    const now = new Date();
    
    // Update all recipients in a single transaction
    await prisma.$transaction(
      recipientIds.map(id => 
        prisma.hashedRecipient.update({
          where: { id },
          data: { lastSent: now }
        })
      )
    );
  } catch (error) {
    logger.error('Failed to update lastSent timestamps:', error);
    throw new Error('Failed to update recipient send timestamps');
  }
}