import { NextRequest } from 'next/server';
import { withAdminAuth } from '@/lib/auth';
import {
  getAppointments,
  updateAppointment,
  deleteAppointment
} from '@/lib/appointments';

/**
 * GET /api/admin/appointments
 * 
 * Admin endpoint for retrieving appointments with optional filtering.
 * Authentication required.
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  return getAppointments(request);
});

/**
 * PATCH /api/admin/appointments
 * 
 * Admin endpoint for updating appointments.
 * Handles both JSON and multipart/form-data requests.
 * Authentication required.
 */
export const PATCH = withAdminAuth(async (request: NextRequest) => {
  return updateAppointment(request);
});

/**
 * DELETE /api/admin/appointments
 * 
 * Admin endpoint for deleting appointments.
 * Authentication required.
 */
export const DELETE = withAdminAuth(async (request: NextRequest) => {
  return deleteAppointment(request);
});