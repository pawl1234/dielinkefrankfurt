import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db/prisma';

/**
 * Configuration interface for Antrag email recipients
 */
interface AntragConfiguration {
  id: number;
  recipientEmails: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get default configuration if none exists
 */
function getDefaultConfiguration(): Omit<AntragConfiguration, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    recipientEmails: 'admin@die-linke-frankfurt.de,kreisvorstand@die-linke-frankfurt.de'
  };
}

/**
 * Validate email addresses
 */
function validateEmails(emailString: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!emailString?.trim()) {
    errors.push('Mindestens eine E-Mail-Adresse ist erforderlich');
    return { isValid: false, errors };
  }

  const emails = emailString.split(',').map(email => email.trim()).filter(Boolean);
  
  if (emails.length === 0) {
    errors.push('Mindestens eine E-Mail-Adresse ist erforderlich');
    return { isValid: false, errors };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  for (const email of emails) {
    if (!emailRegex.test(email)) {
      errors.push(`Ungültige E-Mail-Adresse: ${email}`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * GET /api/admin/antraege/configuration
 *
 * Admin endpoint for retrieving Antrag email configuration.
 * Returns configuration object from database or creates default if none exists.
 * Authentication handled by middleware.
 */
export async function GET() {
  try {
    logger.debug('Fetching Antrag configuration', {
      module: 'api',
      context: { 
        endpoint: '/api/admin/antraege/configuration',
        method: 'GET'
      }
    });

    let configuration = await prisma.antragConfiguration.findFirst();
    
    if (!configuration) {
      // Create default configuration if none exists
      const defaultConfig = getDefaultConfiguration();
      
      logger.info('Creating default Antrag configuration', {
        module: 'api',
        context: { 
          endpoint: '/api/admin/antraege/configuration',
          method: 'GET',
          defaultEmails: defaultConfig.recipientEmails
        }
      });

      configuration = await prisma.antragConfiguration.create({
        data: defaultConfig
      });
    }
    
    logger.info('Antrag configuration retrieved successfully', {
      module: 'api',
      context: { 
        endpoint: '/api/admin/antraege/configuration',
        method: 'GET',
        configurationId: configuration.id,
        emailCount: configuration.recipientEmails.split(',').length
      }
    });

    return NextResponse.json(configuration);
  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: { 
        endpoint: '/api/admin/antraege/configuration',
        method: 'GET',
        operation: 'getAntragConfiguration'
      }
    });
    
    return apiErrorResponse(error, 'Failed to fetch Antrag configuration');
  }
}

/**
 * PUT /api/admin/antraege/configuration
 * 
 * Admin endpoint for updating Antrag email configuration.
 * Expects JSON object with recipientEmails field.
 * Authentication handled by middleware.
 */
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    logger.debug('Updating Antrag configuration', {
      module: 'api',
      context: { 
        endpoint: '/api/admin/antraege/configuration',
        method: 'PUT',
        fieldsToUpdate: Object.keys(data)
      }
    });

    // Validate that we have data to update
    if (!data || typeof data.recipientEmails !== 'string') {
      logger.warn('Invalid update request for Antrag configuration', {
        module: 'api',
        context: { 
          endpoint: '/api/admin/antraege/configuration',
          method: 'PUT',
          providedData: data
        }
      });
      
      return NextResponse.json(
        { error: 'recipientEmails field is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate email addresses
    const validation = validateEmails(data.recipientEmails);
    if (!validation.isValid) {
      logger.warn('Email validation failed for Antrag configuration', {
        module: 'api',
        context: { 
          endpoint: '/api/admin/antraege/configuration',
          method: 'PUT',
          errors: validation.errors
        }
      });
      
      return NextResponse.json(
        { error: 'Invalid email addresses', details: validation.errors },
        { status: 400 }
      );
    }

    // Get existing configuration or create new one
    let configuration = await prisma.antragConfiguration.findFirst();
    
    if (configuration) {
      // Update existing configuration
      configuration = await prisma.antragConfiguration.update({
        where: { id: configuration.id },
        data: { recipientEmails: data.recipientEmails.trim() }
      });
    } else {
      // Create new configuration
      configuration = await prisma.antragConfiguration.create({
        data: { recipientEmails: data.recipientEmails.trim() }
      });
    }
    
    logger.info('Antrag configuration updated successfully', {
      module: 'api',
      context: { 
        endpoint: '/api/admin/antraege/configuration',
        method: 'PUT',
        configurationId: configuration.id,
        emailCount: configuration.recipientEmails.split(',').length
      }
    });

    return NextResponse.json(configuration);
  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: { 
        endpoint: '/api/admin/antraege/configuration',
        method: 'PUT',
        operation: 'updateAntragConfiguration'
      }
    });
    
    return apiErrorResponse(error, 'Failed to update Antrag configuration');
  }
}