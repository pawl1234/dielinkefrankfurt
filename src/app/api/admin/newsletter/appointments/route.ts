import { NextRequest } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { 
  getNewsletterAppointments, 
  updateFeaturedStatus 
} from '@/lib/appointment-handlers';

/**
 * GET /api/admin/newsletter/appointments
 * 
 * Admin endpoint for retrieving appointments formatted for newsletter.
 * Returns accepted appointments with future dates.
 * Authentication required.
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  return getNewsletterAppointments(request);
});

/**
 * PATCH /api/admin/newsletter/appointments
 * 
 * Admin endpoint for toggling featured status of appointments.
 * Authentication required.
 */
export const PATCH = withAdminAuth(async (request: NextRequest) => {
  return updateFeaturedStatus(request);
});