/**
 * SafeHtml Component
 *
 * Type-safe wrapper for rendering sanitized HTML content.
 * Automatically sanitizes HTML at render time for defense-in-depth protection.
 *
 * SECURITY NOTE:
 * This component always sanitizes HTML before rendering, even if the content
 * was sanitized at input. This protects against:
 * - Database compromise
 * - Legacy unsanitized data
 * - Input validation bugs
 * - Import/migration errors
 */

import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { createSafeHtml } from '@/lib/sanitization/sanitize';

interface SafeHtmlProps extends Omit<BoxProps, 'dangerouslySetInnerHTML'> {
  /**
   * HTML content to render (will be sanitized automatically)
   */
  html: string | null | undefined;
}

/**
 * Renders sanitized HTML content safely
 *
 * Renders as a <div> by default. Use the `sx` prop for styling.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SafeHtml html={appointment.mainText} />
 *
 * // With custom styling
 * <SafeHtml
 *   html={group.description}
 *   sx={{ fontSize: '1.2rem', color: 'text.secondary', lineHeight: 1.7 }}
 * />
 *
 * // With custom className
 * <SafeHtml
 *   html={report.content}
 *   className="custom-class"
 * />
 * ```
 */
export function SafeHtml({ html, ...boxProps }: SafeHtmlProps) {
  return (
    <Box
      {...boxProps}
      {...createSafeHtml(html)}
    />
  );
}

export default SafeHtml;
