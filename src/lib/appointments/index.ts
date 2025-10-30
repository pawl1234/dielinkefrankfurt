/**
 * Appointments domain barrel export
 *
 * Provides unified access to all appointment-related functionality:
 * - Query operations (read/fetch)
 * - Mutation operations (create/update/delete)
 * - Metadata utilities and parsing
 * - Slug generation for SEO-friendly URLs
 * - Open Graph metadata building for rich link previews
 */

export * from './appointment-queries';
export * from './appointment-mutations';
export * from './metadata-utils';
export * from './slug-generator';
export * from './metadata-builder';
