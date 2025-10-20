import { Appointment, Group, StatusReport } from '@prisma/client';
import type { EmailTransportSettings } from './email-types';

/**
 * Newsletter settings configuration for display and sending
 */
export interface NewsletterSettings extends EmailTransportSettings {
  [key: string]: unknown;
  headerLogo: string;
  headerBanner: string;
  footerText: string;
  unsubscribeLink: string;
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
  testEmailRecipients?: string | null;
  
  // Email sending configuration
  batchSize?: number;
  batchDelay?: number;
  fromEmail?: string;
  fromName?: string;
  replyToEmail?: string;
  subjectTemplate?: string;
  emailSalt?: string;

  // Newsletter sending performance settings
  chunkSize?: number;
  chunkDelay?: number;

  // Retry logic settings
  retryChunkSizes?: string;

  // Header Composition Settings
  compositeWidth?: number;
  compositeHeight?: number;
  logoTopOffset?: number;
  logoLeftOffset?: number;
  logoHeight?: number;
  
  // Generated composite metadata
  compositeImageUrl?: string | null;
  compositeImageHash?: string | null;

  // Newsletter content limits
  maxFeaturedAppointments?: number;
  maxUpcomingAppointments?: number;
  maxStatusReportsPerGroup?: number;
  maxGroupsWithReports?: number;

  // Status report limits
  statusReportTitleLimit?: number;
  statusReportContentLimit?: number;

  // AI Generation Settings
  aiSystemPrompt?: string;
  aiVorstandsprotokollPrompt?: string;
  aiTopicExtractionPrompt?: string;
  aiRefinementPrompt?: string;
  aiModel?: string;
  anthropicApiKey?: string;
}

/**
 * Group with associated status reports
 */
export interface GroupWithReports {
  group: Group;
  reports: StatusReport[];
}

/**
 * Parameters for email template generation
 */
export interface EmailTemplateParams {
  newsletterSettings: NewsletterSettings;
  subject?: string;
  introductionText: string;
  featuredAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  statusReportsByGroup?: GroupWithReports[];
  baseUrl: string;
}

/**
 * Optional parameters for analytics tracking integration
 */
export interface NewsletterAnalyticsParams {
  /** Analytics token for tracking pixel and link rewriting */
  analyticsToken?: string;
  /** Newsletter ID for analytics association */
  newsletterId?: string;
}

/**
 * Input data for creating a new newsletter item
 * Required: subject, introductionText
 * Optional: content, status (defaults to 'draft'), sentAt, recipientCount, settings
 */
export interface CreateNewsletterItemData {
  subject: string;
  introductionText: string;
  content?: string | null;
  status?: string;
  sentAt?: Date | null;
  recipientCount?: number | null;
  settings?: string | null;
}

/**
 * Type guard to extract email transport settings from newsletter settings
 * Safe type narrowing without casts
 */
export function extractEmailSettings(
  settings: NewsletterSettings
): EmailTransportSettings {
  return {
    connectionTimeout: settings.connectionTimeout,
    greetingTimeout: settings.greetingTimeout,
    socketTimeout: settings.socketTimeout,
    maxConnections: settings.maxConnections,
    maxMessages: settings.maxMessages,
    maxRetries: settings.maxRetries,
    emailTimeout: settings.emailTimeout,
    maxBackoffDelay: settings.maxBackoffDelay,
  };
}