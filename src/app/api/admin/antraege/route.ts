import { NextRequest } from 'next/server';
import { withAdminAuth } from '@/lib/auth';
import {
  getAntraege,
  updateAntrag,
  deleteAntrag
} from '@/lib/antraege';

/**
 * GET /api/admin/antraege
 * 
 * Admin endpoint for retrieving Anträge with optional filtering.
 * Query parameters:
 * - view: pending|approved|rejected|archived
 * - status: NEW|APPROVED|REJECTED|ARCHIVED
 * - search: search term for title, summary, firstName, lastName
 * - page: page number (default: 1)
 * - pageSize: items per page (default: 10)
 * 
 * Authentication required.
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  return getAntraege(request);
});

/**
 * PATCH /api/admin/antraege
 * 
 * Admin endpoint for updating Anträge.
 * Authentication required.
 */
export const PATCH = withAdminAuth(async (request: NextRequest) => {
  return updateAntrag(request);
});

/**
 * DELETE /api/admin/antraege
 * 
 * Admin endpoint for deleting Anträge.
 * Authentication required.
 */
export const DELETE = withAdminAuth(async (request: NextRequest) => {
  return deleteAntrag(request);
});