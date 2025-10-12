/**
 * Meeting calculator for recurring patterns
 * Calculates upcoming meeting dates from rrule strings
 */

import { RRule } from 'rrule';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { CalculatedMeeting } from '@/types/form-types';
import { logger } from '@/lib/logger';

// Set German locale for dayjs
dayjs.locale('de');

/**
 * Group data structure for calculation
 */
interface GroupWithPatterns {
  id: string;
  name: string;
  slug: string;
  recurringPatterns: string | null;
  meetingTime: string | null;
  meetingStreet: string | null;
  meetingCity: string | null;
  meetingPostalCode: string | null;
  meetingLocationDetails: string | null;
}

/**
 * Calculate upcoming meetings for a single group
 *
 * @param group - Group with recurring patterns
 * @param startDate - Start date for calculation range
 * @param endDate - End date for calculation range
 * @returns Array of calculated meetings
 */
export function calculateGroupMeetings(
  group: GroupWithPatterns,
  startDate: Date,
  endDate: Date
): CalculatedMeeting[] {
  // Validate group data
  if (!group.recurringPatterns || !group.meetingTime) {
    return [];
  }

  let rruleStrings: string[];

  try {
    rruleStrings = JSON.parse(group.recurringPatterns);
  } catch (error) {
    logger.error('Failed to parse recurringPatterns JSON', {
      module: 'meeting-calculator',
      context: { groupId: group.id, error }
    });
    return [];
  }

  if (!Array.isArray(rruleStrings) || rruleStrings.length === 0) {
    return [];
  }

  const allOccurrences: Date[] = [];

  // Calculate occurrences for each pattern
  for (const rruleString of rruleStrings) {
    try {
      const rrule = RRule.fromString(rruleString);
      const occurrences = rrule.between(startDate, endDate, true);
      allOccurrences.push(...occurrences);
    } catch (error) {
      logger.error('Failed to parse rrule string', {
        module: 'meeting-calculator',
        context: { groupId: group.id, rruleString, error }
      });
      continue;
    }
  }

  // Remove duplicates and sort
  const uniqueDates = Array.from(new Set(allOccurrences.map(d => d.getTime())))
    .map(timestamp => new Date(timestamp))
    .sort((a, b) => a.getTime() - b.getTime());

  // Convert to CalculatedMeeting objects
  return uniqueDates.map(date => ({
    groupId: group.id,
    groupName: group.name,
    groupSlug: group.slug,
    date,
    time: group.meetingTime!,
    street: group.meetingStreet || undefined,
    city: group.meetingCity || undefined,
    postalCode: group.meetingPostalCode || undefined,
    locationDetails: group.meetingLocationDetails || undefined
  }));
}

/**
 * Calculate upcoming meetings for multiple groups
 *
 * @param groups - Array of groups with recurring patterns
 * @param days - Number of days to look ahead (default: 7)
 * @returns Array of calculated meetings sorted by date
 */
export function calculateUpcomingMeetings(
  groups: GroupWithPatterns[],
  days: number = 7
): CalculatedMeeting[] {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  const allMeetings: CalculatedMeeting[] = [];

  for (const group of groups) {
    const groupMeetings = calculateGroupMeetings(group, startDate, endDate);
    allMeetings.push(...groupMeetings);
  }

  // Sort by date ascending
  return allMeetings.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Format date in German
 *
 * @param date - Date to format
 * @returns German formatted date (e.g., "Montag, 15. Januar 2025")
 */
export function formatDateGerman(date: Date): string {
  return dayjs(date).format('dddd, D. MMMM YYYY');
}

/**
 * Format date as short German string
 *
 * @param date - Date to format
 * @returns Short German formatted date (e.g., "15.01.2025")
 */
export function formatDateShortGerman(date: Date): string {
  return dayjs(date).format('DD.MM.YYYY');
}

/**
 * Format meeting with time in German
 *
 * @param time - Time in HH:mm format
 * @returns Formatted time (e.g., "19:00 Uhr")
 */
export function formatTimeGerman(time: string): string {
  return `${time} Uhr`;
}
