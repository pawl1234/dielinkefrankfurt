import prisma from '@/lib/db/prisma';
import { NewsletterSettings } from '../../types/newsletter-types';
import { getDefaultNewsletterSettings } from './template-generator';
import { logger } from '../logger';
import { handleDatabaseError } from '../errors';
import { validateNewsletterLimits } from './validation';

// Smart caching for newsletter settings
let settingsCache: NewsletterSettings | null = null;

/**
 * Clears the newsletter settings cache to force fresh data load
 */
export function clearNewsletterSettingsCache(): void {
  settingsCache = null;
  logger.debug('Newsletter settings cache cleared', {
    module: 'newsletter-settings-service',
    context: {
      operation: 'clearNewsletterSettingsCache',
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Fetches newsletter settings from the database with smart caching
 * Creates default settings if none exist
 */
export async function getNewsletterSettings(): Promise<NewsletterSettings> {
  // Return cached settings if available
  if (settingsCache) {
    logger.debug('Returning cached newsletter settings');
    return settingsCache;
  }

  try {
    // Default newsletter settings
    const defaultSettings = getDefaultNewsletterSettings();

    // Get settings from database
    const dbSettings = await prisma.newsletter.findFirst();

    if (dbSettings) {
      const settings: NewsletterSettings = {
        headerLogo: dbSettings.headerLogo ?? defaultSettings.headerLogo,
        headerBanner: dbSettings.headerBanner ?? defaultSettings.headerBanner,
        footerText: dbSettings.footerText ?? defaultSettings.footerText,
        unsubscribeLink: dbSettings.unsubscribeLink ?? defaultSettings.unsubscribeLink,
        testEmailRecipients: dbSettings.testEmailRecipients ?? defaultSettings.testEmailRecipients,

        // Email sending configuration
        batchSize: dbSettings.batchSize ?? defaultSettings.batchSize,
        batchDelay: dbSettings.batchDelay ?? defaultSettings.batchDelay,
        fromEmail: dbSettings.fromEmail ?? defaultSettings.fromEmail,
        fromName: dbSettings.fromName ?? defaultSettings.fromName,
        replyToEmail: dbSettings.replyToEmail ?? defaultSettings.replyToEmail,
        subjectTemplate: dbSettings.subjectTemplate ?? defaultSettings.subjectTemplate,
        emailSalt: dbSettings.emailSalt || undefined,

        // Newsletter sending performance settings
        chunkSize: dbSettings.chunkSize ?? defaultSettings.chunkSize,
        chunkDelay: dbSettings.chunkDelay ?? defaultSettings.chunkDelay,
        emailTimeout: dbSettings.emailTimeout ?? defaultSettings.emailTimeout,

        // SMTP connection settings
        connectionTimeout: dbSettings.connectionTimeout ?? defaultSettings.connectionTimeout,
        greetingTimeout: dbSettings.greetingTimeout ?? defaultSettings.greetingTimeout,
        socketTimeout: dbSettings.socketTimeout ?? defaultSettings.socketTimeout,
        maxConnections: dbSettings.maxConnections ?? defaultSettings.maxConnections,
        maxMessages: dbSettings.maxMessages ?? defaultSettings.maxMessages,

        // Retry logic settings
        maxRetries: dbSettings.maxRetries ?? defaultSettings.maxRetries,
        maxBackoffDelay: dbSettings.maxBackoffDelay ?? defaultSettings.maxBackoffDelay,
        retryChunkSizes: dbSettings.retryChunkSizes ?? defaultSettings.retryChunkSizes,

        // Header Composition Settings
        compositeWidth: dbSettings.compositeWidth ?? undefined,
        compositeHeight: dbSettings.compositeHeight ?? undefined,
        logoTopOffset: dbSettings.logoTopOffset ?? undefined,
        logoLeftOffset: dbSettings.logoLeftOffset ?? undefined,
        logoHeight: dbSettings.logoHeight ?? undefined,

        // Generated composite metadata
        compositeImageUrl: dbSettings.compositeImageUrl ?? undefined,
        compositeImageHash: dbSettings.compositeImageHash ?? undefined,

        // Newsletter content limits
        maxFeaturedAppointments: dbSettings.maxFeaturedAppointments ?? defaultSettings.maxFeaturedAppointments,
        maxUpcomingAppointments: dbSettings.maxUpcomingAppointments ?? defaultSettings.maxUpcomingAppointments,
        maxStatusReportsPerGroup: dbSettings.maxStatusReportsPerGroup ?? defaultSettings.maxStatusReportsPerGroup,
        maxGroupsWithReports: dbSettings.maxGroupsWithReports ?? defaultSettings.maxGroupsWithReports,

        // Status report limits (TODO: Add these fields to database schema)
        statusReportTitleLimit: 100,
        statusReportContentLimit: 5000,

        // AI Generation Settings
        aiSystemPrompt: dbSettings.aiSystemPrompt ?? undefined,
        aiVorstandsprotokollPrompt: dbSettings.aiVorstandsprotokollPrompt ?? undefined,
        aiModel: dbSettings.aiModel ?? undefined,
        anthropicApiKey: dbSettings.anthropicApiKey ?? undefined,

        // System fields
        id: dbSettings.id,
        createdAt: dbSettings.createdAt,
        updatedAt: dbSettings.updatedAt
      };

      // Cache the settings
      settingsCache = settings;
      logger.info('Newsletter settings loaded and cached from database');

      return settings;
    } else {
      // Try to create default settings
      try {
        const newSettings = await prisma.newsletter.create({
          data: defaultSettings
        });

        // Cache the newly created settings
        settingsCache = newSettings as NewsletterSettings;
        logger.info('Newsletter settings created and cached');

        return settingsCache;
      } catch (createError) {
        logger.warn('Could not create newsletter settings', {
          module: 'newsletter-settings-service',
          context: {
            operation: 'getNewsletterSettings',
            error: (createError as Error).message
          }
        });
        // Cache and return defaults if creation fails
        settingsCache = defaultSettings;
        return settingsCache;
      }
    }
  } catch (error) {
    logger.error(error as Error, {
      module: 'newsletter-settings-service',
      context: { operation: 'getNewsletterSettings' }
    });
    // Cache and return defaults on error
    const defaultSettings = getDefaultNewsletterSettings();
    settingsCache = defaultSettings;
    return defaultSettings;
  }
}

/**
 * Updates newsletter settings in the database
 */
export async function updateNewsletterSettings(data: Partial<NewsletterSettings>): Promise<NewsletterSettings> {
  try {
    // Validate data
    if (!data) {
      throw new Error('Newsletter settings data is required');
    }

    // Validate content limits if provided
    validateNewsletterLimits(data);

    // Get existing newsletter settings
    const newsletterSettings = await prisma.newsletter.findFirst();

    let updatedSettings;

    if (newsletterSettings) {
      // Update existing settings
      updatedSettings = await prisma.newsletter.update({
        where: { id: newsletterSettings.id },
        data: {
          // Display settings
          headerLogo: data.headerLogo,
          headerBanner: data.headerBanner,
          footerText: data.footerText,
          unsubscribeLink: data.unsubscribeLink,
          testEmailRecipients: data.testEmailRecipients,

          // Email sending configuration
          batchSize: data.batchSize,
          batchDelay: data.batchDelay,
          fromEmail: data.fromEmail,
          fromName: data.fromName,
          replyToEmail: data.replyToEmail,
          subjectTemplate: data.subjectTemplate,
          emailSalt: data.emailSalt,

          // Newsletter sending performance settings
          chunkSize: data.chunkSize,
          chunkDelay: data.chunkDelay,
          emailTimeout: data.emailTimeout,

          // SMTP connection settings
          connectionTimeout: data.connectionTimeout,
          greetingTimeout: data.greetingTimeout,
          socketTimeout: data.socketTimeout,
          maxConnections: data.maxConnections,
          maxMessages: data.maxMessages,

          // Retry logic settings
          maxRetries: data.maxRetries,
          maxBackoffDelay: data.maxBackoffDelay,
          retryChunkSizes: data.retryChunkSizes,

          // Header Composition Settings
          compositeWidth: data.compositeWidth,
          compositeHeight: data.compositeHeight,
          logoTopOffset: data.logoTopOffset,
          logoLeftOffset: data.logoLeftOffset,
          logoHeight: data.logoHeight,

          // Generated composite metadata
          compositeImageUrl: data.compositeImageUrl,
          compositeImageHash: data.compositeImageHash,

          // Newsletter content limits
          maxFeaturedAppointments: data.maxFeaturedAppointments,
          maxUpcomingAppointments: data.maxUpcomingAppointments,
          maxStatusReportsPerGroup: data.maxStatusReportsPerGroup,
          maxGroupsWithReports: data.maxGroupsWithReports,

          // AI Settings
          aiSystemPrompt: data.aiSystemPrompt,
          anthropicApiKey: data.anthropicApiKey,
        }
      });
    } else {
      // Create new settings with defaults for missing fields
      const defaultSettings = getDefaultNewsletterSettings();
      updatedSettings = await prisma.newsletter.create({
        data: {
          // Display settings
          headerLogo: data.headerLogo || defaultSettings.headerLogo,
          headerBanner: data.headerBanner || defaultSettings.headerBanner,
          footerText: data.footerText || defaultSettings.footerText,
          unsubscribeLink: data.unsubscribeLink || defaultSettings.unsubscribeLink,
          testEmailRecipients: data.testEmailRecipients || defaultSettings.testEmailRecipients,

          // Email sending configuration
          batchSize: data.batchSize || defaultSettings.batchSize,
          batchDelay: data.batchDelay || defaultSettings.batchDelay,
          fromEmail: data.fromEmail || defaultSettings.fromEmail,
          fromName: data.fromName || defaultSettings.fromName,
          replyToEmail: data.replyToEmail || defaultSettings.replyToEmail,
          subjectTemplate: data.subjectTemplate || defaultSettings.subjectTemplate,

          // Newsletter sending performance settings
          chunkSize: data.chunkSize || defaultSettings.chunkSize,
          chunkDelay: data.chunkDelay || defaultSettings.chunkDelay,
          emailTimeout: data.emailTimeout || defaultSettings.emailTimeout,

          // SMTP connection settings
          connectionTimeout: data.connectionTimeout || defaultSettings.connectionTimeout,
          greetingTimeout: data.greetingTimeout || defaultSettings.greetingTimeout,
          socketTimeout: data.socketTimeout || defaultSettings.socketTimeout,
          maxConnections: data.maxConnections || defaultSettings.maxConnections,
          maxMessages: data.maxMessages || defaultSettings.maxMessages,

          // Retry logic settings
          maxRetries: data.maxRetries || defaultSettings.maxRetries,
          maxBackoffDelay: data.maxBackoffDelay || defaultSettings.maxBackoffDelay,
          retryChunkSizes: data.retryChunkSizes || defaultSettings.retryChunkSizes,

          // Header Composition Settings
          compositeWidth: data.compositeWidth,
          compositeHeight: data.compositeHeight,
          logoTopOffset: data.logoTopOffset,
          logoLeftOffset: data.logoLeftOffset,
          logoHeight: data.logoHeight,

          // Generated composite metadata
          compositeImageUrl: data.compositeImageUrl,
          compositeImageHash: data.compositeImageHash,

          // Newsletter content limits
          maxFeaturedAppointments: data.maxFeaturedAppointments || defaultSettings.maxFeaturedAppointments,
          maxUpcomingAppointments: data.maxUpcomingAppointments || defaultSettings.maxUpcomingAppointments,
          maxStatusReportsPerGroup: data.maxStatusReportsPerGroup || defaultSettings.maxStatusReportsPerGroup,
          maxGroupsWithReports: data.maxGroupsWithReports || defaultSettings.maxGroupsWithReports,

          // AI Settings
          aiSystemPrompt: data.aiSystemPrompt,
          anthropicApiKey: data.anthropicApiKey,
        }
      });
    }

    // Invalidate cache immediately after update
    settingsCache = null;
    logger.info('Newsletter settings updated, cache invalidated');

    return updatedSettings as NewsletterSettings;
  } catch (error) {
    logger.error(error as Error, {
      module: 'newsletter-settings-service',
      context: { operation: 'updateNewsletterSettings' }
    });
    throw handleDatabaseError(error, 'updateNewsletterSettings');
  }
}
