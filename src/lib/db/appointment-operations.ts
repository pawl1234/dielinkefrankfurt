import prisma from './prisma';
import type { Appointment, Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import { PaginatedResponse } from '@/types/api-types';

/**
 * Finds a single appointment by ID.
 *
 * @param id - Appointment ID
 * @returns Promise resolving to appointment or null if not found
 */
export async function findAppointmentById(id: number): Promise<Appointment | null> {
  try {
    return await prisma.appointment.findUnique({
      where: { id }
    });
  } catch (error) {
    logger.error('Error finding appointment by ID', {
      module: 'db/appointment-operations',
      context: { id, error }
    });
    throw error;
  }
}

/**
 * Finds a single appointment by ID with limited fields.
 *
 * @param id - Appointment ID
 * @param select - Fields to select
 * @returns Promise resolving to partial appointment or null if not found
 */
export async function findAppointmentByIdPartial<T>(
  id: number,
  select: Prisma.AppointmentSelect
): Promise<T | null> {
  try {
    return await prisma.appointment.findUnique({
      where: { id },
      select
    }) as T | null;
  } catch (error) {
    logger.error('Error finding appointment by ID (partial)', {
      module: 'db/appointment-operations',
      context: { id, error }
    });
    throw error;
  }
}

/**
 * Finds appointments with filtering, pagination, and sorting.
 *
 * @param filter - Where clause for filtering appointments
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @param orderBy - Sorting configuration
 * @returns Promise resolving to paginated appointments
 */
export async function findAppointments(
  filter: Prisma.AppointmentWhereInput,
  page: number,
  pageSize: number,
  orderBy: Prisma.AppointmentOrderByWithRelationInput[]
): Promise<PaginatedResponse<Appointment>> {
  try {
    const skip = (page - 1) * pageSize;

    // Get total count for pagination
    const totalItems = await prisma.appointment.count({
      where: filter
    });

    const totalPages = Math.ceil(totalItems / pageSize);

    // Get appointments with filters and pagination
    const appointments = await prisma.appointment.findMany({
      where: filter,
      orderBy,
      skip,
      take: pageSize,
    });

    return {
      items: appointments,
      totalItems,
      page,
      pageSize,
      totalPages
    };
  } catch (error) {
    logger.error('Error finding appointments', {
      module: 'db/appointment-operations',
      context: { error }
    });
    throw error;
  }
}

/**
 * Finds appointments with filtering, pagination, and partial field selection.
 *
 * @param filter - Where clause for filtering appointments
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @param orderBy - Sorting configuration
 * @param select - Fields to select
 * @returns Promise resolving to paginated partial appointments
 */
export async function findAppointmentsPartial<T>(
  filter: Prisma.AppointmentWhereInput,
  page: number,
  pageSize: number,
  orderBy: Prisma.AppointmentOrderByWithRelationInput | Prisma.AppointmentOrderByWithRelationInput[],
  select: Prisma.AppointmentSelect
): Promise<PaginatedResponse<T>> {
  try {
    const skip = (page - 1) * pageSize;

    // Get total count for pagination
    const totalItems = await prisma.appointment.count({
      where: filter
    });

    const totalPages = Math.ceil(totalItems / pageSize);

    // Get appointments with filters and pagination
    const appointments = await prisma.appointment.findMany({
      where: filter,
      orderBy: Array.isArray(orderBy) ? orderBy : [orderBy],
      skip,
      take: pageSize,
      select
    });

    return {
      items: appointments as T[],
      totalItems,
      page,
      pageSize,
      totalPages
    };
  } catch (error) {
    logger.error('Error finding appointments (partial)', {
      module: 'db/appointment-operations',
      context: { error }
    });
    throw error;
  }
}

/**
 * Creates a new appointment.
 *
 * @param data - Appointment creation data
 * @returns Promise resolving to created appointment
 */
export async function createAppointment(
  data: Prisma.AppointmentCreateInput
): Promise<Appointment> {
  try {
    const appointment = await prisma.appointment.create({
      data
    });

    logger.info('Appointment created in database', {
      module: 'db/appointment-operations',
      context: { id: appointment.id }
    });

    return appointment;
  } catch (error) {
    logger.error('Error creating appointment', {
      module: 'db/appointment-operations',
      context: { error }
    });
    throw error;
  }
}

/**
 * Updates an existing appointment.
 *
 * @param id - Appointment ID
 * @param data - Update data
 * @returns Promise resolving to updated appointment
 */
export async function updateAppointmentById(
  id: number,
  data: Prisma.AppointmentUpdateInput
): Promise<Appointment> {
  try {
    const appointment = await prisma.appointment.update({
      where: { id },
      data
    });

    logger.info('Appointment updated in database', {
      module: 'db/appointment-operations',
      context: { id: appointment.id }
    });

    return appointment;
  } catch (error) {
    logger.error('Error updating appointment', {
      module: 'db/appointment-operations',
      context: { id, error }
    });
    throw error;
  }
}

/**
 * Deletes an appointment by ID.
 *
 * @param id - Appointment ID
 * @returns Promise resolving when deletion is complete
 */
export async function deleteAppointmentById(id: number): Promise<void> {
  try {
    await prisma.appointment.delete({
      where: { id }
    });

    logger.info('Appointment deleted from database', {
      module: 'db/appointment-operations',
      context: { id }
    });
  } catch (error) {
    logger.error('Error deleting appointment', {
      module: 'db/appointment-operations',
      context: { id, error }
    });
    throw error;
  }
}

/**
 * Counts appointments matching the filter.
 *
 * @param filter - Where clause for filtering appointments
 * @returns Promise resolving to count
 */
export async function countAppointments(
  filter: Prisma.AppointmentWhereInput
): Promise<number> {
  try {
    return await prisma.appointment.count({
      where: filter
    });
  } catch (error) {
    logger.error('Error counting appointments', {
      module: 'db/appointment-operations',
      context: { error }
    });
    throw error;
  }
}
