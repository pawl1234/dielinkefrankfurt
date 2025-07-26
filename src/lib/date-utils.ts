/**
 * Date formatting utilities for consistent date/time display
 */

import { format } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * Formats a date in German long format (e.g., "Donnerstag, 31. Juli 2025")
 * 
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatLongDate = (date: string | Date): string => {
  return format(new Date(date), 'EEEE, dd. MMMM yyyy', { locale: de });
};

/**
 * Formats a date in German short format (e.g., "31. Juli 2025")
 * 
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatShortDate = (date: string | Date): string => {
  return format(new Date(date), 'PPP', { locale: de });
};

/**
 * Formats time in 24-hour format (e.g., "16:00")
 * 
 * @param date - Date to extract time from
 * @returns Formatted time string
 */
export const formatTime = (date: string | Date): string => {
  return format(new Date(date), 'HH:mm', { locale: de });
};

/**
 * Formats time range (e.g., "16:00 - 18:00 Uhr")
 * 
 * @param startDate - Start date/time
 * @param endDate - Optional end date/time
 * @returns Formatted time range string
 */
export const formatTimeRange = (startDate: string | Date, endDate?: string | Date | null): string => {
  const start = formatTime(startDate);
  if (!endDate) return `${start} Uhr`;
  
  const end = formatTime(endDate);
  return `${start} - ${end} Uhr`;
};