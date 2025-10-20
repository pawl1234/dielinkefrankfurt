/**
 * Field Mapping Utilities
 *
 * Generic utilities for mapping database fields to application objects.
 * Eliminates code duplication in settings and other domain objects.
 */

/**
 * Merge database data with default values for specified fields
 *
 * This utility function eliminates the need for manual field-by-field mapping
 * with null coalescing operators. It automatically applies default values for
 * any fields that are null or undefined in the database data.
 *
 * @template T - Type of the object being merged
 * @param dbData - Data from database (may be null or have null fields)
 * @param defaultData - Default values to use for missing fields
 * @param fields - Array of field names to process
 * @returns Merged object with defaults applied
 *
 * @example
 * ```typescript
 * const dbSettings = await getNewsletterSettingsFromDb();
 * const defaultSettings = getDefaultNewsletterSettings();
 * const fields = ['headerLogo', 'footerText', 'batchSize'] as const;
 *
 * // Instead of:
 * // const settings = {
 * //   headerLogo: dbSettings?.headerLogo ?? defaultSettings.headerLogo,
 * //   footerText: dbSettings?.footerText ?? defaultSettings.footerText,
 * //   batchSize: dbSettings?.batchSize ?? defaultSettings.batchSize,
 * //   // ... 40+ more fields
 * // };
 *
 * // Use:
 * const settings = mergeWithDefaults(dbSettings, defaultSettings, fields);
 * ```
 */
export function mergeWithDefaults<T extends Record<string, unknown>>(
  dbData: T | null,
  defaultData: T,
  fields: readonly (keyof T)[]
): T {
  // If no database data, return defaults
  if (!dbData) {
    return defaultData;
  }

  // Start with default data as base, then override with db data
  const result = { ...defaultData, ...dbData };

  // Apply defaults for any null/undefined fields
  fields.forEach((field) => {
    if (result[field] === null || result[field] === undefined) {
      result[field] = defaultData[field];
    }
  });

  return result;
}

/**
 * Extract partial update data from input, filtering out undefined values
 *
 * Useful for update operations where only specified fields should be updated.
 * Removes undefined values to prevent database errors while allowing null values
 * (which explicitly clear fields).
 *
 * @template T - Type of the object being filtered
 * @param data - Input data with potential undefined values
 * @param fields - Array of field names to extract
 * @returns Filtered object with only defined fields
 *
 * @example
 * ```typescript
 * const updateData = {
 * headerLogo: 'new-logo.png',
 *   footerText: null,  // Explicitly clearing this field
 *   batchSize: undefined  // Not updating this field
 * };
 *
 * const filtered = extractDefinedFields(updateData, ['headerLogo', 'footerText', 'batchSize']);
 * // Result: { headerLogo: 'new-logo.png', footerText: null }
 * // batchSize is excluded because it's undefined
 * ```
 */
export function extractDefinedFields<T extends Record<string, unknown>>(
  data: Partial<T>,
  fields: readonly (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};

  fields.forEach((field) => {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  });

  return result;
}

/**
 * Define all newsletter settings fields for mapping operations
 *
 * This constant array lists all fields in the NewsletterSettings type
 * that should be processed by field mapping utilities. Update this
 * array whenever new fields are added to the database schema.
 */
export const NEWSLETTER_SETTINGS_FIELDS = [
  'headerLogo',
  'headerBanner',
  'footerText',
  'unsubscribeLink',
  'testEmailRecipients',
  'batchSize',
  'batchDelay',
  'fromEmail',
  'fromName',
  'replyToEmail',
  'subjectTemplate',
  'emailSalt',
  'chunkSize',
  'chunkDelay',
  'emailTimeout',
  'connectionTimeout',
  'greetingTimeout',
  'socketTimeout',
  'maxConnections',
  'maxMessages',
  'maxRetries',
  'maxBackoffDelay',
  'retryChunkSizes',
  'compositeWidth',
  'compositeHeight',
  'logoTopOffset',
  'logoLeftOffset',
  'logoHeight',
  'compositeImageUrl',
  'compositeImageHash',
  'maxFeaturedAppointments',
  'maxUpcomingAppointments',
  'maxStatusReportsPerGroup',
  'maxGroupsWithReports',
  'statusReportTitleLimit',
  'statusReportContentLimit',
  'aiSystemPrompt',
  'aiVorstandsprotokollPrompt',
  'aiTopicExtractionPrompt',
  'aiRefinementPrompt',
  'aiModel',
  'anthropicApiKey'
] as const;
