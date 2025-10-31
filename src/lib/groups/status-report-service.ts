import { StatusReport, StatusReportStatus, Group, Prisma } from '@prisma/client';
import { validationMessages } from '@/lib/validation/validation-messages';
import { logger } from '@/lib/logger';
import {
  sendStatusReportAcceptanceEmail,
  sendStatusReportRejectionEmail,
  sendStatusReportArchivingEmail
} from '@/lib/email';
import * as statusReportOps from '@/lib/db/status-report-operations';
import * as groupOps from '@/lib/db/group-operations';
import { PaginatedResponse } from '@/types/api-types';

/**
 * Types for status report operations
 */
export interface StatusReportCreateData {
  groupId: string;    // Pre-validated: valid UUID, group must exist
  title: string;      // Pre-validated: 3-200 chars, required
  content: string;    // Pre-validated: 10-10000 chars, required
  reporterFirstName: string; // Pre-validated: 2-50 chars, required
  reporterLastName: string;  // Pre-validated: 2-50 chars, required
  fileUrls?: string[]; // Pre-validated: valid URLs (when provided)
}

export interface StatusReportUpdateData {
  id: string;         // Pre-validated: valid UUID format, required
  title?: string;     // Pre-validated: 3-200 chars (when provided)
  content?: string;   // Pre-validated: 10-10000 chars (when provided)
  reporterFirstName?: string; // Pre-validated: 2-50 chars (when provided)
  reporterLastName?: string;  // Pre-validated: 2-50 chars (when provided)
  status?: StatusReportStatus; // Pre-validated: valid enum value (when provided)
  fileUrls?: string[]; // Pre-validated: valid URLs (when provided)
  groupId?: string;   // Pre-validated: valid UUID, group must exist (when provided)
}

/**
 * Creates a new status report for an active group with validated data.
 *
 * @param data Pre-validated status report creation data from Zod schema validation at API route level
 * @returns Promise resolving to created status report with NEW status
 * @throws Error Only for business logic failures (database operations, group validation, file handling)
 *
 * Note: Input validation is handled at API route level using Zod schemas.
 * This function assumes all field validation has already passed.
 * Verifies group exists and is active before creating report.
 */
export async function createStatusReport(data: StatusReportCreateData): Promise<StatusReport> {
  try {
    // Check if the group exists and is active
    const group = await groupOps.findGroupById(data.groupId);

    if (!group || group.status !== 'ACTIVE') {
      throw new Error(validationMessages.resourceNotFound('group') + ' oder nicht aktiv');
    }

    // Create the status report
    const statusReport = await statusReportOps.createStatusReport({
      title: data.title,
      content: data.content,
      reporterFirstName: data.reporterFirstName,
      reporterLastName: data.reporterLastName,
      fileUrls: data.fileUrls && data.fileUrls.length > 0 ? JSON.stringify(data.fileUrls) : null,
      status: 'NEW' as StatusReportStatus,
      groupId: data.groupId
    });

    return statusReport;
  } catch (error) {
    logger.error('Error creating status report', { context: { error } });
    throw error;
  }
}

/**
 * Fetches status reports with comprehensive filtering, searching, and pagination.
 *
 * @param status Optional status filter ('ALL' for no filter)
 * @param groupId Optional group ID filter
 * @param searchTerm Optional search term for title/content
 * @param orderBy Field to sort by ('title' or 'createdAt')
 * @param orderDirection Sort direction ('asc' or 'desc')
 * @param page Page number for pagination (1-based)
 * @param pageSize Number of items per page
 * @returns Promise resolving to paginated status report results with group data
 * @throws Error Only for database operation failures
 *
 * Note: Optimized query with selective field inclusion for group data.
 * Designed for admin dashboard with comprehensive filtering capabilities.
 */
export async function getStatusReports(
  status?: StatusReportStatus | 'ALL',
  groupId?: string,
  searchTerm?: string,
  orderBy: 'title' | 'createdAt' = 'createdAt',
  orderDirection: 'asc' | 'desc' = 'desc',
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<StatusReport>> {
  try {
    // Build where clause based on filters
    const where: Prisma.StatusReportWhereInput = {};

    // Filter by status if provided
    if (status && status !== 'ALL') {
      where.status = status;
    }

    // Filter by group if provided
    if (groupId) {
      where.groupId = groupId;
    }

    // Filter by search term if provided
    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { content: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Calculate pagination values
    const skip = (page - 1) * pageSize;

    // Fetch status reports with filtering and pagination
    const { statusReports, totalItems } = await statusReportOps.findStatusReportsWithPagination({
      where,
      orderBy: {
        [orderBy]: orderDirection
      },
      skip,
      take: pageSize
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      items: statusReports,
      totalItems,
      page,
      pageSize,
      totalPages
    };
  } catch (error) {
    logger.error('Error fetching status reports', { context: { error } });
    throw error;
  }
}

/**
 * Retrieves a single status report by ID with associated group data.
 *
 * @param id Status report UUID to fetch
 * @returns Promise resolving to status report with group data, or null if not found
 * @throws Error Only for database operation failures
 *
 * Note: Includes complete group information for admin operations
 * and status report management workflows.
 */
export async function getStatusReportById(id: string): Promise<StatusReport | null> {
  try {
    const statusReport = await statusReportOps.findStatusReportById(id);
    return statusReport;
  } catch (error) {
    logger.error(`Error fetching status report with ID ${id}`, { context: { error } });
    throw error;
  }
}

/**
 * Retrieves all active status reports for a group identified by slug.
 *
 * @param slug Group slug identifier (assumed pre-validated)
 * @returns Promise resolving to array of active status reports sorted chronologically
 * @throws Error Only for database operation failures or group not found
 *
 * Note: Public-facing function that only returns ACTIVE status reports
 * for display on group detail pages. Validates group exists before querying reports.
 */
export async function getStatusReportsByGroupSlug(slug: string): Promise<StatusReport[]> {
  try {
    const group = await groupOps.findGroupBySlug(slug);

    if (!group) {
      throw new Error(`Group with slug ${slug} not found`);
    }

    const statusReports = await statusReportOps.findActiveStatusReportsByGroupId(group.id);
    return statusReports;
  } catch (error) {
    logger.error(`Error fetching status reports for group ${slug}`, { context: { error } });
    throw error;
  }
}

/**
 * Updates status report status and triggers appropriate email notifications.
 *
 * @param id Pre-validated status report UUID from API route level validation
 * @param status Pre-validated status enum value from API route level validation
 * @returns Promise resolving to updated status report with group and responsible persons
 * @throws Error Only for business logic failures (database operations, email service failures)
 *
 * Note: Input validation is handled at API route level using parameter validation.
 * This function assumes all field validation has already passed.
 * Automatically sends notification emails based on status change, email failures don't block updates.
 */
export async function updateStatusReportStatus(id: string, status: StatusReportStatus): Promise<StatusReport> {
  try {
    const statusReport = await statusReportOps.updateStatusReportStatus(id, status);

    // Try to send notification emails but don't let failures block the status update
    try {
      // If status changed to ACTIVE, send notification email
      if (status === 'ACTIVE') {
        await sendStatusReportAcceptanceEmail(statusReport);
      }

      // If status changed to REJECTED, send notification email
      if (status === 'REJECTED') {
        await sendStatusReportRejectionEmail(statusReport);
      }

      // If status changed to ARCHIVED, send notification email
      if (status === 'ARCHIVED') {
        await sendStatusReportArchivingEmail(statusReport);
      }
    } catch (emailError) {
      // Log the error but don't fail the status update
      logger.error(`Error sending notification email for status report ${id}`, { context: { emailError } });
    }

    return statusReport;
  } catch (error) {
    logger.error(`Error updating status for status report ${id}`, { context: { error } });
    throw error;
  }
}

/**
 * Updates an existing status report with validated data and handles email notifications.
 *
 * @param data Pre-validated status report update data from Zod schema validation at API route level
 * @returns Promise resolving to updated status report with notification handling
 * @throws Error Only for business logic failures (database operations, status validation, email service failures)
 *
 * Note: Input validation is handled at API route level using Zod schemas.
 * This function assumes all field validation has already passed.
 * Handles status change notifications and business rule validation.
 */
export async function updateStatusReport(data: StatusReportUpdateData): Promise<StatusReport> {
  try {
    // Get current status report to check for status changes
    const currentReport = await statusReportOps.findStatusReportById(data.id);

    if (!currentReport) {
      throw new Error(validationMessages.resourceNotFound('statusReport', data.id));
    }

    // Validate status if provided
    if (data.status) {
      const validStatuses = ['NEW', 'ACTIVE', 'ARCHIVED', 'REJECTED'];
      if (!validStatuses.includes(data.status)) {
        throw new Error(validationMessages.invalidStatus('status', validStatuses));
      }
    }

    // If status is being changed to ACTIVE, validate that the group is active
    if (data.status === 'ACTIVE' && currentReport.group && currentReport.group.status !== 'ACTIVE' && currentReport.group.status !== 'ARCHIVED') {
      throw new Error('Gruppe ist nicht aktiv');
    }

    // Prepare update data
    const updateData: Prisma.StatusReportUpdateInput = {};

    if (data.title) updateData.title = data.title;
    if (data.content) updateData.content = data.content;
    if (data.reporterFirstName) updateData.reporterFirstName = data.reporterFirstName;
    if (data.reporterLastName) updateData.reporterLastName = data.reporterLastName;
    if (data.status) updateData.status = data.status;

    if (data.fileUrls !== undefined) {
      updateData.fileUrls = data.fileUrls.length > 0 ? JSON.stringify(data.fileUrls) : null;
    }

    if (data.groupId) {
      updateData.group = {
        connect: { id: data.groupId }
      };
    }

    // Update the status report
    const statusReport = await statusReportOps.updateStatusReport(data.id, updateData);

    // If status changed, handle notifications
    if (data.status && data.status !== currentReport.status) {
      try {
        if (data.status === 'ACTIVE') {
          await sendStatusReportAcceptanceEmail(statusReport);
        } else if (data.status === 'REJECTED') {
          await sendStatusReportRejectionEmail(statusReport);
        } else if (data.status === 'ARCHIVED') {
          await sendStatusReportArchivingEmail(statusReport);
        }
      } catch (emailError) {
        logger.error(`Error sending notification email for status report ${data.id}`, { context: { emailError } });
        // Continue without failing the update
      }
    }

    return statusReport;
  } catch (error) {
    logger.error(`Error updating status report ${data.id}`, { context: { error } });
    throw error;
  }
}

/**
 * Deletes a status report and associated files from blob storage.
 *
 * @param id Status report UUID to delete (assumed pre-validated)
 * @returns Promise resolving to true on successful deletion
 * @throws Error Only for database operation failures
 *
 * Note: Handles complete cleanup including:
 * - All attached files from blob storage
 * - Status report database record
 * File deletion failures do not prevent database cleanup.
 * Uses file-cleanup service for blob storage operations.
 */
export async function deleteStatusReport(id: string): Promise<boolean> {
  // This function will use the file-cleanup service
  // Importing here to avoid circular dependency
  const { deleteStatusReportFiles } = await import('./file-cleanup');

  try {
    const statusReport = await statusReportOps.findStatusReportById(id);

    if (!statusReport) {
      throw new Error(validationMessages.resourceNotFound('statusReport', id));
    }

    // Delete files from blob storage
    await deleteStatusReportFiles(id);

    // Delete the status report
    await statusReportOps.deleteStatusReport(id);

    return true;
  } catch (error) {
    logger.error(`Error deleting status report ${id}`, { context: { error } });
    throw error;
  }
}

/**
 * Retrieves recent active status reports for newsletter generation.
 *
 * @returns Promise resolving to status reports from last 2 weeks with group data
 * @throws Error Only for business logic failures (database operations, date filtering issues)
 *
 * Note: No input validation required as this function uses no external parameters.
 * Filters for ACTIVE status reports created within 14 days for newsletter inclusion.
 * Results are grouped by group name and sorted chronologically for presentation.
 */
export async function getRecentStatusReportsForNewsletter(): Promise<(StatusReport & { group: Group })[]> {
  try {
    // Get reports from the last 2 weeks
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const reports = await statusReportOps.findRecentActiveStatusReports(twoWeeksAgo);
    return reports;
  } catch (error) {
    logger.error('Error fetching recent status reports for newsletter', { context: { error } });
    throw error;
  }
}
