/**
 * Recurring meeting patterns utilities
 * Handles pattern definitions, rrule conversion, and German display text
 */

import { PatternType, Weekday, PatternConfig } from '@/types/form-types';

/**
 * Core weekday labels - SINGLE SOURCE OF TRUTH
 * Maps weekday codes to German labels
 */
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MO: 'Montag',
  TU: 'Dienstag',
  WE: 'Mittwoch',
  TH: 'Donnerstag',
  FR: 'Freitag',
  SA: 'Samstag',
  SU: 'Sonntag'
};

/**
 * Core pattern type labels - SINGLE SOURCE OF TRUTH
 * Maps pattern types to German label templates with {weekday} placeholder
 */
export const PATTERN_TYPE_LABELS: Record<PatternType, string> = {
  'monthly-1st': 'Jeden 1. {weekday} im Monat',
  'monthly-2nd': 'Jeden 2. {weekday} im Monat',
  'monthly-3rd': 'Jeden 3. {weekday} im Monat',
  'monthly-4th': 'Jeden 4. {weekday} im Monat',
  'monthly-last': 'Jeden letzten {weekday} im Monat',
  'weekly': 'Wöchentlich am {weekday}',
  'biweekly': 'Alle zwei Wochen am {weekday}'
};

/**
 * Weekday options for UI dropdowns
 * Automatically derived from WEEKDAY_LABELS
 */
export const WEEKDAY_OPTIONS: Array<{ value: Weekday; label: string }> =
  Object.entries(WEEKDAY_LABELS).map(([value, label]) => ({
    value: value as Weekday,
    label
  }));

/**
 * Pattern type options for UI dropdowns
 * Automatically derived from PATTERN_TYPE_LABELS with {weekday} replaced by [Wochentag]
 */
export const PATTERN_TYPE_OPTIONS: Array<{ value: PatternType; label: string }> =
  Object.entries(PATTERN_TYPE_LABELS).map(([value, label]) => ({
    value: value as PatternType,
    label: label.replace('{weekday}', '[Wochentag]')
  }));

/**
 * Convert PatternConfig to rrule string
 *
 * @param config - Pattern configuration
 * @returns RRule string in RFC 5545 format
 */
export function patternToRRule(config: PatternConfig): string {
  const { type, weekday } = config;

  switch (type) {
    case 'monthly-1st':
      return `FREQ=MONTHLY;BYDAY=1${weekday}`;
    case 'monthly-2nd':
      return `FREQ=MONTHLY;BYDAY=2${weekday}`;
    case 'monthly-3rd':
      return `FREQ=MONTHLY;BYDAY=3${weekday}`;
    case 'monthly-4th':
      return `FREQ=MONTHLY;BYDAY=4${weekday}`;
    case 'monthly-last':
      return `FREQ=MONTHLY;BYDAY=-1${weekday}`;
    case 'weekly':
      return `FREQ=WEEKLY;BYDAY=${weekday}`;
    case 'biweekly':
      return `FREQ=WEEKLY;INTERVAL=2;BYDAY=${weekday}`;
    default:
      throw new Error(`Unbekannter Mustertyp: ${type}`);
  }
}

/**
 * Convert array of PatternConfig to array of rrule strings
 *
 * @param patterns - Array of pattern configurations
 * @returns Array of rrule strings
 */
export function patternsToRRules(patterns: PatternConfig[]): string[] {
  return patterns.map(patternToRRule);
}

/**
 * Parse rrule string back to PatternConfig
 *
 * @param rruleString - RRule string in RFC 5545 format
 * @returns Pattern configuration or null if parsing fails
 */
export function rruleToPattern(rruleString: string): PatternConfig | null {
  const parts = rruleString.split(';');
  const freqPart = parts.find(p => p.startsWith('FREQ='));
  const bydayPart = parts.find(p => p.startsWith('BYDAY='));
  const intervalPart = parts.find(p => p.startsWith('INTERVAL='));

  if (!freqPart || !bydayPart) {
    return null;
  }

  const freq = freqPart.split('=')[1];
  const byday = bydayPart.split('=')[1];

  // Extract weekday (last 2 characters)
  const weekday = byday.slice(-2) as Weekday;

  if (freq === 'MONTHLY') {
    // Extract position (e.g., "1", "2", "3", "4", "-1")
    const position = byday.slice(0, -2);

    if (position === '1') {
      return { type: 'monthly-1st', weekday };
    } else if (position === '2') {
      return { type: 'monthly-2nd', weekday };
    } else if (position === '3') {
      return { type: 'monthly-3rd', weekday };
    } else if (position === '4') {
      return { type: 'monthly-4th', weekday };
    } else if (position === '-1') {
      return { type: 'monthly-last', weekday };
    }
  } else if (freq === 'WEEKLY') {
    const interval = intervalPart ? intervalPart.split('=')[1] : '1';

    if (interval === '2') {
      return { type: 'biweekly', weekday };
    } else {
      return { type: 'weekly', weekday };
    }
  }

  return null;
}

/**
 * Parse array of rrule strings to array of PatternConfig
 *
 * @param rruleStrings - Array of rrule strings
 * @returns Array of pattern configurations (filters out unparseable entries)
 */
export function rrulesToPatterns(rruleStrings: string[]): PatternConfig[] {
  return rruleStrings
    .map(rruleToPattern)
    .filter((pattern): pattern is PatternConfig => pattern !== null);
}

/**
 * Convert single pattern to German display text
 *
 * @param config - Pattern configuration
 * @returns German formatted text
 */
export function patternToText(config: PatternConfig): string {
  const template = PATTERN_TYPE_LABELS[config.type];
  const weekdayLabel = WEEKDAY_LABELS[config.weekday];
  return template.replace('{weekday}', weekdayLabel);
}

/**
 * Convert multiple patterns to combined German display text
 *
 * @param patterns - Array of pattern configurations
 * @param time - Meeting time in HH:mm format
 * @returns German formatted text combining all patterns
 */
export function patternsToText(patterns: PatternConfig[], time?: string): string {
  if (patterns.length === 0) {
    return '';
  }

  // Group patterns by weekday for better formatting
  const weekdayGroups: Record<string, PatternConfig[]> = {};

  patterns.forEach(pattern => {
    const key = pattern.weekday;
    if (!weekdayGroups[key]) {
      weekdayGroups[key] = [];
    }
    weekdayGroups[key].push(pattern);
  });

  // Special case: same weekday with multiple patterns
  const weekdays = Object.keys(weekdayGroups);
  if (weekdays.length === 1 && patterns.length > 1) {
    const weekdayLabel = WEEKDAY_LABELS[patterns[0].weekday];
    const types = patterns.map(p => p.type);

    // Check for common combinations
    if (types.includes('monthly-1st') && types.includes('monthly-3rd') && types.length === 2) {
      const text = `Jeden 1. und 3. ${weekdayLabel} im Monat`;
      return time ? `${text} um ${time} Uhr` : text;
    }
  }

  // Default: list all patterns
  const parts = patterns.map(patternToText);
  const combined = parts.length === 1
    ? parts[0]
    : parts.length === 2
    ? `${parts[0]} und ${parts[1]}`
    : `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]}`;

  return time ? `${combined} um ${time} Uhr` : combined;
}

/**
 * Parse JSON string of rrule array and convert to display text
 *
 * @param jsonString - JSON string of rrule array
 * @param time - Meeting time in HH:mm format
 * @returns German formatted text or empty string if parsing fails
 */
export function rruleJsonToText(jsonString: string | null, time?: string | null): string {
  if (!jsonString) {
    return '';
  }

  try {
    const rruleStrings: string[] = JSON.parse(jsonString);
    if (!Array.isArray(rruleStrings) || rruleStrings.length === 0) {
      return '';
    }

    const patterns = rrulesToPatterns(rruleStrings);
    if (patterns.length === 0) {
      return '';
    }

    return patternsToText(patterns, time || undefined);
  } catch (_error) {
    return '';
  }
}
