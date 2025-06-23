import { NextRequest, NextResponse } from 'next/server';
import { ApiHandler, SimpleRouteContext } from '@/types/api-types';
import { withAdminAuth } from '@/lib/api-auth';
import { AppError, apiErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import type { Appointment } from '@prisma/client';

interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * GET /api/admin/newsletter/appointments
 * 
 * Admin endpoint for retrieving appointments formatted for newsletter.
 * Returns accepted appointments with future dates, paginated.
 * Authentication required.
 * 
 * Query parameters:
 * - page: number (optional, default: 1) - Page number
 * - pageSize: number (optional, default: 10) - Items per page
 * 
 * Response:
 * - items: Appointment[] - List of appointments
 * - totalItems: number - Total count of appointments
 * - page: number - Current page number
 * - pageSize: number - Items per page
 * - totalPages: number - Total number of pages
 */
export const GET: ApiHandler<SimpleRouteContext> = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const skip = (page - 1) * pageSize;
    
    // Validate pagination parameters
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      logger.warn('Invalid pagination parameters for newsletter appointments', {
        context: { 
          operation: 'get_newsletter_appointments',
          page, 
          pageSize 
        }
      });
      return AppError.validation('Invalid pagination parameters').toResponse();
    }
    
    const filter = {
      status: 'accepted' as const,
      startDateTime: {
        gte: new Date() // Only future events
      }
    };
    
    logger.info('Fetching newsletter appointments', {
      context: { 
        operation: 'get_newsletter_appointments',
        page,
        pageSize
      }
    });
    
    // Get total count for pagination
    const totalItems = await prisma.appointment.count({
      where: filter
    });
    
    const totalPages = Math.ceil(totalItems / pageSize);
    
    // Get all future accepted appointments
    const appointments = await prisma.appointment.findMany({
      where: filter,
      orderBy: {
        startDateTime: 'asc'
      },
      skip,
      take: pageSize,
      select: {
        id: true,
        title: true,
        teaser: true,
        startDateTime: true,
        featured: true
      }
    });
    
    logger.info('Newsletter appointments fetched successfully', {
      context: {
        operation: 'get_newsletter_appointments',
        totalItems,
        page,
        pageSize,
        itemsReturned: appointments.length
      }
    });
    
    // Create paginated response
    const response: PaginatedResponse<Partial<Appointment>> = {
      items: appointments,
      totalItems,
      page,
      pageSize,
      totalPages
    };
    
    // Cache for 2 minutes for newsletter data
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=120, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    logger.error('Error fetching newsletter appointments', {
      context: {
        operation: 'get_newsletter_appointments',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    return apiErrorResponse(error, 'Failed to fetch appointments');
  }
});

/**
 * PATCH /api/admin/newsletter/appointments
 * 
 * Admin endpoint for toggling featured status of appointments.
 * Authentication required.
 * 
 * Request body:
 * - id: number - Appointment ID
 * - featured: boolean - New featured status
 * 
 * Response:
 * - Updated appointment object
 */
export const PATCH: ApiHandler<SimpleRouteContext> = withAdminAuth(async (request: NextRequest) => {
  try {
    const data = await request.json();
    const { id, featured } = data;
    
    if (!id) {
      logger.warn('Appointment featured status update attempted without ID');
      return AppError.validation('Appointment ID is required').toResponse();
    }
    
    if (featured === undefined) {
      logger.warn('Appointment featured status update attempted without featured value', {
        context: { appointmentId: id }
      });
      return AppError.validation('Featured status is required').toResponse();
    }
    
    logger.info('Updating appointment featured status', {
      context: {
        operation: 'update_featured_status',
        appointmentId: id,
        featured
      }
    });
    
    const updatedAppointment = await prisma.appointment.update({
      where: { id: Number(id) },
      data: { featured }
    });
    
    logger.info('Appointment featured status updated successfully', {
      context: {
        operation: 'update_featured_status',
        appointmentId: id,
        featured
      }
    });
    
    return NextResponse.json(updatedAppointment);
  } catch (error) {
    logger.error('Error updating appointment featured status', {
      context: {
        operation: 'update_featured_status',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    
    // Handle database errors specifically
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return AppError.notFound('Appointment not found').toResponse();
    }
    
    return apiErrorResponse(error, 'Failed to update featured status');
  }
});