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