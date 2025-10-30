/**
 * Metadata builder utility for appointment Open Graph tags.
 *
 * This module provides functionality to generate rich metadata for appointment pages,
 * including Open Graph tags for social media sharing and Twitter Card tags.
 */

import type { Metadata } from 'next';
import type { Appointment } from '@prisma/client';
import { getBaseUrl } from '@/lib/base-url';
import { stripHtmlTags } from '@/lib/sanitization/sanitize';

/**
 * Builds complete metadata object for an appointment page.
 *
 * Generates:
 * - Page title
 * - Description (extracted from mainText)
 * - Open Graph tags (og:title, og:description, og:type, og:url, og:site_name, og:image)
 * - Twitter Card tags
 * - Event-specific tags (event:start_time, event:end_time, event:location)
 *
 * @param appointment - Appointment data from database
 * @returns Next.js Metadata object with all tags
 */
export function buildAppointmentMetadata(appointment: Appointment): Metadata {
  const siteUrl = getBaseUrl();

  // Build page URL (prefer slug format if available)
  const pageUrl = appointment.slug
    ? `${siteUrl}/termine/${appointment.slug}`
    : `${siteUrl}/termine/${appointment.id}`;

  // Extract description from mainText
  const description = extractDescription(appointment.mainText, 160);

  // Select appropriate Open Graph image
  const imageUrl = selectOpenGraphImage(appointment);

  // Format location string if available
  const location = formatLocationString(appointment);

  return {
    title: `${appointment.title} | Die Linke Frankfurt`,
    description,
    openGraph: {
      title: appointment.title,
      description,
      type: 'website',
      url: pageUrl,
      siteName: 'Die Linke Frankfurt',
      images: [{
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: appointment.title,
      }],
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: appointment.title,
      description,
      images: [imageUrl],
    },
    other: {
      'event:start_time': appointment.startDateTime.toISOString(),
      ...(appointment.endDateTime && {
        'event:end_time': appointment.endDateTime.toISOString(),
      }),
      ...(location && {
        'event:location': location,
      }),
    },
  };
}

/**
 * Extracts plain text description from HTML content.
 *
 * - Strips all HTML tags
 * - Decodes common HTML entities
 * - Truncates to specified length at word boundary
 * - Adds ellipsis if truncated
 *
 * @param html - HTML content from appointment mainText
 * @param maxLength - Maximum characters (default 160)
 * @returns Plain text description suitable for meta tags
 */
export function extractDescription(html: string, maxLength: number = 160): string {
  // Strip HTML tags and decode entities securely using sanitize-html library
  // This handles malformed HTML, nested tags, and all HTML entities
  const text = stripHtmlTags(html);

  // Trim whitespace
  const trimmed = text.trim();

  // Return as-is if within length limit
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  // Truncate at word boundary
  const truncated = trimmed.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  return lastSpace > 0
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
}

/**
 * Selects appropriate Open Graph image for appointment.
 *
 * Priority:
 * 1. Featured appointment with cover images → use first cover image
 * 2. Default fallback → site default OG image
 *
 * @param appointment - Appointment data from database
 * @returns Absolute URL to image
 */
export function selectOpenGraphImage(appointment: Appointment): string {
  const siteUrl = getBaseUrl();

  // Priority 1: Featured appointment with cover images in metadata
  if (appointment.featured && appointment.metadata) {
    try {
      const metadata = JSON.parse(appointment.metadata) as { coverImages?: Array<{ url: string }> };
      const coverImages = metadata.coverImages;

      if (coverImages && Array.isArray(coverImages) && coverImages.length > 0) {
        // Cover images from Vercel Blob are already absolute URLs
        return coverImages[0].url;
      }
    } catch (_error) {
      // Invalid JSON or missing coverImages - fall through to default
    }
  }

  // Priority 2: Default site image
  return `${siteUrl}/images/og-default.jpg`;
}

/**
 * Formats location information as single string.
 *
 * Combines street, postal code, city, and location details into
 * a comma-separated string suitable for event:location tag.
 *
 * @param appointment - Appointment data from database
 * @returns Formatted location string or undefined if no location data
 */
export function formatLocationString(appointment: Appointment): string | undefined {
  const parts: string[] = [];

  if (appointment.street) {
    parts.push(appointment.street);
  }

  if (appointment.postalCode && appointment.city) {
    parts.push(`${appointment.postalCode} ${appointment.city}`);
  } else if (appointment.city) {
    parts.push(appointment.city);
  }

  if (appointment.locationDetails) {
    parts.push(appointment.locationDetails);
  }

  return parts.length > 0 ? parts.join(', ') : undefined;
}
