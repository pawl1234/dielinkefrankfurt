import prisma from './prisma';
import { Group, GroupStatus, ResponsiblePerson, StatusReport, StatusReportStatus, Prisma } from '@prisma/client';
import { del } from '@vercel/blob';
import slugify from 'slugify';
import {
  sendStatusReportAcceptanceEmail,
  sendStatusReportRejectionEmail,
  sendStatusReportArchivingEmail,
  sendGroupAcceptanceEmail,
  sendGroupRejectionEmail,
  sendGroupArchivingEmail
} from './email-senders';
import { validationMessages } from '@/lib/validation-messages';
import { logger } from './logger';

/**
 * Types for group operations
 */
export interface GroupCreateData {
  name: string;        // Pre-validated: 3-100 chars, required
  description: string; // Pre-validated: 50-5000 chars, required
  logoUrl?: string;    // Pre-validated: valid URL format (optional)
  responsiblePersons: ResponsiblePersonCreateData[]; // Pre-validated: 1-5 persons, all fields validated
}

export interface ResponsiblePersonCreateData {
  firstName: string;  // Pre-validated: 2-50 chars, required
  lastName: string;   // Pre-validated: 2-50 chars, required
  email: string;      // Pre-validated: valid email format, required
}

export interface GroupUpdateData {
  id: string;         // Pre-validated: valid UUID format, required
  name?: string;      // Pre-validated: 3-100 chars (when provided)
  description?: string; // Pre-validated: 50-5000 chars (when provided)
  logoUrl?: string | null; // Pre-validated: valid URL format (when provided), null to remove
  status?: GroupStatus; // Pre-validated: valid enum value (when provided)
  responsiblePersons?: ResponsiblePersonCreateData[]; // Pre-validated: 1-5 persons, all fields validated (when provided)
}

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
 * Creates a unique slug from a group name with timestamp suffix for URL safety.
 *
 * @param name Pre-validated group name from Zod schema validation at API route level
 * @returns Promise resolving to unique slug string with timestamp suffix for uniqueness
 * @throws Error Only for business logic failures (slug generation, timestamp issues)
 *
 * Note: Input validation is handled at API route level using Zod schemas.
 * This function assumes all field validation has already passed.
 * Uses slugify library to create URL-safe slug, adds timestamp for uniqueness.
 */
export function createGroupSlug(name: string): string {
  // Generate a basic slug
  const baseSlug = slugify(name, {
    lower: true,
    strict: true,
    remove: /[*+~.()"!:@]/g
  });
  
  // Add a timestamp with microseconds to make it unique
  const now = Date.now();
  const microseconds = Math.floor(Math.random() * 10000);
  const timestamp = (now + microseconds).toString().slice(-4);
  return `${baseSlug}-${timestamp}`;
}

/**
 * Creates a new group with validated data and responsible persons.
 *
 * @param data Pre-validated group creation data from Zod schema validation at API route level
 * @returns Promise resolving to created group with generated slug and metadata
 * @throws Error Only for business logic failures (database operations, slug generation, transaction failures)
 *
 * Note: Input validation is handled at API route level using Zod schemas.
 * This function assumes all field validation has already passed.
 * Handles database transactions, slug generation, and metadata serialization.
 */
export async function createGroup(data: GroupCreateData): Promise<Group> {
  const slug = createGroupSlug(data.name);

  try {
    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.group.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          logoUrl: data.logoUrl || null,
          status: 'NEW' as GroupStatus,
        }
      });

      for (const person of data.responsiblePersons) {
        await tx.responsiblePerson.create({
          data: {
            firstName: person.firstName.trim(),
            lastName: person.lastName.trim(),
            email: person.email.trim(),
            groupId: newGroup.id
          }
        });
      }

      return newGroup;
    });

    return group;
  } catch (error) {
    logger.error('Error creating group', { context: { error } });
    throw error;
  }
}

/**
 * Generic pagination response wrapper for filtered results.
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetches groups with comprehensive filtering, searching, and pagination.
 *
 * @param status Optional status filter ('ALL' for no filter)
 * @param searchTerm Optional search term for name/description
 * @param orderBy Field to sort by ('name' or 'createdAt')
 * @param orderDirection Sort direction ('asc' or 'desc')
 * @param page Page number for pagination (1-based)
 * @param pageSize Number of items per page
 * @returns Promise resolving to paginated group results with counts and responsible persons
 * @throws Error Only for database operation failures
 *
 * Note: Optimized query with selective field inclusion and count aggregation.
 * Includes responsible persons data but excludes full status reports for performance.
 */
export async function getGroups(
  status?: GroupStatus | 'ALL',
  searchTerm?: string,
  orderBy: 'name' | 'createdAt' = 'name',
  orderDirection: 'asc' | 'desc' = 'asc',
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<Group>> {
  try {
    // Build where clause based on filters
    const where: Prisma.GroupWhereInput = {};
    
    // Filter by status if provided
    if (status && status !== 'ALL') {
      where.status = status;
    }
    
    // Filter by search term if provided
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }
    
    // Calculate pagination values
    const skip = (page - 1) * pageSize;
    
    // Optimize query by selecting only needed fields for count
    const totalItems = await prisma.group.count({ where });
    
    // Fetch groups with filtering and pagination
    // Only include necessary fields for listing to reduce data transfer
    const groups = await prisma.group.findMany({
      where,
      orderBy: {
        [orderBy]: orderDirection
      },
      // Only include responsiblePersons when needed
      include: {
        // Count status reports instead of fetching them all
        _count: {
          select: {
            statusReports: true
          }
        },
        // Include responsiblePersons but only essential fields
        responsiblePersons: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      skip,
      take: pageSize
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalItems / pageSize);
    
    return {
      items: groups,
      totalItems,
      page,
      pageSize,
      totalPages
    };
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw error;
  }
}

/**
 * Retrieves a single group by ID with complete related data.
 *
 * @param id Group UUID to fetch
 * @returns Promise resolving to group with responsible persons and active status reports, or null if not found
 * @throws Error Only for database operation failures
 *
 * Note: Includes responsible persons and only ACTIVE status reports,
 * sorted by creation date descending for display purposes.
 */
export async function getGroupById(id: string): Promise<(Group & { responsiblePersons: ResponsiblePerson[]; statusReports: StatusReport[] }) | null> {
  try {
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        responsiblePersons: true,
        statusReports: {
          where: { status: 'ACTIVE' as StatusReportStatus },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    return group;
  } catch (error) {
    console.error(`Error fetching group with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Retrieves a single group by slug for public display.
 *
 * @param slug Unique group slug identifier
 * @returns Promise resolving to group with active status reports, or null if not found
 * @throws Error Only for database operation failures
 *
 * Note: Public-facing function that only includes ACTIVE status reports
 * sorted by creation date for chronological display.
 */
export async function getGroupBySlug(slug: string): Promise<(Group & { statusReports: StatusReport[] }) | null> {
  try {
    const group = await prisma.group.findUnique({
      where: { slug },
      include: {
        statusReports: {
          where: { status: 'ACTIVE' as StatusReportStatus },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    return group;
  } catch (error) {
    console.error(`Error fetching group with slug ${slug}:`, error);
    throw error;
  }
}

/**
 * Retrieves all public (ACTIVE status) groups with optional pagination.
 *
 * @param page Optional page number for pagination (1-based)
 * @param pageSize Optional number of items per page
 * @returns Promise resolving to either paginated response (if pagination requested) or array of all groups
 * @throws Error Only for database operation failures
 *
 * Note: Public API function that only returns ACTIVE groups.
 * Uses selective field projection to minimize data transfer.
 * Returns different types based on pagination parameters for flexibility.
 */
export async function getPublicGroups(page?: number, pageSize?: number): Promise<PaginatedResponse<Group> | Group[]> {
  try {
    // Base query conditions
    const where = { status: 'ACTIVE' as GroupStatus };
    
    // If pagination is requested
    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      
      // Get total count for pagination
      const totalItems = await prisma.group.count({ where });
      
      // Fetch groups with pagination
      const groups = await prisma.group.findMany({
        where,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          createdAt: true,
          status: true,
          metadata: true,
          updatedAt: true
        },
        skip,
        take: pageSize
      });
      
      // Calculate total pages
      const totalPages = Math.ceil(totalItems / pageSize);
      
      return {
        items: groups,
        totalItems,
        page,
        pageSize,
        totalPages
      };
    } else {
      // When pagination is not requested, return all active groups
      const groups = await prisma.group.findMany({
        where,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          createdAt: true,
          status: true,
          metadata: true,
          updatedAt: true
        }
      });
      
      return groups;
    }
  } catch (error) {
    console.error('Error fetching public groups:', error);
    throw error;
  }
}

/**
 * Updates group status and triggers appropriate email notifications.
 *
 * @param id Pre-validated group UUID from API route level validation
 * @param status Pre-validated group status enum value from API route level validation
 * @returns Promise resolving to updated group with responsible persons
 * @throws Error Only for business logic failures (database operations, email service failures)
 *
 * Note: Input validation is handled at API route level using parameter validation.
 * This function assumes all field validation has already passed.
 * Automatically sends notification emails based on status change, email failures don't block updates.
 */
export async function updateGroupStatus(id: string, status: GroupStatus): Promise<Group> {
  try {
    const group = await prisma.group.update({
      where: { id },
      data: { status },
      include: { responsiblePersons: true }
    });
    
    // Try to send notification emails but don't let failures block the status update
    try {
      // If status changed to ACTIVE, send notification email
      if (status === 'ACTIVE') {
        await sendGroupAcceptanceEmail(group);
      }
      
      // If status changed to REJECTED, send notification email
      if (String(status) === 'REJECTED') {
        await sendGroupRejectionEmail(group);
      }
      
      // If status changed to ARCHIVED, send notification email
      if (status === 'ARCHIVED') {
        await sendGroupArchivingEmail(group);
      }
    } catch (emailError) {
      // Log the error but don't fail the status update
      console.error(`Error sending notification email for group ${id}:`, emailError);
    }
    
    return group;
  } catch (error) {
    console.error(`Error updating status for group ${id}:`, error);
    throw error;
  }
}

/**
 * Updates an existing group with validated data and handles responsible persons changes.
 *
 * @param data Pre-validated group update data from Zod schema validation at API route level
 * @returns Promise resolving to updated group with new data and relationships
 * @throws Error Only for business logic failures (database operations, group not found, transaction failures)
 *
 * Note: Input validation is handled at API route level using Zod schemas.
 * This function assumes all field validation has already passed.
 * Handles slug regeneration when name changes and responsible person updates via transaction.
 */
export async function updateGroup(data: GroupUpdateData): Promise<Group> {
  try {
    // Get the current group to check what needs to be updated
    const currentGroup = await prisma.group.findUnique({
      where: { id: data.id },
      include: { responsiblePersons: true }
    });
    
    if (!currentGroup) {
      throw new Error(`Group with ID ${data.id} not found`);
    }
    
    // Prepare update data
    const updateData: Prisma.GroupUpdateInput = {};
    
    if (data.name) updateData.name = data.name;
    if (data.description) updateData.description = data.description;

    if (data.logoUrl !== undefined) {
      updateData.logoUrl = data.logoUrl;
    }

    if (data.status) updateData.status = data.status;
    
    // If name is changing, generate a new slug
    if (data.name && data.name !== currentGroup.name) {
      updateData.slug = createGroupSlug(data.name);
    }
    
    // Use a transaction to handle group update and responsible persons changes
    const updatedGroup = await prisma.$transaction(async (tx) => {
      // Update the group
      await tx.group.update({
        where: { id: data.id },
        data: updateData
      });
      
      // Handle responsible persons if they are provided
      if (data.responsiblePersons) {
        // Delete existing responsible persons
        await tx.responsiblePerson.deleteMany({
          where: { groupId: data.id }
        });
        
        // Create new responsible persons
        for (const person of data.responsiblePersons) {
          await tx.responsiblePerson.create({
            data: {
              firstName: person.firstName,
              lastName: person.lastName,
              email: person.email,
              groupId: data.id
            }
          });
        }
      }
      
      // Return the updated group with related data
      return tx.group.findUnique({
        where: { id: data.id },
        include: { responsiblePersons: true }
      });
    });
    
    if (!updatedGroup) {
      throw new Error(`Failed to update group ${data.id}`);
    }
    
    return updatedGroup;
  } catch (error) {
    console.error(`Error updating group ${data.id}:`, error);
    throw error;
  }
}

/**
 * Deletes a group and all associated data including files from blob storage.
 *
 * @param id Pre-validated group UUID from API route level validation
 * @returns Promise resolving to true on successful deletion
 * @throws Error Only for business logic failures (database operations, file storage cleanup failures)
 *
 * Note: Input validation is handled at API route level using parameter validation.
 * This function assumes all field validation has already passed.
 * Handles complete cleanup including logos, status report files, and database cascade deletion.
 */
export async function deleteGroup(id: string): Promise<boolean> {
  try {
    // Get the group to check for files to delete
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        statusReports: true
      }
    });
    
    if (!group) {
      throw new Error(`Group with ID ${id} not found`);
    }
    
    // Collect files to delete
    const filesToDelete: string[] = [];
    
    // Add logo if it exists
    if (group.logoUrl) {
      filesToDelete.push(group.logoUrl);
      
      // Check for original logo URL in metadata
      if (group.metadata) {
        try {
          const metadata = JSON.parse(group.metadata);
          if (metadata.originalUrl && metadata.originalUrl !== group.logoUrl) {
            filesToDelete.push(metadata.originalUrl);
          }
        } catch (parseError) {
          console.error(`Error parsing metadata for group ${id}:`, parseError);
        }
      }
    }
    
    // Add status report files
    for (const report of group.statusReports) {
      if (report.fileUrls) {
        try {
          const urls = JSON.parse(report.fileUrls);
          if (Array.isArray(urls)) {
            filesToDelete.push(...urls);
          }
        } catch (parseError) {
          console.error(`Error parsing fileUrls for status report ${report.id}:`, parseError);
        }
      }
    }
    
    // Use a transaction to delete everything
    await prisma.$transaction(async (tx) => {
      // Delete the group - this will cascade to all related data
      await tx.group.delete({
        where: { id }
      });
    });
    
    // Delete files from blob storage
    if (filesToDelete.length > 0) {
      try {
        await del(filesToDelete);
      } catch (deleteError) {
        console.error('Error deleting files from blob storage:', deleteError);
        // Continue even if file deletion fails
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting group ${id}:`, error);
    throw error;
  }
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
    const group = await prisma.group.findUnique({
      where: { id: data.groupId }
    });

    if (!group || group.status !== 'ACTIVE') {
      throw new Error(validationMessages.resourceNotFound('group') + ' oder nicht aktiv');
    }

    // Create the status report
    const statusReport = await prisma.statusReport.create({
      data: {
        title: data.title,
        content: data.content,
        reporterFirstName: data.reporterFirstName,
        reporterLastName: data.reporterLastName,
        fileUrls: data.fileUrls && data.fileUrls.length > 0 ? JSON.stringify(data.fileUrls) : null,
        status: 'NEW' as StatusReportStatus,
        groupId: data.groupId
      }
    });

    return statusReport;
  } catch (error) {
    console.error('Error creating status report:', error);
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
    
    // Optimize query by selecting only needed fields for count
    const totalItems = await prisma.statusReport.count({ where });
    
    // Fetch status reports with filtering and pagination
    const statusReports = await prisma.statusReport.findMany({
      where,
      orderBy: {
        [orderBy]: orderDirection
      },
      // Only include necessary fields for listing to reduce data transfer
      include: {
        group: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true
          }
        }
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
    console.error('Error fetching status reports:', error);
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
    const statusReport = await prisma.statusReport.findUnique({
      where: { id },
      include: {
        group: true
      }
    });
    
    return statusReport;
  } catch (error) {
    console.error(`Error fetching status report with ID ${id}:`, error);
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
    const group = await prisma.group.findUnique({
      where: { slug }
    });
    
    if (!group) {
      throw new Error(`Group with slug ${slug} not found`);
    }
    
    const statusReports = await prisma.statusReport.findMany({
      where: {
        groupId: group.id,
        status: 'ACTIVE' as StatusReportStatus
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return statusReports;
  } catch (error) {
    console.error(`Error fetching status reports for group ${slug}:`, error);
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
    const statusReport = await prisma.statusReport.update({
      where: { id },
      data: { status },
      include: {
        group: {
          include: {
            responsiblePersons: true
          }
        }
      }
    });
    
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
      console.error(`Error sending notification email for status report ${id}:`, emailError);
    }
    
    return statusReport;
  } catch (error) {
    console.error(`Error updating status for status report ${id}:`, error);
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
    const currentReport = await prisma.statusReport.findUnique({
      where: { id: data.id },
      include: {
        group: {
          include: {
            responsiblePersons: true
          }
        }
      }
    });
    
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
    if (data.status === 'ACTIVE' && currentReport.group.status !== 'ACTIVE' && currentReport.group.status !== 'ARCHIVED') {
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
    const statusReport = await prisma.statusReport.update({
      where: { id: data.id },
      data: updateData,
      include: {
        group: {
          include: {
            responsiblePersons: true
          }
        }
      }
    });
    
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
        console.error(`Error sending notification email for status report ${data.id}:`, emailError);
        // Continue without failing the update
      }
    }
       
    return statusReport;
  } catch (error) {
    console.error(`Error updating status report ${data.id}:`, error);
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
 * Uses JSON parsing to extract file URLs from stored fileUrls field.
 */
export async function deleteStatusReport(id: string): Promise<boolean> {
  try {
    // Get the status report to check for files to delete
    const statusReport = await prisma.statusReport.findUnique({
      where: { id }
    });
    
    if (!statusReport) {
      throw new Error(validationMessages.resourceNotFound('statusReport', id));
    }
    
    // Delete files from blob storage if they exist
    if (statusReport.fileUrls) {
      try {
        const fileUrls = JSON.parse(statusReport.fileUrls);
        if (Array.isArray(fileUrls) && fileUrls.length > 0) {
          await del(fileUrls);
        }
      } catch (parseError) {
        console.error(`Error parsing/deleting fileUrls for status report ${id}:`, parseError);
        // Continue even if file deletion fails
      }
    }
    
    // Delete the status report
    await prisma.statusReport.delete({
      where: { id }
    });
    
    return true;
  } catch (error) {
    console.error(`Error deleting status report ${id}:`, error);
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
    
    const reports = await prisma.statusReport.findMany({
      where: {
        status: 'ACTIVE' as StatusReportStatus,
        createdAt: {
          gte: twoWeeksAgo
        }
      },
      include: {
        group: true
      },
      orderBy: [
        { group: { name: 'asc' } },
        { createdAt: 'desc' }
      ]
    });
    
    return reports;
  } catch (error) {
    console.error('Error fetching recent status reports for newsletter:', error);
    throw error;
  }
}

// Re-export email notification functions
export { sendGroupAcceptanceEmail, sendGroupArchivingEmail };

