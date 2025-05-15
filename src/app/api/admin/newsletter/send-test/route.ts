import { NextRequest } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { handleSendTestNewsletter } from '@/lib/newsletter-service';

/**
 * POST /api/admin/newsletter/send-test
 * 
 * Admin endpoint for sending a test newsletter email.
 * Expects HTML content in request body.
 * Returns success status and message ID.
 * Authentication required.
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  return handleSendTestNewsletter(request);
});