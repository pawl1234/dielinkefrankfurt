import { NextRequest } from 'next/server';
import {
  getAppointments,
  updateAppointment,
  deleteAppointment
} from '@/lib/appointments';

/**
 * GET /api/admin/appointments
 * 
 * Admin endpoint for retrieving appointments with optional filtering.
 * Authentication handled by middleware.
 */
export async function GET(request: NextRequest) {
  return getAppointments(request);
}

/**
 * PATCH /api/admin/appointments
 * 
 * Admin endpoint for updating appointments.
 * Handles both JSON and multipart/form-data requests.
 * Authentication handled by middleware.
 */
export async function PATCH(request: NextRequest) {
  return updateAppointment(request);
}

/**
 * DELETE /api/admin/appointments
 * 
 * Admin endpoint for deleting appointments.
 * Authentication handled by middleware.
 */
export async function DELETE(request: NextRequest) {
  return deleteAppointment(request);
}