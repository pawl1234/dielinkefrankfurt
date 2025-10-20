/**
 * Zod validation schemas for newsletter domain
 *
 * Centralized validation schemas for all newsletter-related API endpoints.
 * Uses German error messages via the centralized localization system.
 */

import { z } from 'zod';
import { NEWSLETTER_LIMITS, STATUS_REPORT_LIMITS } from '@/lib/newsletter/constants';
import { validationMessages } from './validation-messages';
import { createEmailSchema } from './schemas';

/**
 * Base schemas for common newsletter fields
 */

const emailListSchema = z
  .string()
  .min(1, validationMessages.required('emailText'));

const optionalUrlSchema = z
  .string()
  .url('Ungültige URL')
  .optional()
  .nullable();

const htmlContentSchema = z
  .string()
  .min(1, validationMessages.required('html'));

const newsletterIdSchema = z
  .string()
  .min(1, validationMessages.required('newsletterId'));

const subjectSchema = z
  .string()
  .min(1, validationMessages.required('subject'))
  .max(200, validationMessages.maxLength('subject', 200));

const introductionTextSchema = z
  .string()
  .optional()
  .default('');

/**
 * Newsletter content limit schemas
 */

const maxFeaturedAppointmentsSchema = z
  .number()
  .int('Muss eine ganze Zahl sein')
  .min(
    NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.MIN,
    `Muss zwischen ${NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.MIN} und ${NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.MAX} liegen`
  )
  .max(
    NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.MAX,
    `Muss zwischen ${NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.MIN} und ${NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS.MAX} liegen`
  )
  .optional();

const maxUpcomingAppointmentsSchema = z
  .number()
  .int('Muss eine ganze Zahl sein')
  .min(
    NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.MIN,
    `Muss zwischen ${NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.MIN} und ${NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.MAX} liegen`
  )
  .max(
    NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.MAX,
    `Muss zwischen ${NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.MIN} und ${NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS.MAX} liegen`
  )
  .optional();

const maxStatusReportsPerGroupSchema = z
  .number()
  .int('Muss eine ganze Zahl sein')
  .min(
    NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.MIN,
    `Muss zwischen ${NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.MIN} und ${NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.MAX} liegen`
  )
  .max(
    NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.MAX,
    `Muss zwischen ${NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.MIN} und ${NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP.MAX} liegen`
  )
  .optional();

const maxGroupsWithReportsSchema = z
  .number()
  .int('Muss eine ganze Zahl sein')
  .min(
    NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.MIN,
    `Muss zwischen ${NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.MIN} und ${NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.MAX} liegen`
  )
  .max(
    NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.MAX,
    `Muss zwischen ${NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.MIN} und ${NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS.MAX} liegen`
  )
  .optional();

const statusReportTitleLimitSchema = z
  .number()
  .int('Muss eine ganze Zahl sein')
  .min(
    STATUS_REPORT_LIMITS.TITLE.MIN,
    `Muss zwischen ${STATUS_REPORT_LIMITS.TITLE.MIN} und ${STATUS_REPORT_LIMITS.TITLE.MAX} liegen`
  )
  .max(
    STATUS_REPORT_LIMITS.TITLE.MAX,
    `Muss zwischen ${STATUS_REPORT_LIMITS.TITLE.MIN} und ${STATUS_REPORT_LIMITS.TITLE.MAX} liegen`
  )
  .optional();

const statusReportContentLimitSchema = z
  .number()
  .int('Muss eine ganze Zahl sein')
  .min(
    STATUS_REPORT_LIMITS.CONTENT.MIN,
    `Muss zwischen ${STATUS_REPORT_LIMITS.CONTENT.MIN} und ${STATUS_REPORT_LIMITS.CONTENT.MAX} liegen`
  )
  .max(
    STATUS_REPORT_LIMITS.CONTENT.MAX,
    `Muss zwischen ${STATUS_REPORT_LIMITS.CONTENT.MIN} und ${STATUS_REPORT_LIMITS.CONTENT.MAX} liegen`
  )
  .optional();

/**
 * Newsletter Settings Schema
 * Used for updating newsletter settings via PUT /api/admin/newsletter/settings
 */
export const updateNewsletterSettingsSchema = z.object({
  // Header images
  headerLogo: optionalUrlSchema,
  headerBanner: optionalUrlSchema,

  // Footer and unsubscribe
  footerText: z.string().optional(),
  unsubscribeLink: optionalUrlSchema,

  // Test email configuration
  testEmailRecipients: z.string().optional().nullable(),

  // Email sending configuration
  batchSize: z.number().int().min(1).max(1000).optional(),
  batchDelay: z.number().int().min(0).max(60000).optional(),
  fromEmail: z.string().email('Ungültige E-Mail-Adresse').optional(),
  fromName: z.string().optional(),
  replyToEmail: z.string().email('Ungültige E-Mail-Adresse').optional(),
  subjectTemplate: z.string().optional(),
  emailSalt: z.string().optional(),

  // Newsletter sending performance settings
  chunkSize: z.number().int().min(1).max(1000).optional(),
  chunkDelay: z.number().int().min(0).max(60000).optional(),
  emailTimeout: z.number().int().min(1000).max(300000).optional(),

  // SMTP connection settings
  connectionTimeout: z.number().int().min(1000).max(300000).optional(),
  greetingTimeout: z.number().int().min(1000).max(300000).optional(),
  socketTimeout: z.number().int().min(1000).max(300000).optional(),
  maxConnections: z.number().int().min(1).max(100).optional(),
  maxMessages: z.number().int().min(1).max(10000).optional(),

  // Retry logic settings
  maxRetries: z.number().int().min(0).max(10).optional(),
  maxBackoffDelay: z.number().int().min(1000).max(300000).optional(),
  retryChunkSizes: z.string().optional(),

  // Header composition settings
  compositeWidth: z.number().int().min(100).max(2000).optional(),
  compositeHeight: z.number().int().min(50).max(1000).optional(),
  logoTopOffset: z.number().int().min(0).max(1000).optional(),
  logoLeftOffset: z.number().int().min(0).max(2000).optional(),
  logoHeight: z.number().int().min(10).max(500).optional(),

  // Generated composite metadata
  compositeImageUrl: z.string().optional().nullable(),
  compositeImageHash: z.string().optional().nullable(),

  // Newsletter content limits
  maxFeaturedAppointments: maxFeaturedAppointmentsSchema,
  maxUpcomingAppointments: maxUpcomingAppointmentsSchema,
  maxStatusReportsPerGroup: maxStatusReportsPerGroupSchema,
  maxGroupsWithReports: maxGroupsWithReportsSchema,

  // Status report limits
  statusReportTitleLimit: statusReportTitleLimitSchema,
  statusReportContentLimit: statusReportContentLimitSchema,

  // AI generation settings
  aiSystemPrompt: z.string().optional(),
  aiVorstandsprotokollPrompt: z.string().optional(),
  aiTopicExtractionPrompt: z.string().optional(),
  aiRefinementPrompt: z.string().optional(),
  aiModel: z.string().optional(),
  anthropicApiKey: z.string().optional()
}).partial();

/**
 * Generate Newsletter Schema (POST)
 * Used for creating a new newsletter draft
 */
export const generateNewsletterSchema = z.object({
  subject: subjectSchema,
  introductionText: introductionTextSchema
});

/**
 * Generate Newsletter Query Schema (GET)
 * Used for generating newsletter preview
 */
export const generateNewsletterQuerySchema = z.object({
  introductionText: z.string().optional()
});

/**
 * Send Newsletter Schema
 * Used for sending newsletter to recipients
 */
export const sendNewsletterSchema = z.object({
  newsletterId: newsletterIdSchema,
  html: htmlContentSchema,
  subject: subjectSchema,
  emailText: emailListSchema,
  settings: z.record(z.string(), z.unknown()).optional()
});

/**
 * Send Chunk Schema
 * Used for sending a specific chunk of emails
 */
export const sendChunkSchema = z.object({
  newsletterId: newsletterIdSchema,
  html: htmlContentSchema,
  subject: subjectSchema,
  emails: z.array(createEmailSchema(100, 'email')).min(1, 'Mindestens eine E-Mail-Adresse erforderlich'),
  chunkIndex: z.number().int().min(0),
  totalChunks: z.number().int().min(1),
  settings: z.record(z.string(), z.unknown()).optional()
});

/**
 * Retry Chunk Schema
 * Used for retrying failed email chunks
 */
export const retryChunkSchema = z.object({
  newsletterId: newsletterIdSchema,
  html: htmlContentSchema,
  subject: subjectSchema,
  settings: z.record(z.string(), z.unknown()).optional(),
  chunkEmails: z.array(createEmailSchema(100, 'email')).min(1, 'Mindestens eine E-Mail-Adresse erforderlich'),
  chunkIndex: z.number().int().min(0)
});

/**
 * Send Test Email Schema
 * Used for sending test emails
 */
export const sendTestEmailSchema = z.object({
  html: htmlContentSchema,
  newsletterId: z.string().optional()
});

/**
 * Validate Recipients Schema
 * Used for validating recipient list
 */
export const validateRecipientsSchema = z.object({
  emailText: emailListSchema
});

/**
 * AI Generate Intro Schema
 * Used for generating newsletter intro with AI
 */
export const aiGenerateIntroSchema = z.object({
  topThemes: z
    .string()
    .min(1, validationMessages.required('topThemes'))
    .max(5000, validationMessages.maxLength('topThemes', 5000)),
  boardProtocol: z
    .string()
    .max(10000, validationMessages.maxLength('boardProtocol', 10000))
    .optional(),
  extractedTopics: z
    .string()
    .max(5000, validationMessages.maxLength('extractedTopics', 5000))
    .optional(),
  previousIntro: z.string().optional()
});

/**
 * AI Refine Text Schema
 * Used for refining text with AI
 */
export const aiRefineTextSchema = z.object({
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1)
    })
  ).min(1),
  refinementInstructions: z
    .string()
    .min(1, validationMessages.required('refinementInstructions'))
    .max(1000, validationMessages.maxLength('refinementInstructions', 1000))
});

/**
 * AI Extract Topics Schema
 * Used for extracting topics from board protocol
 */
export const aiExtractTopicsSchema = z.object({
  boardProtocol: z
    .string()
    .min(1, validationMessages.required('boardProtocol'))
    .max(10000, validationMessages.maxLength('boardProtocol', 10000))
});
