import { NextRequest } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { 
  handleGetNewsletterSettings, 
  handleUpdateNewsletterSettings 
} from '@/lib/newsletter-service';

/**
 * GET /api/admin/newsletter/settings
 * 
 * Admin endpoint for retrieving newsletter settings.
 * Returns settings object from database or defaults.
 * Authentication required.
 */
export const GET = withAdminAuth(async () => {
  return handleGetNewsletterSettings();
});

/**
 * PUT /api/admin/newsletter/settings
 * 
 * Admin endpoint for updating newsletter settings.
 * Expects JSON object with newsletter settings.
 * Authentication required.
 */
export const PUT = withAdminAuth(async (request: NextRequest) => {
  return handleUpdateNewsletterSettings(request);
});

/**
 * POST /api/admin/newsletter/settings
 * 
 * For backwards compatibility with the original API.
 * Authentication required.
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  return handleUpdateNewsletterSettings(request);
});