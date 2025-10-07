import { logger } from '@/lib/logger';

/**
 * Appointment metadata structure for cover images
 */
export interface AppointmentMetadata {
  coverImageUrl?: string;
  croppedCoverImageUrl?: string | null;
}

/**
 * Parses appointment metadata from JSON string.
 * Centralized to avoid repetition and ensure consistent error handling.
 *
 * @param metadataJson - JSON string containing metadata
 * @returns Parsed metadata object or empty object if parsing fails
 */
export function parseAppointmentMetadata(metadataJson: string | null | undefined): AppointmentMetadata {
  if (!metadataJson) return {};

  try {
    return JSON.parse(metadataJson);
  } catch (error) {
    logger.warn('Failed to parse appointment metadata', {
      module: 'appointments/metadata-utils',
      context: { error }
    });
    return {};
  }
}
