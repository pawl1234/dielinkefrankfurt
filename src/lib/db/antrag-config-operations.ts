import prisma from './prisma';
import { AntragConfiguration } from '@prisma/client';

/**
 * Default email recipients if none are configured
 */
const DEFAULT_RECIPIENT_EMAILS = 'kreisvorstand@die-linke-frankfurt.de';

/**
 * Validate email format
 */
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate comma-separated email list
 */
function validateEmailList(emails: string): string | null {
  if (!emails || emails.trim().length === 0) {
    return 'Mindestens eine E-Mail-Adresse ist erforderlich';
  }
  
  const emailList = emails.split(',').map(email => email.trim()).filter(email => email.length > 0);
  
  if (emailList.length === 0) {
    return 'Mindestens eine E-Mail-Adresse ist erforderlich';
  }
  
  for (const email of emailList) {
    if (!validateEmail(email)) {
      return `Ungültige E-Mail-Adresse: ${email}`;
    }
  }
  
  return null;
}

/**
 * Get Antrag configuration (creates default if none exists)
 */
export async function getAntragConfiguration(): Promise<AntragConfiguration> {
  try {
    // Try to find existing configuration
    let configuration = await prisma.antragConfiguration.findFirst();
    
    // If no configuration exists, create a default one
    if (!configuration) {
      configuration = await prisma.antragConfiguration.create({
        data: {
          recipientEmails: DEFAULT_RECIPIENT_EMAILS
        }
      });
    }
    
    return configuration;
  } catch (error) {
    console.error('Error fetching Antrag configuration:', error);
    throw error;
  }
}

/**
 * Update Antrag configuration
 */
export async function updateAntragConfiguration(emails: string): Promise<AntragConfiguration> {
  // Validate email list
  const validationError = validateEmailList(emails);
  if (validationError) {
    throw new Error(validationError);
  }
  
  try {
    // Get existing configuration or create if it doesn't exist
    const existingConfig = await getAntragConfiguration();
    
    // Clean up email list - trim whitespace and remove empty entries
    const cleanedEmails = emails
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0)
      .join(',');
    
    // Update the configuration
    const updatedConfig = await prisma.antragConfiguration.update({
      where: { id: existingConfig.id },
      data: {
        recipientEmails: cleanedEmails
      }
    });
    
    return updatedConfig;
  } catch (error) {
    console.error('Error updating Antrag configuration:', error);
    throw error;
  }
}

/**
 * Get recipient emails as an array
 */
export async function getRecipientEmails(): Promise<string[]> {
  try {
    const configuration = await getAntragConfiguration();
    
    return configuration.recipientEmails
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);
  } catch (error) {
    console.error('Error getting recipient emails:', error);
    throw error;
  }
}