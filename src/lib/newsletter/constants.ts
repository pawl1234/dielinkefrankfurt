/**
 * Centralized constants for newsletter functionality
 * 
 * This file contains all hard-coded values used throughout the newsletter system
 * to ensure consistency and make changes easier to maintain.
 */

/**
 * Newsletter content limits configuration
 * These limits control how much content is included in generated newsletters
 */
export const NEWSLETTER_LIMITS = {
  FEATURED_APPOINTMENTS: {
    MIN: 1,
    MAX: 50,
    DEFAULT: 5
  },
  UPCOMING_APPOINTMENTS: {
    MIN: 1,
    MAX: 100,
    DEFAULT: 20
  },
  STATUS_REPORTS_PER_GROUP: {
    MIN: 1,
    MAX: 10,
    DEFAULT: 3
  },
  GROUPS_WITH_REPORTS: {
    MIN: 1,
    MAX: 50,
    DEFAULT: 10
  }
} as const;

/**
 * Status report limits configuration
 * These limits control the content and title length of status reports
 */
export const STATUS_REPORT_LIMITS = {
  TITLE: {
    MIN: 3,
    MAX: 200,
    DEFAULT: 100
  },
  CONTENT: {
    MIN: 10,
    MAX: 10000,
    DEFAULT: 5000
  }
} as const;

/**
 * Newsletter content limit field names and their corresponding validation rules
 * Used for programmatic validation to avoid repetitive code
 */
export const NEWSLETTER_LIMIT_FIELDS = {
  maxFeaturedAppointments: NEWSLETTER_LIMITS.FEATURED_APPOINTMENTS,
  maxUpcomingAppointments: NEWSLETTER_LIMITS.UPCOMING_APPOINTMENTS,
  maxStatusReportsPerGroup: NEWSLETTER_LIMITS.STATUS_REPORTS_PER_GROUP,
  maxGroupsWithReports: NEWSLETTER_LIMITS.GROUPS_WITH_REPORTS
} as const;

/**
 * Status report limit field names and their corresponding validation rules
 * Used for programmatic validation to avoid repetitive code
 */
export const STATUS_REPORT_LIMIT_FIELDS = {
  statusReportTitleLimit: STATUS_REPORT_LIMITS.TITLE,
  statusReportContentLimit: STATUS_REPORT_LIMITS.CONTENT
} as const;

/**
 * Type for newsletter limit field keys
 */
export type NewsletterLimitField = keyof typeof NEWSLETTER_LIMIT_FIELDS;

/**
 * Newsletter date range constants
 */
export const NEWSLETTER_DATE_RANGES = {
  STATUS_REPORTS_WEEKS_BACK: 2
} as const;