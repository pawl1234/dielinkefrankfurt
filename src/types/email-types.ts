/**
 * TypeScript interfaces for notification email props
 * Used by React Email templates for all notification emails
 */

import { Group, StatusReport, Antrag, ResponsiblePerson } from '@prisma/client';

// Extended model types with relations
export type GroupWithResponsiblePersons = Group & {
  responsiblePersons: ResponsiblePerson[];
};

export type StatusReportWithGroup = StatusReport & {
  group: GroupWithResponsiblePersons;
};

// Base notification email props interface
export interface NotificationEmailProps {
  recipientEmail: string;
  recipientName: string;
  baseUrl: string;
  headerLogo: string; // From database Newsletter settings
  [key: string]: unknown; // Index signature for compatibility
}

// Group-specific notification email props
export interface GroupEmailProps extends NotificationEmailProps {
  group: GroupWithResponsiblePersons;
  statusReportFormUrl?: string;
  contactEmail?: string;
}

// Status report-specific notification email props
export interface StatusReportEmailProps extends NotificationEmailProps {
  statusReport: StatusReportWithGroup;
  reportUrl?: string;
  contactEmail?: string;
}

// Antrag-specific notification email props
export interface AntragEmailProps extends NotificationEmailProps {
  antrag: Antrag;
  decisionComment?: string;
  contactEmail?: string;
}

// Status indicator types for StatusSection component
export type StatusType = 'success' | 'error' | 'info';

// Props for reusable components
export interface StatusSectionProps {
  type: StatusType;
  title: string;
  subtitle?: string;
}

export interface DetailsListProps {
  items: Array<{
    label: string;
    value: string;
  }>;
}

export interface InfoBoxProps {
  title: string;
  content: string;
  type?: 'info' | 'warning' | 'success';
}

export interface NotificationHeaderProps {
  logo: string;
}

// Group contact-specific email props
export interface GroupContactEmailProps extends NotificationEmailProps {
  group: GroupWithResponsiblePersons;
  requesterName: string;
  requesterEmail: string;
  message: string;
}