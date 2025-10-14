/**
 * Centralized HTML sanitization utilities
 *
 * This module provides secure HTML sanitization for both INPUT and OUTPUT:
 * - INPUT: Zod validation transforms user input before storage
 * - OUTPUT: Render-time sanitization for defense-in-depth protection
 *
 * Security Principle: NEVER trust any data source, even your own database.
 * Always sanitize at the point of rendering with dangerouslySetInnerHTML.
 */

import sanitizeHtml from 'sanitize-html';

/**
 * Configuration for allowed HTML tags in rich text content
 * These tags are permitted in user-generated content
 */
export const RICH_TEXT_ALLOWED_TAGS = ["b", "strong", "i", "em", "ul", "ol", "li", "a", "p", "br"];

/**
 * Configuration for allowed HTML attributes
 * Only href, target, and rel are allowed on anchor tags
 */
export const RICH_TEXT_ALLOWED_ATTRIBUTES = {
  'a': ['href', 'target', 'rel']
};

/**
 * Sanitize HTML content for storage/display
 * Used in Zod schemas for INPUT validation
 *
 * @param html - HTML content to sanitize
 * @returns Sanitized HTML with only allowed tags and attributes
 */
export function sanitizeRichText(html: string): string {
  if (!html) return '';

  return sanitizeHtml(html, {
    allowedTags: RICH_TEXT_ALLOWED_TAGS,
    allowedAttributes: RICH_TEXT_ALLOWED_ATTRIBUTES
  });
}

/**
 * Strip ALL HTML tags and return plain text
 * SECURE alternative to regex-based stripping (/<[^>]+>/g)
 *
 * Handles:
 * - HTML entity decoding (&lt; becomes <)
 * - Malformed HTML (unclosed tags, nested tags)
 * - Security bypasses (incomplete multi-character patterns)
 *
 * Use cases:
 * - Email plain text content
 * - Preview text extraction
 * - Search indexing
 * - Display in text-only contexts
 *
 * @param html - HTML content to convert to plain text
 * @returns Plain text with HTML entities decoded and all tags removed
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';

  return sanitizeHtml(html, {
    allowedTags: [],        // Strip ALL tags
    allowedAttributes: {},  // Strip ALL attributes
  });
}

/**
 * Extract plain text from HTML with formatting hints
 * Converts structural HTML into readable plain text
 * - <br> → newline
 * - </p> → double newline
 * - <li> → bullet point with newline
 *
 * Use cases:
 * - Email plain text versions
 * - Preview text with basic formatting
 * - Plain text exports
 *
 * @param html - HTML content to convert
 * @returns Formatted plain text with preserved structure
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';

  // First convert structural elements to plain text markers
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')           // <br> → newline
    .replace(/<\/p>/gi, '\n\n')              // </p> → double newline
    .replace(/<li>/gi, '• ')                 // <li> → bullet
    .replace(/<\/li>/gi, '\n');              // </li> → newline

  // Then strip all remaining HTML safely using sanitize-html
  text = stripHtmlTags(text);

  // Normalize whitespace
  text = text
    .replace(/\n{3,}/g, '\n\n')              // Max 2 consecutive newlines
    .replace(/ {2,}/g, ' ')                  // Max 1 space
    .trim();

  return text;
}

/**
 * Prepare HTML for safe rendering with dangerouslySetInnerHTML
 *
 * This is a DEFENSE-IN-DEPTH measure. Even though content is sanitized
 * at input, ALWAYS sanitize at render time to protect against:
 * - Database compromise (attacker modifies DB directly)
 * - Legacy unsanitized data (data from before validation was added)
 * - Input validation bugs (undiscovered bypasses in Zod schemas)
 * - Import/migration errors (batch operations that skip validation)
 * - Admin privilege escalation (admin accounts injecting malicious HTML)
 *
 * @param html - HTML content from database or other source
 * @returns Sanitized HTML safe for dangerouslySetInnerHTML
 *
 * @example
 * ```tsx
 * // ✅ SECURE - Always sanitize at render
 * <div dangerouslySetInnerHTML={{ __html: sanitizeForRender(content) }} />
 *
 * // ❌ DANGEROUS - Never trust database content directly
 * <div dangerouslySetInnerHTML={{ __html: content }} />
 * ```
 */
export function sanitizeForRender(html: string | null | undefined): string {
  if (!html) return '';

  // Re-sanitize with same rules as input validation
  // This ensures defense-in-depth protection
  return sanitizeRichText(html);
}

/**
 * Type-safe wrapper for dangerouslySetInnerHTML
 * Enforces sanitization at compile time
 *
 * This function returns an object compatible with React's dangerouslySetInnerHTML
 * prop, ensuring that HTML is always sanitized before rendering.
 *
 * @param html - HTML content to render
 * @returns Object compatible with dangerouslySetInnerHTML prop
 *
 * @example
 * ```tsx
 * // ✅ Type-safe and secure
 * <div {...createSafeHtml(appointment.mainText)} />
 *
 * // Equivalent to:
 * <div dangerouslySetInnerHTML={{ __html: sanitizeForRender(appointment.mainText) }} />
 * ```
 */
export function createSafeHtml(html: string | null | undefined): { dangerouslySetInnerHTML: { __html: string } } {
  return {
    dangerouslySetInnerHTML: {
      __html: sanitizeForRender(html)
    }
  };
}
