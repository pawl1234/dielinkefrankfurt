import { Group, StatusReport, NewsletterItem } from '@prisma/client';
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

/**
 * Filters for querying newsletters with optional search and status
 */
export interface NewsletterQueryFilters {
  search?: string;
  status?: string;
}

/**
 * Pagination options for newsletter queries
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Result of paginated newsletter query
 */
export interface PaginatedNewsletterResult {
  items: NewsletterItem[];
  total: number;
}

/**
 * Options for querying newsletter items
 */
export interface GetNewsletterItemsOptions {
  /** Filter by newsletter status (e.g., 'draft', 'sent', 'sending') */
  status?: string;
  /** Field to sort by (default: 'createdAt') */
  sortBy?: 'createdAt' | 'sentAt';
  /** Sort order (default: 'desc') */
  sortOrder?: 'asc' | 'desc';
  /** Maximum number of items to return */
  limit?: number;
}