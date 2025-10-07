import { NextRequest, NextResponse } from 'next/server';
import type { Appointment, Prisma } from '@prisma/client';
import { serverErrorResponse } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  findAppointmentById,
  findAppointments,
  findAppointmentsPartial,
  type PaginatedResponse
} from '@/lib/db/appointment-operations';

/**
 * Retrieves appointments with filtering, pagination, and proper caching headers.
 *
 * @param request - Pre-validated NextRequest with query parameters from API route level
 * @returns Promise resolving to NextResponse with paginated appointment data
 * @throws Error Only for business logic failures (database operations, query processing, caching failures)
 *
 * Note: Query parameter validation is handled at API route level.
 * This function assumes all parameter validation has already passed.
 * Handles different view modes, status filtering, and optimized database queries with caching.
 */
export async function getAppointments(request: NextRequest) {
  try {
    // Get query parameters for filtering
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'all';
    const status = url.searchParams.get('status');
    const id = url.searchParams.get('id');

    // Pagination parameters
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);

    // If ID is provided, return a single appointment
    if (id) {
      const appointment = await findAppointmentById(parseInt(id));

      if (!appointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(appointment, {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=30'
        }
      });
    }

    // Build filter based on parameters
    const filter: Prisma.AppointmentWhereInput = {};
    const currentDate = new Date();

    // View-based filtering
    if (view === 'pending') {
      filter.status = 'pending';
    } else if (view === 'upcoming') {
      filter.status = 'accepted';
      filter.startDateTime = { gte: currentDate };
    } else if (view === 'archive') {
      // For archive view, get past appointments (both accepted and rejected)
      filter.OR = [
        { status: 'accepted', startDateTime: { lt: currentDate } },
        { status: 'rejected' }
      ];
    }

    // Override with specific status if provided
    if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
      // Remove any existing status filters
      if (filter.OR) {
        delete filter.OR;
      }
      filter.status = status;
    }

    // Build order by clause
    const orderBy: Prisma.AppointmentOrderByWithRelationInput[] = [
      // For upcoming events, sort by date ascending
      ...(view === 'upcoming' ? [{ startDateTime: 'asc' as const }] : []),
      // For all other views, newest first
      { createdAt: 'desc' as const }
    ];

    // Get appointments with filters and pagination
    const response = await findAppointments(filter, page, pageSize, orderBy);

    // Set cache headers (1 minute for admin data)
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=30'
      }
    });
  } catch (error) {
    logger.error('Error fetching appointments', {
      module: 'appointments/appointment-queries',
      context: { error }
    });
    return serverErrorResponse('Failed to fetch appointments');
  }
}

/**
 * Retrieves public appointments (accepted status only) with caching optimization.
 *
 * @param request - Pre-validated NextRequest with query parameters from API route level
 * @returns Promise resolving to NextResponse with public appointment data
 * @throws Error Only for business logic failures (database operations, caching issues, query processing)
 *
 * Note: Query parameter validation is handled at API route level.
 * This function assumes all parameter validation has already passed.
 * Only returns accepted appointments for public consumption with optimized caching headers.
 */
export async function getPublicAppointments(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    // Pagination parameters
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);

    // If ID is provided, return a single appointment
    if (id) {
      const appointment = await findAppointmentById(parseInt(id));

      if (!appointment || appointment.status !== 'accepted') {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }

      // Cache for longer time (5 minutes) for public data
      return NextResponse.json(appointment, {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
        }
      });
    }

    // Otherwise, return filtered appointments
    const currentDate = new Date();
    const filter = {
      status: 'accepted',
      startDateTime: {
        gte: currentDate // Only future appointments
      }
    };

    const select = {
      id: true,
      title: true,
      mainText: true,
      startDateTime: true,
      endDateTime: true,
      street: true,
      city: true,
      locationDetails: true,
      postalCode: true,
      featured: true
    };

    const response = await findAppointmentsPartial<Partial<Appointment>>(
      filter,
      page,
      pageSize,
      { startDateTime: 'asc' },
      select
    );

    // Cache for longer time (5 minutes) for public data
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    logger.error('Error fetching public appointments', {
      module: 'appointments/appointment-queries',
      context: { error }
    });
    return serverErrorResponse('Failed to fetch appointments');
  }
}

/**
 * Retrieves newsletter-ready appointments (accepted and future date) with pagination.
 *
 * @param request - Pre-validated NextRequest with query parameters from API route level
 * @returns Promise resolving to NextResponse with paginated newsletter appointment data
 * @throws Error Only for business logic failures (database operations, query processing, date filtering)
 *
 * Note: Query parameter validation is handled at API route level.
 * This function assumes all parameter validation has already passed.
 * Returns only future accepted appointments with minimal fields optimized for newsletter inclusion.
 */
export async function getNewsletterAppointments(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // Pagination parameters
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);

    const filter = {
      status: 'accepted',
      startDateTime: {
        gte: new Date() // Only future events
      }
    };

    const select = {
      id: true,
      title: true,
      startDateTime: true,
      featured: true
    };

    const response = await findAppointmentsPartial<Partial<Appointment>>(
      filter,
      page,
      pageSize,
      { startDateTime: 'asc' },
      select
    );

    // Cache for 2 minutes for newsletter data
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=120, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    logger.error('Error fetching newsletter appointments', {
      module: 'appointments/appointment-queries',
      context: { error }
    });
    return serverErrorResponse('Failed to fetch appointments');
  }
}

// Re-export types for backward compatibility
export type { PaginatedResponse };
