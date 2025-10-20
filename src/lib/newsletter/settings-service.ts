/**
 * Newsletter Settings Service
 *
 * Business logic layer for newsletter settings management.
 * Uses data access layer for database operations and field mappers to eliminate duplication.
 */

import { NewsletterSettings } from '@/types/newsletter-types';
import { getDefaultNewsletterSettings } from './newsletter-content-service';
import { logger } from '../logger';
import { handleDatabaseError } from '../errors';
import {
  getNewsletterSettingsFromDb,
  createNewsletterSettingsInDb,
  updateNewsletterSettingsInDb
} from '@/lib/db/newsletter-operations';
import {
  mergeWithDefaults,
  extractDefinedFields,
  NEWSLETTER_SETTINGS_FIELDS
} from './field-mappers';

/**
 * Fetches newsletter settings from the database
 * Creates default settings if none exist
 *
 * @returns Newsletter settings with defaults applied
 */
export async function getNewsletterSettings(): Promise<NewsletterSettings> {
  try {
    // Get default settings
    const defaultSettings = getDefaultNewsletterSettings();

    // Get settings from database
    const dbSettings = await getNewsletterSettingsFromDb();

    if (dbSettings) {
      // Merge database settings with defaults using field mapper utility
      const settings = mergeWithDefaults<NewsletterSettings>(
        dbSettings as NewsletterSettings | null,
        defaultSettings,
        NEWSLETTER_SETTINGS_FIELDS
      );

      logger.info('Newsletter settings loaded from database', {
        module: 'newsletter-settings-service',
        context: {
          operation: 'getNewsletterSettings',
          hasSettings: true
        }
      });

      return settings;
    } else {
      // Try to create default settings
      try {
        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...createData } = defaultSettings;
        const newSettings = await createNewsletterSettingsInDb(createData as Parameters<typeof createNewsletterSettingsInDb>[0]);

        logger.info('Newsletter settings created with defaults', {
          module: 'newsletter-settings-service',
          context: {
            operation: 'getNewsletterSettings',
            created: true
          }
        });

        return newSettings as NewsletterSettings;
      } catch (createError) {
        logger.warn('Could not create newsletter settings, returning defaults', {
          module: 'newsletter-settings-service',
          context: {
            operation: 'getNewsletterSettings',
            error: (createError as Error).message
          }
        });
        // Return defaults if creation fails
        return defaultSettings;
      }
    }
  } catch (error) {
    logger.error(error as Error, {
      module: 'newsletter-settings-service',
      context: { operation: 'getNewsletterSettings' }
    });
    // Return defaults on error
    return getDefaultNewsletterSettings();
  }
}

/**
 * Updates newsletter settings in the database
 *
 * @param data - Partial newsletter settings to update
 * @returns Updated newsletter settings
 * @throws Error if validation fails or database operation fails
 */
export async function updateNewsletterSettings(
  data: Partial<NewsletterSettings>
): Promise<NewsletterSettings> {
  try {
    // Validate data
    if (!data) {
      throw new Error('Newsletter-Einstellungen-Daten sind erforderlich');
    }

    // Get existing newsletter settings
    const newsletterSettings = await getNewsletterSettingsFromDb();

    // Extract only defined fields for update
    const updateData = extractDefinedFields<NewsletterSettings>(
      data,
      NEWSLETTER_SETTINGS_FIELDS
    );

    let updatedSettings;

    if (newsletterSettings) {
      // Update existing settings
      updatedSettings = await updateNewsletterSettingsInDb(
        newsletterSettings.id,
        updateData
      );

      logger.info('Newsletter settings updated', {
        module: 'newsletter-settings-service',
        context: {
          operation: 'updateNewsletterSettings',
          updatedFields: Object.keys(updateData)
        }
      });
    } else {
      // Create new settings with defaults for missing fields
      const defaultSettings = getDefaultNewsletterSettings();
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...defaultCreateData } = defaultSettings;
      const createData = {
        ...defaultCreateData,
        ...updateData
      };

      updatedSettings = await createNewsletterSettingsInDb(createData as Parameters<typeof createNewsletterSettingsInDb>[0]);

      logger.info('Newsletter settings created', {
        module: 'newsletter-settings-service',
        context: {
          operation: 'updateNewsletterSettings',
          created: true
        }
      });
    }

    return updatedSettings as NewsletterSettings;
  } catch (error) {
    logger.error(error as Error, {
      module: 'newsletter-settings-service',
      context: { operation: 'updateNewsletterSettings' }
    });
    throw handleDatabaseError(error, 'updateNewsletterSettings');
  }
}
