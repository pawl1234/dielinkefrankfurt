import { Group, GroupStatus, ResponsiblePerson, StatusReport, Prisma } from '@prisma/client';
import slugify from 'slugify';
import { sendGroupAcceptanceEmail, sendGroupRejectionEmail, sendGroupArchivingEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import * as groupOps from '@/lib/db/group-operations';
import { PaginatedResponse } from '@/types/api-types';

/**
 * Types for group operations
 */
export interface GroupCreateData {
  name: string;        // Pre-validated: 3-100 chars, required
  description: string; // Pre-validated: 50-5000 chars, required
  logoUrl?: string;    // Pre-validated: valid URL format (optional)
  responsiblePersons: ResponsiblePersonCreateData[]; // Pre-validated: 1-5 persons, all fields validated
  recurringPatterns?: string | null;  // JSON array of rrule strings
  meetingTime?: string | null;        // HH:mm format
  meetingStreet?: string | null;
  meetingCity?: string | null;
  meetingPostalCode?: string | null;
  meetingLocationDetails?: string | null;
}

export interface ResponsiblePersonCreateData {
  firstName: string;  // Pre-validated: 2-50 chars, required
  lastName: string;   // Pre-validated: 2-50 chars, required
  email: string;      // Pre-validated: valid email format, required
}

export interface GroupUpdateData {
  id: string;
  name?: string;
  description?: string;
  logoUrl?: string | null;
  status?: GroupStatus;
  responsiblePersons?: ResponsiblePersonCreateData[];
  recurringPatterns?: string | null;
  meetingTime?: string | null;
  meetingStreet?: string;
  meetingCity?: string;
  meetingPostalCode?: string;
  meetingLocationDetails?: string;
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
    const group = await groupOps.createGroupWithPersons({
      name: data.name,
      slug,
      description: data.description,
      logoUrl: data.logoUrl || null,
      status: 'NEW' as GroupStatus,
      recurringPatterns: data.recurringPatterns || null,
      meetingTime: data.meetingTime || null,
      meetingStreet: data.meetingStreet || null,
      meetingCity: data.meetingCity || null,
      meetingPostalCode: data.meetingPostalCode || null,
      meetingLocationDetails: data.meetingLocationDetails || null,
      responsiblePersons: data.responsiblePersons.map(person => ({
        firstName: person.firstName.trim(),
        lastName: person.lastName.trim(),
        email: person.email.trim()
      }))
    });

    return group;
  } catch (error) {
    logger.error('Error creating group', { context: { error } });
    throw error;
  }
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

    // Fetch groups with filtering and pagination
    const { groups, totalItems } = await groupOps.findGroupsWithPagination({
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
      items: groups,
      totalItems,
      page,
      pageSize,
      totalPages
    };
  } catch (error) {
    logger.error('Error fetching groups', { context: { error } });
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
export async function getGroupById(id: string): Promise<(Group & { responsiblePersons: ResponsiblePerson[] }) | null> {
  try {
    const group = await groupOps.findGroupById(id);
    return group;
  } catch (error) {
    logger.error(`Error fetching group with ID ${id}`, { context: { error } });
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
    const group = await groupOps.findGroupBySlug(slug);
    return group;
  } catch (error) {
    logger.error(`Error fetching group with slug ${slug}`, { context: { error } });
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
    // If pagination is requested
    if (page && pageSize) {
      const skip = (page - 1) * pageSize;

      // Fetch paginated groups
      const { groups, totalItems } = await groupOps.findPublicGroups({ skip, take: pageSize });

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
      const { groups } = await groupOps.findPublicGroups({});
      return groups;
    }
  } catch (error) {
    logger.error('Error fetching public groups', { context: { error } });
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
    const group = await groupOps.updateGroupStatus(id, status);

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
      logger.error(`Error sending notification email for group ${id}`, { context: { emailError } });
    }

    return group;
  } catch (error) {
    logger.error(`Error updating status for group ${id}`, { context: { error } });
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
    const currentGroup = await groupOps.findGroupById(data.id);

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

    if (data.recurringPatterns !== undefined) updateData.recurringPatterns = data.recurringPatterns;
    if (data.meetingTime !== undefined) updateData.meetingTime = data.meetingTime;
    if (data.meetingStreet !== undefined) updateData.meetingStreet = data.meetingStreet;
    if (data.meetingCity !== undefined) updateData.meetingCity = data.meetingCity;
    if (data.meetingPostalCode !== undefined) updateData.meetingPostalCode = data.meetingPostalCode;
    if (data.meetingLocationDetails !== undefined) updateData.meetingLocationDetails = data.meetingLocationDetails;

    if (data.name && data.name !== currentGroup.name) {
      updateData.slug = createGroupSlug(data.name);
    }

    // Update the group with responsible persons
    const updatedGroup = await groupOps.updateGroupWithPersons(
      data.id,
      updateData,
      data.responsiblePersons?.map(person => ({
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email
      }))
    );

    if (!updatedGroup) {
      throw new Error(`Failed to update group ${data.id}`);
    }

    return updatedGroup;
  } catch (error) {
    logger.error(`Error updating group ${data.id}`, { context: { error } });
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
 * Uses file-cleanup service for blob storage operations.
 */
export async function deleteGroup(id: string): Promise<boolean> {
  // This function will use the file-cleanup service
  // Importing here to avoid circular dependency
  const { deleteGroupFiles } = await import('./file-cleanup');

  try {
    // Get the group and collect files to delete
    await deleteGroupFiles(id);

    // Delete the group from database (cascade deletes related data)
    await groupOps.deleteGroup(id);

    return true;
  } catch (error) {
    logger.error(`Error deleting group ${id}`, { context: { error } });
    throw error;
  }
}
