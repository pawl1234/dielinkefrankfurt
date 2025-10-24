/**
 * Zod validation schemas for FAQ system
 *
 * All validation messages are in German per project requirements.
 */

import { z } from 'zod';

/**
 * FAQ field length constraints
 * These constants should be used across all FAQ-related components and APIs
 * to ensure consistency between validation, UI limits, and database constraints.
 */
export const FAQ_TITLE_MAX_LENGTH = 200;
export const FAQ_CONTENT_MAX_LENGTH = 10000;
export const FAQ_SEARCH_MAX_LENGTH = 100;

/**
 * FAQ status enum schema
 */
export const FaqStatusEnum = z.enum(['ACTIVE', 'ARCHIVED']);

/**
 * Schema for creating a new FAQ entry
 */
export const createFaqSchema = z.object({
  title: z.string()
    .min(1, 'Titel ist erforderlich')
    .max(FAQ_TITLE_MAX_LENGTH, `Titel darf maximal ${FAQ_TITLE_MAX_LENGTH} Zeichen lang sein`)
    .trim(),
  content: z.string()
    .min(1, 'Inhalt ist erforderlich')
    .max(FAQ_CONTENT_MAX_LENGTH, `Inhalt darf maximal ${FAQ_CONTENT_MAX_LENGTH.toLocaleString('de-DE')} Zeichen lang sein`),
  status: FaqStatusEnum.optional().default('ACTIVE')
});

/**
 * Schema for updating an existing FAQ entry (partial update)
 */
export const updateFaqSchema = z.object({
  title: z.string()
    .min(1, 'Titel ist erforderlich')
    .max(FAQ_TITLE_MAX_LENGTH, `Titel darf maximal ${FAQ_TITLE_MAX_LENGTH} Zeichen lang sein`)
    .trim()
    .optional(),
  content: z.string()
    .min(1, 'Inhalt ist erforderlich')
    .max(FAQ_CONTENT_MAX_LENGTH, `Inhalt darf maximal ${FAQ_CONTENT_MAX_LENGTH.toLocaleString('de-DE')} Zeichen lang sein`)
    .optional(),
  status: FaqStatusEnum.optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Mindestens ein Feld muss angegeben werden' }
);

/**
 * Schema for search query validation
 */
export const searchQuerySchema = z.object({
  query: z.string()
    .max(FAQ_SEARCH_MAX_LENGTH, 'Suchbegriff zu lang')
    .optional()
});

/**
 * Type inference from schemas
 */
export type CreateFaqInput = z.infer<typeof createFaqSchema>;
export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
