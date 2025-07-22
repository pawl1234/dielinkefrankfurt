/**
 * Newsletter email template props using existing types
 * Reuses types from existing modules to maintain consistency
 */

import { NewsletterSettings, GroupWithReports } from './newsletter-types';
import { Appointment } from '@prisma/client';
import { AntragWithId } from './api-types';

/**
 * Props for the main newsletter React Email template
 * Uses existing database types and settings for type safety
 */
export interface NewsletterEmailProps {
  /** Newsletter display and sending settings from database */
  newsletterSettings: NewsletterSettings;
  
  /** Newsletter subject line for email title and metadata */
  subject?: string;
  
  /** Introduction text content for the newsletter */
  introductionText: string;
  
  /** Featured appointments to highlight at the top */
  featuredAppointments: Appointment[];
  
  /** Regular upcoming appointments */
  upcomingAppointments: Appointment[];
  
  /** Status reports grouped by their associated groups */
  statusReportsByGroup: GroupWithReports[];
  
  /** Base URL for generating absolute links */
  baseUrl: string;
}

/**
 * Props for notification email templates (Antrag submissions, etc.)
 * Reuses existing Antrag types for consistency
 */
export interface NotificationEmailProps {
  /** Antrag data with database ID */
  antrag: AntragWithId;
  
  /** URLs of uploaded files for the Antrag */
  fileUrls: string[];
  
  /** Admin URL for reviewing the Antrag */
  adminUrl: string;
  
  /** Base URL for generating absolute links */
  baseUrl: string;
}

/**
 * Base props that all email templates should have
 */
export interface BaseEmailProps {
  /** Base URL for generating absolute links */
  baseUrl: string;
}

/**
 * Union type for all email template props
 */
export type EmailTemplateProps = NewsletterEmailProps | NotificationEmailProps;