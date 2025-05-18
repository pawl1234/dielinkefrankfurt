import { NextRequest, NextResponse } from 'next/server';
import prisma from './prisma';
import { serverErrorResponse } from './api-auth';
import { Group, GroupStatus, ResponsiblePerson, StatusReport, StatusReportStatus, Prisma } from '@prisma/client';
import { put, del } from '@vercel/blob';
import slugify from 'slugify';
import { sendEmail } from './email';

/**
 * Types for group operations
 */
export interface GroupCreateData {
  name: string;
  description: string;
  logoUrl?: string;
  logoMetadata?: {
    originalUrl: string;
    croppedUrl: string;
  };
  responsiblePersons: ResponsiblePersonCreateData[];
}

export interface ResponsiblePersonCreateData {
  firstName: string;
  lastName: string;
  email: string;
}

export interface GroupUpdateData {
  id: string;
  name?: string;
  description?: string;
  logoUrl?: string;
  logoMetadata?: {
    originalUrl: string;
    croppedUrl: string;
  } | null; // null to remove logo
  status?: GroupStatus;
  responsiblePersons?: ResponsiblePersonCreateData[];
}

/**
 * Types for status report operations
 */
export interface StatusReportCreateData {
  groupId: string;
  title: string;
  content: string;
  reporterFirstName: string;
  reporterLastName: string;
  fileUrls?: string[];
}

export interface StatusReportUpdateData {
  id: string;
  title?: string;
  content?: string;
  reporterFirstName?: string;
  reporterLastName?: string;
  status?: StatusReportStatus;
  fileUrls?: string[];
}

/**
 * Validate group data
 */
export function validateGroupData(data: Partial<GroupCreateData>): string | null {
  if (!data.name) return 'Group name is required';
  if (data.name.length < 3 || data.name.length > 100) return 'Group name must be between 3 and 100 characters';
  
  if (!data.description) return 'Group description is required';
  if (data.description.length < 50 || data.description.length > 5000) return 'Group description must be between 50 and 5000 characters';
  
  if (!data.responsiblePersons || data.responsiblePersons.length === 0) {
    return 'At least one responsible person is required';
  }
  
  for (const person of data.responsiblePersons) {
    if (!person.firstName || person.firstName.length < 2 || person.firstName.length > 50) {
      return 'First name must be between 2 and 50 characters for all responsible persons';
    }
    
    if (!person.lastName || person.lastName.length < 2 || person.lastName.length > 50) {
      return 'Last name must be between 2 and 50 characters for all responsible persons';
    }
    
    if (!person.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email)) {
      return 'Valid email is required for all responsible persons';
    }
  }
  
  return null;
}

/**
 * Validate status report data
 */
export function validateStatusReportData(data: Partial<StatusReportCreateData>): string | null {
  if (!data.groupId) return 'Group ID is required';
  
  if (!data.title) return 'Report title is required';
  if (data.title.length < 3 || data.title.length > 100) return 'Report title must be between 3 and 100 characters';
  
  if (!data.content) return 'Report content is required';
  if (data.content.length > 1000) return 'Report content must not exceed 1000 characters';
  
  if (!data.reporterFirstName || data.reporterFirstName.length < 2 || data.reporterFirstName.length > 50) {
    return 'Reporter first name must be between 2 and 50 characters';
  }
  
  if (!data.reporterLastName || data.reporterLastName.length < 2 || data.reporterLastName.length > 50) {
    return 'Reporter last name must be between 2 and 50 characters';
  }
  
  return null;
}

/**
 * Create a slug from a group name
 */
export function createGroupSlug(name: string): string {
  // Generate a basic slug
  const baseSlug = slugify(name, {
    lower: true,
    strict: true,
    locale: 'de'
  });
  
  // Add a timestamp to make it unique
  const timestamp = new Date().getTime().toString().slice(-4);
  return `${baseSlug}-${timestamp}`;
}

/**
 * Create a new group
 */
export async function createGroup(data: GroupCreateData): Promise<Group> {
  // Validate group data
  const validationError = validateGroupData(data);
  if (validationError) {
    throw new Error(validationError);
  }
  
  // Create a unique slug based on the group name
  const slug = createGroupSlug(data.name);
  
  try {
    // Use a transaction to ensure both the group and responsible persons are created
    const group = await prisma.$transaction(async (tx) => {
      // Prepare metadata for logo if it exists
      let logoMetadata = null;
      if (data.logoMetadata) {
        logoMetadata = JSON.stringify(data.logoMetadata);
      }
      
      // Use the cropped URL as the main logoUrl if available
      const logoUrl = data.logoMetadata?.croppedUrl || data.logoUrl;
      
      // Create the group
      const newGroup = await tx.group.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          logoUrl,
          status: 'NEW' as GroupStatus,
          metadata: logoMetadata, // Store logo metadata in metadata field
        }
      });
      
      // Create responsible persons
      for (const person of data.responsiblePersons) {
        await tx.responsiblePerson.create({
          data: {
            firstName: person.firstName,
            lastName: person.lastName,
            email: person.email,
            groupId: newGroup.id
          }
        });
      }
      
      return newGroup;
    });
    
    return group;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
}

/**
 * Pagination and filtering response type
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetch groups with filtering options and pagination
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
 * Get a single group by ID
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
 * Get a single group by slug
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
 * Get all public (ACTIVE) groups
 * @param page Optional page number for pagination
 * @param pageSize Optional page size for pagination
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
 * Update group status
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
 * Update group details
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
    
    // Handle logo updates
    if (data.logoMetadata !== undefined) {
      if (data.logoMetadata === null) {
        // Remove logo
        updateData.logoUrl = null;
        updateData.metadata = null;
      } else {
        // Update logo
        updateData.logoUrl = data.logoMetadata.croppedUrl;
        updateData.metadata = JSON.stringify(data.logoMetadata);
      }
    } else if (data.logoUrl) {
      // Simple logoUrl update without metadata
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
      const group = await tx.group.update({
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
 * Delete a group and its related data
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
        } catch (e) {
          console.error(`Error parsing metadata for group ${id}:`, e);
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
        } catch (e) {
          console.error(`Error parsing fileUrls for status report ${report.id}:`, e);
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
 * Create a new status report
 */
export async function createStatusReport(data: StatusReportCreateData): Promise<StatusReport> {
  // Validate status report data
  const validationError = validateStatusReportData(data);
  if (validationError) {
    throw new Error(validationError);
  }
  
  try {
    // Check if the group exists and is active
    const group = await prisma.group.findUnique({
      where: { id: data.groupId, status: 'ACTIVE' as GroupStatus }
    });
    
    if (!group) {
      throw new Error('Group not found or not active');
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
 * Fetch status reports with filtering options and pagination
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
 * Get a single status report by ID
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
 * Get status reports for a specific group
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
 * Update status report status
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
 * Update status report details
 */
export async function updateStatusReport(data: StatusReportUpdateData): Promise<StatusReport> {
  try {
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
    
    // Update the status report
    const statusReport = await prisma.statusReport.update({
      where: { id: data.id },
      data: updateData,
      include: {
        group: true
      }
    });
    
    return statusReport;
  } catch (error) {
    console.error(`Error updating status report ${data.id}:`, error);
    throw error;
  }
}

/**
 * Delete a status report
 */
export async function deleteStatusReport(id: string): Promise<boolean> {
  try {
    // Get the status report to check for files to delete
    const statusReport = await prisma.statusReport.findUnique({
      where: { id }
    });
    
    if (!statusReport) {
      throw new Error(`Status report with ID ${id} not found`);
    }
    
    // Delete files from blob storage if they exist
    if (statusReport.fileUrls) {
      try {
        const fileUrls = JSON.parse(statusReport.fileUrls);
        if (Array.isArray(fileUrls) && fileUrls.length > 0) {
          await del(fileUrls);
        }
      } catch (e) {
        console.error(`Error parsing/deleting fileUrls for status report ${id}:`, e);
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
 * Get recent status reports for newsletter
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

/**
 * Send email notification when a group is accepted
 * @param group The group with its responsible persons
 * @returns Promise resolving to the email sending result
 */
export async function sendGroupAcceptanceEmail(group: Group & { responsiblePersons: ResponsiblePerson[] }): Promise<{ success: boolean; error?: any }> {
  try {
    if (!group.responsiblePersons || group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = group.responsiblePersons.map(person => person.email).join(',');
    const statusReportFormUrl = `${process.env.NEXTAUTH_URL}/gruppen-bericht`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ihre Gruppe "${group.name}" wurde freigeschaltet</h2>
        
        <p>Liebe Verantwortliche der Gruppe "${group.name}",</p>
        
        <p>wir freuen uns, Ihnen mitteilen zu können, dass Ihre Gruppe nun freigeschaltet wurde und auf unserer Website sichtbar ist.</p>
        
        <p>Sie können ab sofort Statusberichte für Ihre Gruppe einreichen unter: <a href="${statusReportFormUrl}">${statusReportFormUrl}</a></p>
        
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <p>
          Mit freundlichen Grüßen,<br>
          Das Team von Die Linke Frankfurt
        </p>
      </div>
    `;
    
    await sendEmail({
      to: recipients,
      subject: `Ihre Gruppe "${group.name}" wurde freigeschaltet`,
      html
    });
    
    console.log(`✅ Group acceptance email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending group acceptance email:', error);
    // Don't throw, to avoid interrupting the main process
    return { success: false, error };
  }
}

/**
 * Send email notification when a group is archived
 * @param group The group with its responsible persons
 * @returns Promise resolving to the email sending result
 */
export async function sendGroupArchivingEmail(group: Group & { responsiblePersons: ResponsiblePerson[] }): Promise<{ success: boolean; error?: any }> {
  try {
    if (!group.responsiblePersons || group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = group.responsiblePersons.map(person => person.email).join(',');
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ihre Gruppe "${group.name}" wurde archiviert</h2>
        
        <p>Liebe Verantwortliche der Gruppe "${group.name}",</p>
        
        <p>wir möchten Sie darüber informieren, dass Ihre Gruppe auf unserer Website archiviert wurde und nicht mehr öffentlich sichtbar ist.</p>
        
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <p>
          Mit freundlichen Grüßen,<br>
          Das Team von Die Linke Frankfurt
        </p>
      </div>
    `;
    
    await sendEmail({
      to: recipients,
      subject: `Ihre Gruppe "${group.name}" wurde archiviert`,
      html
    });
    
    console.log(`✅ Group archiving email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending group archiving email:', error);
    // Don't throw, to avoid interrupting the main process
    return { success: false, error };
  }
}

/**
 * Send email notification when a status report is accepted
 * @param statusReport The status report with its group and responsible persons
 * @returns Promise resolving to the email sending result
 */
export async function sendStatusReportAcceptanceEmail(
  statusReport: StatusReport & { group: Group & { responsiblePersons: ResponsiblePerson[] } }
): Promise<{ success: boolean; error?: any }> {
  try {
    if (!statusReport.group.responsiblePersons || statusReport.group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${statusReport.group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = statusReport.group.responsiblePersons.map(person => person.email).join(',');
    const reportUrl = `${process.env.NEXTAUTH_URL}/gruppen/${statusReport.group.slug}#report-${statusReport.id}`;
    const date = new Date(statusReport.createdAt).toLocaleDateString('de-DE');
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Statusbericht "${statusReport.title}" wurde freigeschaltet</h2>
        
        <p>Liebe Verantwortliche der Gruppe "${statusReport.group.name}",</p>
        
        <p>wir möchten Sie darüber informieren, dass der Statusbericht "${statusReport.title}" vom ${date} nun freigeschaltet wurde und auf unserer Website sichtbar ist.</p>
        
        <p>Sie können den Bericht hier einsehen: <a href="${reportUrl}">${reportUrl}</a></p>
        
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <p>
          Mit freundlichen Grüßen,<br>
          Das Team von Die Linke Frankfurt
        </p>
      </div>
    `;
    
    await sendEmail({
      to: recipients,
      subject: `Statusbericht "${statusReport.title}" wurde freigeschaltet`,
      html
    });
    
    console.log(`✅ Status report acceptance email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending status report acceptance email:', error);
    // Don't throw, to avoid interrupting the main process
    return { success: false, error };
  }
}

/**
 * Send email notification when a group is rejected
 * @param group The group with its responsible persons
 * @returns Promise resolving to the email sending result
 */
export async function sendGroupRejectionEmail(group: Group & { responsiblePersons: ResponsiblePerson[] }): Promise<{ success: boolean; error?: any }> {
  try {
    if (!group.responsiblePersons || group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = group.responsiblePersons.map(person => person.email).join(',');
    const contactEmail = process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ihre Gruppenanfrage "${group.name}" wurde abgelehnt</h2>
        
        <p>Liebe Verantwortliche der Gruppe "${group.name}",</p>
        
        <p>wir müssen Ihnen leider mitteilen, dass Ihre Anfrage zur Erstellung einer Gruppe auf unserer Website nicht genehmigt werden konnte.</p>
        
        <p>Für weitere Informationen oder Fragen wenden Sie sich bitte an: <a href="mailto:${contactEmail}">${contactEmail}</a></p>
        
        <p>
          Mit freundlichen Grüßen,<br>
          Das Team von Die Linke Frankfurt
        </p>
      </div>
    `;
    
    await sendEmail({
      to: recipients,
      subject: `Ihre Gruppenanfrage "${group.name}" wurde abgelehnt`,
      html
    });
    
    console.log(`✅ Group rejection email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending group rejection email:', error);
    // Don't throw, to avoid interrupting the main process
    return { success: false, error };
  }
}

/**
 * Send email notification when a status report is rejected
 * @param statusReport The status report with its group and responsible persons
 * @returns Promise resolving to the email sending result
 */
export async function sendStatusReportRejectionEmail(
  statusReport: StatusReport & { group: Group & { responsiblePersons: ResponsiblePerson[] } }
): Promise<{ success: boolean; error?: any }> {
  try {
    if (!statusReport.group.responsiblePersons || statusReport.group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${statusReport.group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = statusReport.group.responsiblePersons.map(person => person.email).join(',');
    const contactEmail = process.env.CONTACT_EMAIL || 'info@die-linke-frankfurt.de';
    const date = new Date(statusReport.createdAt).toLocaleDateString('de-DE');
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ihr Statusbericht "${statusReport.title}" wurde abgelehnt</h2>
        
        <p>Liebe Verantwortliche der Gruppe "${statusReport.group.name}",</p>
        
        <p>wir müssen Ihnen leider mitteilen, dass Ihr Statusbericht "${statusReport.title}" vom ${date} für die Veröffentlichung auf unserer Website nicht genehmigt werden konnte.</p>
        
        <p>Sie können gerne einen überarbeiteten Bericht einreichen oder für weitere Informationen und Fragen wenden Sie sich bitte an: <a href="mailto:${contactEmail}">${contactEmail}</a></p>
        
        <p>
          Mit freundlichen Grüßen,<br>
          Das Team von Die Linke Frankfurt
        </p>
      </div>
    `;
    
    await sendEmail({
      to: recipients,
      subject: `Ihr Statusbericht "${statusReport.title}" wurde abgelehnt`,
      html
    });
    
    console.log(`✅ Status report rejection email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending status report rejection email:', error);
    // Don't throw, to avoid interrupting the main process
    return { success: false, error };
  }
}

/**
 * Send email notification when a status report is archived
 * @param statusReport The status report with its group and responsible persons
 * @returns Promise resolving to the email sending result
 */
export async function sendStatusReportArchivingEmail(
  statusReport: StatusReport & { group: Group & { responsiblePersons: ResponsiblePerson[] } }
): Promise<{ success: boolean; error?: any }> {
  try {
    if (!statusReport.group.responsiblePersons || statusReport.group.responsiblePersons.length === 0) {
      console.error(`No responsible persons found for group ${statusReport.group.id}`);
      return { success: false, error: 'No responsible persons found' };
    }
    
    const recipients = statusReport.group.responsiblePersons.map(person => person.email).join(',');
    const date = new Date(statusReport.createdAt).toLocaleDateString('de-DE');
    
    // Parse file URLs to list them in the email
    let fileList = '';
    if (statusReport.fileUrls) {
      try {
        const files = JSON.parse(statusReport.fileUrls);
        if (Array.isArray(files) && files.length > 0) {
          fileList = `
            <div style="margin-top: 20px; margin-bottom: 20px;">
              <p><strong>Angehängte Dateien, die nicht mehr öffentlich verfügbar sind:</strong></p>
              <ul>
                ${files.map(file => {
                  const fileName = file.split('/').pop();
                  return `<li>${fileName}</li>`;
                }).join('')}
              </ul>
            </div>
          `;
        }
      } catch (e) {
        console.error('Error parsing file URLs:', e);
      }
    }
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Ihr Statusbericht "${statusReport.title}" wurde archiviert</h2>
        
        <p>Liebe Verantwortliche der Gruppe "${statusReport.group.name}",</p>
        
        <p>wir möchten Sie darüber informieren, dass Ihr Statusbericht "${statusReport.title}" vom ${date} nun archiviert wurde und nicht mehr öffentlich auf unserer Website sichtbar ist.</p>
        
        ${fileList}
        
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <p>
          Mit freundlichen Grüßen,<br>
          Das Team von Die Linke Frankfurt
        </p>
      </div>
    `;
    
    await sendEmail({
      to: recipients,
      subject: `Ihr Statusbericht "${statusReport.title}" wurde archiviert`,
      html
    });
    
    console.log(`✅ Status report archiving email sent to ${recipients}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending status report archiving email:', error);
    // Don't throw, to avoid interrupting the main process
    return { success: false, error };
  }
}