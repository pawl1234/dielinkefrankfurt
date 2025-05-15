import { NextRequest } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { handleGenerateNewsletter } from '@/lib/newsletter-service';

/**
 * GET /api/admin/newsletter
 * 
 * Admin endpoint for generating newsletter HTML with appointments.
 * Accepts introductionText as a query parameter.
 * Returns HTML content.
 * Authentication required.
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  return handleGenerateNewsletter(request);
});