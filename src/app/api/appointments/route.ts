import { NextRequest } from 'next/server';
import { getPublicAppointments } from '@/lib/appointment-handlers';

/**
 * GET /api/appointments
 * 
 * Public endpoint for retrieving appointments.
 * Returns only accepted appointments with future dates by default.
 * Can retrieve a specific appointment by ID.
 */
export async function GET(request: NextRequest) {
  return getPublicAppointments(request);
}