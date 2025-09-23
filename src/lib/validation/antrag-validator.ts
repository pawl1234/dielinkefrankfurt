import type { AntragPurposes } from '@/types/api-types';
import { AppError, validationErrorResponse, ValidationResult } from '@/lib/errors';
import { validateAntragFiles } from '@/lib/antrag-file-utils';

/**
 * Form data interface for Antrag submission
 */
export interface AntragFormData {
  firstName?: string;
  lastName?: string;
  email?: string;
  title?: string;
  summary?: string;
  purposes?: AntragPurposes;
  files?: File[];
  recaptchaToken?: string;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (optional field)
 */
export function validatePhoneNumber(phone: string): boolean {
  // German phone number format: +49 or 0 followed by digits, spaces, and hyphens allowed
  const phoneRegex = /^(\+49|0)[0-9\s\-\/()]+$/;
  return phone.length >= 6 && phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate text field length
 */
export function validateTextLength(text: string, minLength: number, maxLength: number): boolean {
  const trimmedText = text.trim();
  return trimmedText.length >= minLength && trimmedText.length <= maxLength;
}

/**
 * Validate first name
 */
export function validateFirstName(firstName?: string): string | null {
  if (!firstName || firstName.trim().length === 0) {
    return 'Vorname ist erforderlich';
  }
  
  if (!validateTextLength(firstName, 2, 50)) {
    return 'Vorname muss zwischen 2 und 50 Zeichen lang sein';
  }
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-ZäöüÄÖÜß\s\-']+$/;
  if (!nameRegex.test(firstName.trim())) {
    return 'Vorname enthält ungültige Zeichen';
  }
  
  return null;
}

/**
 * Validate last name
 */
export function validateLastName(lastName?: string): string | null {
  if (!lastName || lastName.trim().length === 0) {
    return 'Nachname ist erforderlich';
  }
  
  if (!validateTextLength(lastName, 2, 50)) {
    return 'Nachname muss zwischen 2 und 50 Zeichen lang sein';
  }
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-ZäöüÄÖÜß\s\-']+$/;
  if (!nameRegex.test(lastName.trim())) {
    return 'Nachname enthält ungültige Zeichen';
  }
  
  return null;
}

/**
 * Validate email field
 */
export function validateEmailField(email?: string): string | null {
  if (!email || email.trim().length === 0) {
    return 'E-Mail-Adresse ist erforderlich';
  }
  
  if (!validateEmail(email.trim())) {
    return 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
  }
  
  if (email.length > 100) {
    return 'E-Mail-Adresse darf maximal 100 Zeichen lang sein';
  }
  
  return null;
}

/**
 * Validate title
 */
export function validateTitle(title?: string): string | null {
  if (!title || title.trim().length === 0) {
    return 'Titel ist erforderlich';
  }
  
  if (!validateTextLength(title, 3, 200)) {
    return 'Titel muss zwischen 3 und 200 Zeichen lang sein';
  }
  
  return null;
}

/**
 * Validate summary
 */
export function validateSummary(summary?: string): string | null {
  if (!summary || summary.trim().length === 0) {
    return 'Zusammenfassung ist erforderlich';
  }
  
  if (!validateTextLength(summary, 10, 300)) {
    return 'Zusammenfassung muss zwischen 10 und 300 Zeichen lang sein';
  }
  
  return null;
}

/**
 * Validate purposes structure and requirements
 */
export function validatePurposes(purposes?: AntragPurposes): string | null {
  if (!purposes || typeof purposes !== 'object') {
    return 'Mindestens ein Zweck muss ausgewählt werden';
  }
  
  // Check if at least one purpose is enabled
  const hasEnabledPurpose = Object.values(purposes).some(
    purpose => purpose && typeof purpose === 'object' && purpose.enabled === true
  );
  
  if (!hasEnabledPurpose) {
    return 'Mindestens ein Zweck muss ausgewählt werden';
  }
  
  // Validate zuschuss (financial support)
  if (purposes.zuschuss?.enabled) {
    if (purposes.zuschuss.amount === undefined || purposes.zuschuss.amount === null || typeof purposes.zuschuss.amount !== 'number') {
      return 'Betrag für finanziellen Zuschuss ist erforderlich';
    }
    
    if (purposes.zuschuss.amount < 1) {
      return 'Betrag muss mindestens 1 Euro betragen';
    }
    
    if (purposes.zuschuss.amount > 999999) {
      return 'Betrag darf maximal 999.999 Euro betragen';
    }
    
    // Check if amount is a valid number (not NaN)
    if (isNaN(purposes.zuschuss.amount)) {
      return 'Betrag muss eine gültige Zahl sein';
    }
  }
  
  // Validate personelleUnterstuetzung (personnel support)
  if (purposes.personelleUnterstuetzung?.enabled) {
    if (!purposes.personelleUnterstuetzung.details || 
        purposes.personelleUnterstuetzung.details.trim().length === 0) {
      return 'Details zur personellen Unterstützung sind erforderlich';
    }
    
    if (purposes.personelleUnterstuetzung.details.length > 500) {
      return 'Details zur personellen Unterstützung dürfen maximal 500 Zeichen lang sein';
    }
  }
  
  // Validate raumbuchung (room booking)
  if (purposes.raumbuchung?.enabled) {
    if (!purposes.raumbuchung.location || 
        purposes.raumbuchung.location.trim().length === 0) {
      return 'Ort für Raumbuchung ist erforderlich';
    }
    
    if (purposes.raumbuchung.location.length > 200) {
      return 'Ort für Raumbuchung darf maximal 200 Zeichen lang sein';
    }
    
    if (!purposes.raumbuchung.numberOfPeople || 
        typeof purposes.raumbuchung.numberOfPeople !== 'number') {
      return 'Anzahl der Personen für Raumbuchung ist erforderlich';
    }
    
    if (purposes.raumbuchung.numberOfPeople < 1) {
      return 'Anzahl der Personen muss mindestens 1 sein';
    }
    
    if (purposes.raumbuchung.numberOfPeople > 1000) {
      return 'Anzahl der Personen darf maximal 1000 sein';
    }
    
    if (!purposes.raumbuchung.details || 
        purposes.raumbuchung.details.trim().length === 0) {
      return 'Details zur Raumbuchung sind erforderlich';
    }
    
    if (purposes.raumbuchung.details.length > 500) {
      return 'Details zur Raumbuchung dürfen maximal 500 Zeichen lang sein';
    }
  }
  
  // Validate weiteres (other)
  if (purposes.weiteres?.enabled) {
    if (!purposes.weiteres.details || 
        purposes.weiteres.details.trim().length === 0) {
      return 'Details zu weiteren Anliegen sind erforderlich';
    }
    
    if (purposes.weiteres.details.length > 1000) {
      return 'Details zu weiteren Anliegen dürfen maximal 1000 Zeichen lang sein';
    }
  }
  
  return null;
}

/**
 * Comprehensive validation for Antrag form data
 */
export function validateAntragFormData(data: AntragFormData): ValidationResult {
  const errors: Record<string, string> = {};
  
  // Validate first name
  const firstNameError = validateFirstName(data.firstName);
  if (firstNameError) {
    errors.firstName = firstNameError;
  }
  
  // Validate last name
  const lastNameError = validateLastName(data.lastName);
  if (lastNameError) {
    errors.lastName = lastNameError;
  }
  
  // Validate email
  const emailError = validateEmailField(data.email);
  if (emailError) {
    errors.email = emailError;
  }
  
  // Validate title
  const titleError = validateTitle(data.title);
  if (titleError) {
    errors.title = titleError;
  }
  
  // Validate summary
  const summaryError = validateSummary(data.summary);
  if (summaryError) {
    errors.summary = summaryError;
  }
  
  // Validate purposes
  const purposesError = validatePurposes(data.purposes);
  if (purposesError) {
    errors.purposes = purposesError;
  }
  
  // Validate files if present
  if (data.files && data.files.length > 0) {
    try {
      validateAntragFiles(data.files);
    } catch (error) {
      if (error instanceof Error) {
        errors.files = error.message;
      } else {
        errors.files = 'Fehler bei der Dateivalidierung';
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
}

/**
 * Validate reCAPTCHA token
 */
export async function validateRecaptcha(token?: string): Promise<boolean> {
  if (!token) {
    return false;
  }
  
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  // If reCAPTCHA is not configured, skip validation
  if (!secretKey) {
    console.warn('reCAPTCHA secret key not configured, skipping validation');
    return true;
  }
  
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${token}`,
    });
    
    const data = await response.json();
    
    // Check if verification was successful and score is above threshold
    if (data.success) {
      // For v3, check score (0.0 - 1.0, where 1.0 is very likely human)
      if (data.score !== undefined) {
        return data.score >= 0.5; // Adjust threshold as needed
      }
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('reCAPTCHA verification failed:', error);
    return false;
  }
}

/**
 * Check if request should be rate limited
 * Returns true if the request should be blocked
 */
export function shouldRateLimit(
  ip: string,
  requestCounts: Map<string, { count: number; firstRequest: number }>,
  maxRequests: number = 5,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const requestData = requestCounts.get(ip);
  
  if (!requestData) {
    // First request from this IP
    requestCounts.set(ip, { count: 1, firstRequest: now });
    return false;
  }
  
  // Check if window has expired
  if (now - requestData.firstRequest > windowMs) {
    // Reset the window
    requestCounts.set(ip, { count: 1, firstRequest: now });
    return false;
  }
  
  // Increment count
  requestData.count++;
  
  // Check if limit exceeded
  return requestData.count > maxRequests;
}

/**
 * Clean up old entries from rate limit map
 */
export function cleanupRateLimitMap(
  requestCounts: Map<string, { count: number; firstRequest: number }>,
  windowMs: number = 60000
): void {
  const now = Date.now();
  
  for (const [ip, data] of requestCounts.entries()) {
    if (now - data.firstRequest > windowMs) {
      requestCounts.delete(ip);
    }
  }
}

/**
 * Create a validation error response with field-specific errors
 */
export function createValidationErrorResponse(errors: Record<string, string>): ReturnType<typeof validationErrorResponse> {
  return validationErrorResponse(errors);
}

/**
 * Create an AppError for validation failures
 */
export function createValidationError(message: string, errors?: Record<string, string>): AppError {
  return AppError.validation(message, { fieldErrors: errors });
}