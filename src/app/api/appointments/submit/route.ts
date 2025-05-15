import { NextRequest } from 'next/server';
import { createAppointment } from '@/lib/appointment-handlers';

/**
 * POST /api/appointments/submit
 * 
 * Public endpoint for submitting new appointments.
 * Accepts form data with appointment details and optional file uploads.
 */
export async function POST(request: NextRequest) {
  return createAppointment(request);
}