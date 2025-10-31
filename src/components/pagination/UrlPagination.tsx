'use client';

import { useEffect } from 'react';
import { Box, Pagination, PaginationItem } from '@mui/material';
import Link from 'next/link';
import { UrlPaginationProps } from '@/types/component-types';

/**
 * URL-based pagination component for server-rendered pages.
 * Generates pagination links with query parameters for SEO-friendly navigation.
 * Automatically scrolls to target section when page changes.
 *
 * Usage:
 * - Uses Next.js Link component for client-side navigation
 * - Preserves other query parameters in URLs
 * - Supports smooth scrolling to section when hash matches
 * - Hides when totalPages <= 1
 *
 * @param props - UrlPaginationProps
 * @returns Pagination component or null if not needed
 */
export default function UrlPagination({
  currentPage,
  totalPages,
  sectionId,
  queryParamName = 'page',
  preserveParams = {},
  size = 'large',
}: UrlPaginationProps) {
  // Validate currentPage is within bounds
  const validatedPage = Math.max(1, Math.min(currentPage, totalPages));

  // Scroll to section on mount if hash matches
  useEffect(() => {
    if (sectionId) {
      const hash = window.location.hash.replace('#', '');
      if (hash === sectionId) {
        const element = document.getElementById(sectionId);
        if (element) {
          // Small delay to ensure page is rendered
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    }
  }, [sectionId, currentPage]);

  // Hide pagination if not needed (after hooks to follow Rules of Hooks)
  if (totalPages <= 1) {
    return null;
  }

  /**
   * Generates URL for a specific page number.
   * Preserves other query parameters and adds section hash.
   *
   * @param page - Page number to generate URL for
   * @returns URL string with query params and hash
   */
  const generateUrl = (page: number): string => {
    const params = new URLSearchParams();

    // Add page parameter
    params.set(queryParamName, page.toString());

    // Preserve other parameters
    Object.entries(preserveParams).forEach(([key, value]) => {
      params.set(key, value.toString());
    });

    const hash = sectionId ? `#${sectionId}` : '';
    return `/?${params.toString()}${hash}`;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        mt: 4,
        mb: 2,
      }}
    >
      <Pagination
        count={totalPages}
        page={validatedPage}
        size={size}
        color="primary"
        siblingCount={1}
        renderItem={(item) => (
          <PaginationItem
            component={Link}
            href={item.page ? generateUrl(item.page) : '#'}
            {...item}
            aria-label={
              item.type === 'page'
                ? `Gehe zu Seite ${item.page}`
                : item.type === 'previous'
                ? 'Vorherige Seite'
                : item.type === 'next'
                ? 'Nächste Seite'
                : undefined
            }
          />
        )}
        aria-label="Seitennavigation"
      />
    </Box>
  );
}
