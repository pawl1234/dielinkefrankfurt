/**
 * Helper functions for newsletter generation using React Email patterns
 * Extracted from newsletter-template.ts for better modularity
 */

import { Appointment } from '@prisma/client';
import { de } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Set fixed timezone for consistent date formatting
 */
const timeZone = 'Europe/Berlin';

/**
 * Format date helper (date only)
 */
export const formatDate = (dateString: Date | string): string => {
  return formatInTimeZone(new Date(dateString), timeZone, 'PPP', { locale: de });
};

/**
 * Format date and time helper
 */
export const formatDateTime = (dateString: Date | string): string => {
  return formatInTimeZone(new Date(dateString), timeZone, 'PPP p', { locale: de });
};

/**
 * Format time only helper
 */
export const formatTime = (dateString: Date | string): string => {
  return formatInTimeZone(new Date(dateString), timeZone, 'p', { locale: de });
};

/**
 * Format date range for appointments
 * Returns properly formatted German date range string
 */
export const formatAppointmentDateRange = (
  startDateTime: Date | string, 
  endDateTime?: Date | string | null
): string => {
  const start = new Date(startDateTime);
  
  if (!endDateTime) {
    return formatDateTime(start);
  }
  
  const end = new Date(endDateTime);
  const startDate = formatInTimeZone(start, timeZone, 'PPP', { locale: de });
  const endDate = formatInTimeZone(end, timeZone, 'PPP', { locale: de });
  const startTime = formatInTimeZone(start, timeZone, 'p', { locale: de });
  const endTime = formatInTimeZone(end, timeZone, 'p', { locale: de });
  
  // If same date, show: "5. Juni 2025, 14:00 - 16:00"
  if (startDate === endDate) {
    return `${startDate}, ${startTime} - ${endTime} Uhr`;
  }
  
  // If different dates, show: "5. Juni 2025, 14:00 - 6. Juni 2025, 16:00"
  return `${startDate}, ${startTime} Uhr - ${endDate}, ${endTime} Uhr`;
};

/**
 * Truncate text to a certain length with ellipsis
 * Preserves word boundaries when possible
 */
export const truncateText = (text: string, maxLength: number = 300): string => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  // Find the last space within the maxLength
  const lastSpace = text.substring(0, maxLength).lastIndexOf(' ');
  
  // If no space found, just cut at maxLength
  const truncatedText = lastSpace !== -1 ? text.substring(0, lastSpace) : text.substring(0, maxLength);
  
  return truncatedText + '...';
};

/**
 * Get cover image URL from appointment metadata or fileUrls
 * Prioritizes cropped cover images for featured appointments
 */
export const getCoverImageUrl = (appointment: Appointment): string | null => {
  // First, try to get the cropped cover image from metadata if featured
  if (appointment.featured && appointment.metadata) {
    try {
      const metadata = JSON.parse(appointment.metadata as string);
      if (metadata.croppedCoverImageUrl) {
        return metadata.croppedCoverImageUrl;
      }
      if (metadata.coverImageUrl) {
        return metadata.coverImageUrl;
      }
    } catch {
      // Metadata parse error, use default values
    }
  }
  
  // Fallback to file URLs if no cover image in metadata
  if (!appointment.fileUrls) return null;
  
  try {
    const fileUrls = JSON.parse(appointment.fileUrls) as string[];
    // Find the first file that is an image
    const imageUrl = fileUrls.find((url: string) => 
      url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.gif')
    );
    return imageUrl || null;
  } catch {
    return null;
  }
};

/**
 * Generate appointment detail URL
 * Creates consistent URLs for appointment links
 */
export const getAppointmentUrl = (appointmentId: number | string, baseUrl: string): string => {
  return `${baseUrl}/termine/${appointmentId}`;
};

/**
 * Generate status report URL with anchor
 * Creates URLs for status report links with group context
 */
export const getStatusReportUrl = (
  reportId: string, 
  groupSlug: string, 
  baseUrl: string
): string => {
  return `${baseUrl}/gruppen/${groupSlug}#report-${reportId}`;
};

/**
 * Extract plain text from HTML content
 * Useful for creating email-safe content from rich text
 */
export const extractPlainText = (htmlContent: string): string => {
  if (!htmlContent) return '';
  
  return htmlContent
    .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newlines
    .replace(/<\/p>/gi, '\n\n') // Convert closing </p> to double newlines
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

/**
 * Generate preview text for React Email Preview component
 * Converts HTML to plain text and truncates to optimal length
 * 
 * @param htmlContent - HTML content to convert to preview text
 * @param maxLength - Maximum length for preview text (default: 90 characters)
 * @returns Plain text suitable for email preview
 */
export const generatePreviewText = (htmlContent: string, maxLength: number = 90): string => {
  if (!htmlContent) return '';
  
  // Convert HTML to plain text
  const plainText = extractPlainText(htmlContent);
  
  // Remove newlines and normalize whitespace for preview
  const cleanText = plainText
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .trim();
  
  // Truncate to maxLength with proper word boundary
  if (cleanText.length <= maxLength) {
    return cleanText;
  }
  
  // Find the last space before maxLength to avoid cutting words
  const truncateAt = cleanText.lastIndexOf(' ', maxLength - 3);
  
  // Only use word boundary if it's reasonable (not too far back)
  if (truncateAt > maxLength * 0.6) {
    return cleanText.substring(0, truncateAt).trim() + '...';
  }
  
  // If no good word boundary, truncate at character limit
  return cleanText.substring(0, maxLength - 3).trim() + '...';
};

/**
 * Check if appointment has location information
 * Determines if appointment is in-person or online
 */
export const hasPhysicalLocation = (appointment: Appointment): boolean => {
  return Boolean(
    appointment.street ||
    appointment.city ||
    appointment.locationDetails ||
    appointment.postalCode
  );
};

/**
 * Get appointment location string
 * Returns formatted location or "Online" for virtual events
 */
export const getAppointmentLocation = (appointment: Appointment): string => {
  if (hasPhysicalLocation(appointment)) {
    const parts = [
      appointment.street,
      appointment.city,
      appointment.locationDetails,
      appointment.postalCode
    ].filter(Boolean);

    return parts.join(', ');
  }
  
  // Check for online meeting link in metadata
  if (appointment.metadata) {
    try {
      const metadata = JSON.parse(appointment.metadata as string);
      if (metadata.onlineLink) {
        return 'Online';
      }
    } catch {
      // Ignore parsing errors
    }
  }
  
  return 'Ort wird noch bekannt gegeben';
};