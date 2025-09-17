import { Appointment, Group, StatusReport } from '@prisma/client';

/**
 * Newsletter settings configuration for display and sending
 */
export interface NewsletterSettings {
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
  emailTimeout?: number;

  // SMTP connection settings
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
  maxConnections?: number;
  maxMessages?: number;

  // Retry logic settings
  maxRetries?: number;
  maxBackoffDelay?: number;
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