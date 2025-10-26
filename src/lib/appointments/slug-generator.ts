/**
 * Slug generation utility for appointment URLs.
 *
 * This module provides functionality to generate URL-friendly slugs from appointment titles.
 * Slugs are generated once when an appointment is accepted and never regenerated.
 */

import { logger } from '@/lib/logger';

/**
 * Generates a URL-friendly slug from appointment title.
 *
 * Rules:
 * - Converts to lowercase
 * - Simplifies German umlauts: ä→a, ö→o, ü→u, ß→ss
 * - Removes all emojis completely
 * - Removes all punctuation except hyphens
 * - Collapses multiple consecutive hyphens into one
 * - Removes leading/trailing hyphens
 * - Truncates to maximum 50 characters
 * - Includes numeric ID for uniqueness
 *
 * @param title - Appointment title to slugify
 * @param id - Appointment ID for uniqueness
 * @returns URL-friendly slug with ID prefix (e.g., "123-vollversammlung-oktober")
 */
export function generateAppointmentSlug(title: string, id: number): string {
  try {
    // Fallback for empty or whitespace-only titles
    if (!title || title.trim() === '') {
      return `${id}-termin`;
    }

    // Step 1: Remove emojis (Unicode emoji characters)
    const withoutEmojis = title.replace(/[\p{Emoji}\p{Emoji_Presentation}]/gu, '');

    // Step 2: Replace German umlauts (simplified transliteration)
    const umlautMap: Record<string, string> = {
      'ä': 'a', 'Ä': 'a',
      'ö': 'o', 'Ö': 'o',
      'ü': 'u', 'Ü': 'u',
      'ß': 'ss',
    };

    let normalized = withoutEmojis;
    for (const [umlaut, replacement] of Object.entries(umlautMap)) {
      normalized = normalized.replace(new RegExp(umlaut, 'g'), replacement);
    }

    // Step 3: Convert to lowercase
    normalized = normalized.toLowerCase();

    // Step 4: Remove all non-alphanumeric characters except spaces and hyphens
    normalized = normalized.replace(/[^a-z0-9\s-]/g, '');

    // Step 5: Replace spaces with hyphens
    normalized = normalized.replace(/\s+/g, '-');

    // Step 6: Collapse multiple consecutive hyphens
    normalized = normalized.replace(/-+/g, '-');

    // Step 7: Remove leading/trailing hyphens
    normalized = normalized.replace(/^-+|-+$/g, '');

    // Step 8: Truncate to 50 characters
    if (normalized.length > 50) {
      normalized = normalized.substring(0, 50);
      // Remove trailing hyphen if truncation created one
      normalized = normalized.replace(/-+$/, '');
    }

    // Step 9: Add ID prefix for uniqueness and fallback
    // If after all processing the slug is empty, use fallback
    return normalized ? `${id}-${normalized}` : `${id}-termin`;

  } catch (error) {
    // Log error but return fallback slug
    logger.error('Slug generation failed', {
      module: 'appointments/slug-generator',
      context: { id, title, error },
      tags: ['slug-generation', 'critical'],
    });

    // Return fallback slug even on error
    return `${id}-termin`;
  }
}
