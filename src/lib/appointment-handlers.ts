import { NextRequest, NextResponse } from 'next/server';
import prisma from './prisma';
import type { Appointment, Prisma } from '@prisma/client';
import { serverErrorResponse } from './api-auth';
import {
  handleDatabaseError
} from './errors';
import { FILE_TYPES } from './validation/file-schemas';
import { type AppointmentSubmitData } from './validation/appointment';
import { uploadFiles, deleteFiles } from './blob-storage';
import { logger } from './logger';

const ALLOWED_ATTACHMENT_TYPES = FILE_TYPES.EMAIL_ATTACHMENT;

/**
 * Appointment metadata structure for cover images
 */
export interface AppointmentMetadata {
  coverImageUrl?: string;
  croppedCoverImageUrl?: string | null;
}

/**
 * Parses appointment metadata from JSON string.
 * Centralized to avoid repetition and ensure consistent error handling.
 *
 * @param metadataJson JSON string containing metadata
 * @returns Parsed metadata object or empty object if parsing fails
 */
export function parseAppointmentMetadata(metadataJson: string | null | undefined): AppointmentMetadata {
  if (!metadataJson) return {};

  try {
    return JSON.parse(metadataJson);
  } catch (error) {
    logger.warn('Failed to parse appointment metadata', {
      module: 'appointment-handlers',
      context: { error }
    });
    return {};
  }
}

/**
 * Types for appointment operations
 */
export interface AppointmentUpdateData {
  id: number;         // Pre-validated: valid appointment ID, required
  processed?: boolean; // Pre-validated: boolean value (when provided)
  status?: 'pending' | 'accepted' | 'rejected'; // Pre-validated: valid status enum (when provided)
  title?: string;     // Pre-validated: 3-200 chars (when provided)
  mainText?: string;  // Pre-validated: 10-10000 chars (when provided)
  startDateTime?: string | Date; // Pre-validated: valid ISO datetime (when provided)
  endDateTime?: string | Date | null; // Pre-validated: valid ISO datetime or null (when provided)
  street?: string | null;    // Pre-validated: max 100 chars (when provided)
  city?: string | null;      // Pre-validated: max 100 chars (when provided)
  state?: string | null;     // Pre-validated: max 100 chars (when provided)
  postalCode?: string | null; // Pre-validated: valid postal code format (when provided)
  firstName?: string | null;  // Pre-validated: 2-50 chars (when provided)
  lastName?: string | null;   // Pre-validated: 2-50 chars (when provided)
  recurringText?: string | null; // Pre-validated: max 500 chars (when provided)
  fileUrls?: string | null;   // Pre-validated: JSON string of valid URLs (when provided)
  featured?: boolean;         // Pre-validated: boolean value (when provided)
  metadata?: string | null;   // Pre-validated: JSON string format (when provided)
  rejectionReason?: string | null; // Pre-validated: max 1000 chars (when provided)
}

export interface AppointmentCreateData {
  title: string;      // Pre-validated: 3-200 chars, required
  mainText: string;   // Pre-validated: 10-10000 chars, required
  startDateTime: string; // Pre-validated: valid ISO datetime, required
  endDateTime?: string | null; // Pre-validated: valid ISO datetime or null (when provided)
  street?: string;    // Pre-validated: max 100 chars (when provided)
  city?: string;      // Pre-validated: max 100 chars (when provided)
  state?: string;     // Pre-validated: max 100 chars (when provided)
  postalCode?: string; // Pre-validated: valid postal code format (when provided)
  firstName?: string; // Pre-validated: 2-50 chars (when provided)
  lastName?: string;  // Pre-validated: 2-50 chars (when provided)
  recurringText?: string; // Pre-validated: max 500 chars (when provided)
  featured?: boolean; // Pre-validated: boolean value (when provided)
}

/**
 * Interface for paginated responses
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Retrieves appointments with filtering, pagination, and proper caching headers.
 *
 * @param request Pre-validated NextRequest with query parameters from API route level
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
    const skip = (page - 1) * pageSize;
    
    // If ID is provided, return a single appointment
    if (id) {
      const appointment = await prisma.appointment.findUnique({
        where: {
          id: parseInt(id),
          // NOTE: No status check here so admins can view any appointment
        }
      });
      
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

    // Get total count for pagination
    const totalItems = await prisma.appointment.count({
      where: filter
    });
    
    const totalPages = Math.ceil(totalItems / pageSize);

    // Get appointments with filters and pagination
    const appointments = await prisma.appointment.findMany({
      where: filter,
      orderBy: [
        // For upcoming events, sort by date ascending
        ...(view === 'upcoming' ? [{ startDateTime: 'asc' as const }] : []),
        // For all other views, newest first
        { createdAt: 'desc' as const }
      ],
      skip,
      take: pageSize,
    });

    // Create paginated response
    const response: PaginatedResponse<Appointment> = {
      items: appointments,
      totalItems,
      page,
      pageSize,
      totalPages
    };

    // Set cache headers (1 minute for admin data)
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=30'
      }
    });
  } catch (error) {
    logger.error('Error fetching appointments', {
      module: 'appointment-handlers',
      context: { error }
    });
    return serverErrorResponse('Failed to fetch appointments');
  }
}

/**
 * Retrieves public appointments (accepted status only) with caching optimization.
 *
 * @param request Pre-validated NextRequest with query parameters from API route level
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
    const skip = (page - 1) * pageSize;
    
    // If ID is provided, return a single appointment
    if (id) {
      const appointment = await prisma.appointment.findUnique({
        where: {
          id: parseInt(id),
          status: 'accepted' // Only show accepted appointments
        }
      });
      
      if (!appointment) {
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
    
    // Get total count for pagination
    const totalItems = await prisma.appointment.count({
      where: filter
    });
    
    const totalPages = Math.ceil(totalItems / pageSize);
    
    const appointments = await prisma.appointment.findMany({
      where: filter,
      orderBy: {
        startDateTime: 'asc' // Chronological order
      },
      skip,
      take: pageSize,
      select: {
        id: true,
        title: true,
        mainText: true,
        startDateTime: true,
        endDateTime: true,
        street: true,
        city: true,
        state: true,
        postalCode: true,
        featured: true
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
    
    // Cache for longer time (5 minutes) for public data
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    logger.error('Error fetching public appointments', {
      module: 'appointment-handlers',
      context: { error }
    });
    return serverErrorResponse('Failed to fetch appointments');
  }
}

/**
 * Retrieves newsletter-ready appointments (accepted and future date) with pagination.
 *
 * @param request Pre-validated NextRequest with query parameters from API route level
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
    const skip = (page - 1) * pageSize;
    
    const filter = {
      status: 'accepted',
      startDateTime: {
        gte: new Date() // Only future events
      }
    };
    
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
        startDateTime: true,
        featured: true
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
      module: 'appointment-handlers',
      context: { error }
    });
    return serverErrorResponse('Failed to fetch appointments');
  }
}

/**
 * Updates appointment featured status with validation.
 *
 * @param request Pre-validated NextRequest with JSON body from API route level
 * @returns Promise resolving to NextResponse with updated appointment data
 * @throws Error Only for business logic failures (database operations, record not found, status update failures)
 *
 * Note: Request body validation is handled at API route level.
 * This function assumes ID and featured status validation has already passed.
 * Simple operation for toggling featured flag with database consistency checks.
 */
export async function updateFeaturedStatus(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, featured } = data;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }
    
    if (featured === undefined) {
      return NextResponse.json(
        { error: 'Featured status is required' },
        { status: 400 }
      );
    }
    
    try {
      const updatedAppointment = await prisma.appointment.update({
        where: { id: Number(id) },
        data: { featured }
      });
      
      return NextResponse.json(updatedAppointment);
    } catch (dbError) {
      logger.error('Could not update appointment featured status in DB', {
        module: 'appointment-handlers',
        context: { error: dbError }
      });
      return serverErrorResponse('Failed to update appointment in database');
    }
  } catch (error) {
    logger.error('Error updating appointment featured status', {
      module: 'appointment-handlers',
      context: { error }
    });
    return serverErrorResponse('Failed to update appointment featured status');
  }
}

/**
 * Creates a new appointment with validated data, file uploads, and cover image processing.
 *
 * @param validatedData Pre-validated appointment data from Zod schema validation at API route level
 * @param formData Form data containing files for upload to Vercel Blob Storage
 * @param featured Whether appointment should be featured (requires cover image)
 * @returns Promise resolving to created appointment with uploaded file URLs and metadata
 * @throws Error Only for business logic failures (database operations, file upload failures, external service errors)
 *
 * Note: Input validation is handled at API route level using Zod schemas.
 * This function assumes all field validation has already passed.
 * Handles file uploads to Vercel Blob, cover image processing, and database transactions.
 *
 * Business rules enforced:
 * - Featured appointments require cover image
 * - Files are validated against ALLOWED_ATTACHMENT_TYPES
 * - File URLs are stored as JSON strings in database
 */
export async function createAppointmentWithFiles(
  validatedData: AppointmentSubmitData,
  formData: FormData,
  featured: boolean
): Promise<Appointment> {
  // Upload regular attachments
  const files = formData.getAll('files') as (File | Blob)[];
  let fileUrls: string[] = [];

  if (files.length > 0) {
    const uploadResults = await uploadFiles(files, {
      category: 'appointments',
      allowedTypes: ALLOWED_ATTACHMENT_TYPES
    });
    fileUrls = uploadResults.map(r => r.url);
  }

  // Upload cover images if featured
  let metadata: AppointmentMetadata = {};

  if (featured) {
    const coverImage = formData.get('coverImage') as File | null;
    const croppedCoverImage = formData.get('croppedCoverImage') as File | null;

    if (!coverImage) {
      throw new Error('Cover-Bild ist für Featured-Termine erforderlich');
    }

    // Upload both cover images
    const coverImagesToUpload = [coverImage, croppedCoverImage].filter((img): img is File => img !== null);
    const coverUploadResults = await uploadFiles(coverImagesToUpload, {
      category: 'appointments',
      allowedTypes: FILE_TYPES.IMAGE,
      prefix: 'cover'
    });

    // Map results to metadata structure
    metadata = {
      coverImageUrl: coverUploadResults[0]?.url,
      croppedCoverImageUrl: coverUploadResults[1]?.url || null
    };
  }

  // Save to database
  try {
    const appointment = await prisma.appointment.create({
      data: {
        title: validatedData.title,
        mainText: validatedData.mainText,
        startDateTime: new Date(validatedData.startDateTime),
        endDateTime: validatedData.endDateTime ? new Date(validatedData.endDateTime) : null,
        street: validatedData.street || '',
        city: validatedData.city || '',
        state: validatedData.state || '',
        postalCode: validatedData.postalCode || '',
        firstName: validatedData.firstName || '',
        lastName: validatedData.lastName || '',
        recurringText: validatedData.recurringText || '',
        featured,
        status: 'pending',
        fileUrls: fileUrls.length > 0 ? JSON.stringify(fileUrls) : null,
        metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
      },
    });

    logger.info('Appointment created', {
      module: 'appointment-handlers',
      context: { id: appointment.id }
    });

    return appointment;
  } catch (dbError) {
    throw handleDatabaseError(dbError, 'appointment creation');
  }
}

/**
 * Updates an existing appointment with complex multi-part data handling.
 *
 * @param request Pre-validated NextRequest with FormData or JSON from API route level
 * @returns Promise resolving to NextResponse with updated appointment data
 * @throws Error Only for business logic failures (database operations, file upload failures, external service errors)
 *
 * Note: Input validation is handled at API route level.
 * This function assumes all field validation has already passed.
 * Handles both JSON and multipart requests with comprehensive file management.
 *
 * Complex operations handled:
 * - File attachment uploads and deletions via Vercel Blob
 * - Cover image processing and cleanup for featured appointments
 * - Metadata serialization and database updates
 * - Transactional operations with proper error handling
 */
export async function updateAppointment(request: NextRequest) {
  try {
    // Check if the request is multipart/form-data
    const contentType = request.headers.get('content-type') || '';
    let data: AppointmentUpdateData;
    
    if (contentType.includes('multipart/form-data')) {
      // Handle form data for file uploads
      const formData = await request.formData();
      data = {} as AppointmentUpdateData;
      
      // Extract form fields
      // Using Array.from to avoid TS2802 error with for...of and FormData.entries()
      Array.from(formData.entries()).forEach(([key, value]) => {
        // Skip file entries, they'll be handled separately
        if (key.startsWith('file-')) return;
        
        // Use type assertion to allow dynamic property assignment
        const typedData = data as unknown as Record<string, unknown>;
        
        // Convert boolean values
        if (value === 'true') {
          typedData[key] = true;
        } else if (value === 'false') {
          typedData[key] = false;
        } else if (typeof value === 'string') {
          typedData[key] = value;
        }
      });
      
      // Handle file uploads if any
      const fileCount = formData.get('fileCount');
      if (fileCount && parseInt(fileCount as string) > 0) {
        const count = parseInt(fileCount as string);
        const filesToUpload: File[] = [];

        for (let i = 0; i < count; i++) {
          const file = formData.get(`file-${i}`);
          if (file instanceof File) {
            filesToUpload.push(file);
          }
        }

        // Upload all files at once using blob-storage module
        let uploadedUrls: string[] = [];
        if (filesToUpload.length > 0) {
          try {
            const uploadResults = await uploadFiles(filesToUpload, {
              category: 'appointments',
              allowedTypes: ALLOWED_ATTACHMENT_TYPES,
            });
            uploadedUrls = uploadResults.map(result => result.url);

            logger.debug('Files uploaded successfully', {
              module: 'appointment-handlers',
              context: { count: uploadedUrls.length }
            });
          } catch (uploadError) {
            logger.error('Error uploading files', {
              module: 'appointment-handlers',
              context: { error: uploadError }
            });
          }
        }

        // Get existing file URLs if any
        let existingFiles: string[] = [];
        const existingFileUrls = formData.get('existingFileUrls');
        if (existingFileUrls && typeof existingFileUrls === 'string') {
          try {
            existingFiles = JSON.parse(existingFileUrls);
          } catch (e) {
            logger.warn('Error parsing existing file URLs', {
              module: 'appointment-handlers',
              context: { error: e }
            });
          }
        }

        // Combine existing and new file URLs
        data.fileUrls = JSON.stringify([...existingFiles, ...uploadedUrls]);
      } else {
        // If no new files, just preserve existing files
        const existingFileUrls = formData.get('existingFileUrls');
        if (existingFileUrls && typeof existingFileUrls === 'string') {
          try {
            const existingFiles = JSON.parse(existingFileUrls);
            data.fileUrls = JSON.stringify(existingFiles);
          } catch (e) {
            logger.warn('Error parsing existing file URLs', {
              module: 'appointment-handlers',
              context: { error: e }
            });
            data.fileUrls = null;
          }
        } else {
          data.fileUrls = null;
        }
      }
      
      // Handle file deletions - check for files that were removed
      const deletedFileUrls = formData.get('deletedFileUrls');
      if (deletedFileUrls && typeof deletedFileUrls === 'string') {
        try {
          const urlsToDelete = JSON.parse(deletedFileUrls);
          if (Array.isArray(urlsToDelete) && urlsToDelete.length > 0) {
            logger.info('Deleting removed attachment files', {
              module: 'appointment-handlers',
              context: { count: urlsToDelete.length, urlsToDelete }
            });
            await deleteFiles(urlsToDelete);
          }
        } catch (deleteError) {
          logger.error('Error deleting removed attachment files', {
            module: 'appointment-handlers',
            context: { error: deleteError }
          });
          // Continue with the update even if deletion fails
        }
      }
      
      // Process cover image if present (for featured appointments)
      const featured = formData.get('featured') === 'true';
      const coverImage = formData.get('coverImage') as File | null;
      const croppedCoverImage = formData.get('croppedCoverImage') as File | null;
      
      // Get the existing metadata if we need it
      const existingAppointment = await prisma.appointment.findUnique({
        where: { id: Number(data.id) },
        select: { metadata: true, featured: true }
      });
      
      // Handle case where featured was unchecked - remove cover images
      if (!featured && existingAppointment?.featured) {
        try {
          // Parse existing metadata if available
          const metadata = parseAppointmentMetadata(existingAppointment?.metadata);
          const oldCoverImageUrl = metadata.coverImageUrl || null;
          const oldCroppedCoverImageUrl = metadata.croppedCoverImageUrl || null;
          
          // Delete old images if they exist
          if (oldCoverImageUrl || oldCroppedCoverImageUrl) {
            try {
              const urlsToDelete = [];

              if (oldCoverImageUrl) urlsToDelete.push(oldCoverImageUrl);
              if (oldCroppedCoverImageUrl) urlsToDelete.push(oldCroppedCoverImageUrl);

              if (urlsToDelete.length > 0) {
                logger.info('Removing cover images for non-featured appointment', {
                  module: 'appointment-handlers',
                  context: { urlsToDelete }
                });
                await deleteFiles(urlsToDelete);
              }
            } catch (deleteError) {
              logger.error('Error deleting cover images', {
                module: 'appointment-handlers',
                context: { error: deleteError }
              });
            }
          }
          
          // Clear metadata for cover images
          data.metadata = JSON.stringify({});
        } catch (error) {
          logger.error('Error handling featured status change', {
            module: 'appointment-handlers',
            context: { error }
          });
        }
      }

      if (featured && coverImage) {
        try {
          // Upload new cover images
          const coverImagesToUpload = [coverImage, croppedCoverImage].filter((img): img is File => img !== null);
          const coverUploadResults = await uploadFiles(coverImagesToUpload, {
            category: 'appointments',
            allowedTypes: FILE_TYPES.IMAGE,
            prefix: 'cover'
          });

          // Map results to metadata structure
          const newCoverImages = {
            coverImageUrl: coverUploadResults[0]?.url,
            croppedCoverImageUrl: coverUploadResults[1]?.url || null
          };

          // Parse existing metadata
          const metadata = parseAppointmentMetadata(existingAppointment?.metadata);
          const oldCoverImageUrl = metadata.coverImageUrl || null;
          const oldCroppedCoverImageUrl = metadata.croppedCoverImageUrl || null;

          // Delete old images if they exist
          if (oldCoverImageUrl || oldCroppedCoverImageUrl) {
            try {
              const urlsToDelete = [];

              if (oldCoverImageUrl) urlsToDelete.push(oldCoverImageUrl);
              if (oldCroppedCoverImageUrl) urlsToDelete.push(oldCroppedCoverImageUrl);

              if (urlsToDelete.length > 0) {
                logger.info('Deleting old cover images', {
                  module: 'appointment-handlers',
                  context: { urlsToDelete }
                });
                await deleteFiles(urlsToDelete);
              }
            } catch (deleteError) {
              logger.error('Error deleting old cover images', {
                module: 'appointment-handlers',
                context: { error: deleteError }
              });
              // Continue with the update even if deletion fails
            }
          }

          // Update metadata with new cover image URLs
          data.metadata = JSON.stringify({
            ...metadata,
            ...newCoverImages
          });
        } catch (uploadError) {
          logger.error('Error uploading cover image to Blob Store', {
            module: 'appointment-handlers',
            context: { error: uploadError }
          });
        }
      }
    } else {
      // Handle JSON data
      data = await request.json() as AppointmentUpdateData;
    }
    
    const {
      id,
      processed,
      status,
      title,
      mainText,
      startDateTime,
      endDateTime,
      street,
      city,
      state,
      postalCode,
      firstName,
      lastName,
      recurringText,
      fileUrls,
      featured,
      rejectionReason
    } = data;

    if (!id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Prisma.AppointmentUpdateInput = {};

    // Handle processed flag if present
    if (processed !== undefined) {
      updateData.processed = processed;
      updateData.processingDate = processed ? new Date() : null;
    }

    // Handle status change if present
    if (status !== undefined) {
      // Validate status value
      if (!['pending', 'accepted', 'rejected'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status value. Must be one of: pending, accepted, rejected' },
          { status: 400 }
        );
      }
      updateData.status = status;

      // When status changes, update processing info as well
      if (status !== 'pending') {
        updateData.processed = true;
        updateData.processingDate = new Date();
        updateData.statusChangeDate = new Date();
      }
    }
    
    // Handle other editable fields
    if (title !== undefined) updateData.title = title;
    if (mainText !== undefined) updateData.mainText = mainText;
    if (startDateTime !== undefined) updateData.startDateTime = new Date(startDateTime);
    if (endDateTime !== undefined) updateData.endDateTime = endDateTime ? new Date(endDateTime) : null;
    if (street !== undefined) updateData.street = street;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (postalCode !== undefined) updateData.postalCode = postalCode;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (recurringText !== undefined) updateData.recurringText = recurringText;
    if (fileUrls !== undefined) updateData.fileUrls = fileUrls;
    if (featured !== undefined) updateData.featured = featured;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: Number(id) },
      data: updateData,
    });

    logger.info('Appointment updated', {
      module: 'appointment-handlers',
      context: { id: updatedAppointment.id }
    });

    // Clear cache for this appointment
    return NextResponse.json(updatedAppointment);
  } catch (error) {
    logger.error('Error updating appointment', {
      module: 'appointment-handlers',
      context: { error }
    });
    return serverErrorResponse('Failed to update appointment');
  }
}

/**
 * Deletes an appointment with complete cleanup of associated resources.
 *
 * @param request Pre-validated NextRequest with appointment ID from API route level
 * @returns Promise resolving to NextResponse with deletion success confirmation
 * @throws Error Only for business logic failures (database operations, file cleanup failures, external service errors)
 *
 * Note: ID validation is handled at API route level.
 * This function assumes appointment ID validation has already passed.
 * Performs complete cleanup including file attachments and cover images from Vercel Blob.
 *
 * Cleanup operations:
 * - Deletes all file attachments from Blob storage
 * - Removes cover images and cropped versions from storage
 * - Removes database record with consistency checks
 * - Continues operation even if some file deletions fail (graceful degradation)
 */
export async function deleteAppointment(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }
    
    // Get the appointment to check for files to delete
    const appointment = await prisma.appointment.findUnique({
      where: { id: Number(id) },
      select: {
        fileUrls: true,
        metadata: true
      }
    });
    
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }
    
    // Delete files from blob storage if they exist
    const filesToDelete: string[] = [];
    
    // Check for regular file attachments
    if (appointment.fileUrls) {
      try {
        const fileUrls = JSON.parse(appointment.fileUrls as string);
        if (Array.isArray(fileUrls)) {
          filesToDelete.push(...fileUrls);
        }
      } catch (e) {
        logger.warn('Error parsing file URLs', {
          module: 'appointment-handlers',
          context: { error: e }
        });
      }
    }
    
    // Check for cover images in metadata
    if (appointment.metadata) {
      const metadata = parseAppointmentMetadata(appointment.metadata);
      if (metadata.coverImageUrl) {
        filesToDelete.push(metadata.coverImageUrl);
      }
      if (metadata.croppedCoverImageUrl) {
        filesToDelete.push(metadata.croppedCoverImageUrl);
      }
    }
    
    // Delete files from blob storage
    if (filesToDelete.length > 0) {
      try {
        logger.info('Deleting files from blob storage', {
          module: 'appointment-handlers',
          context: { count: filesToDelete.length }
        });
        await deleteFiles(filesToDelete);
      } catch (deleteError) {
        logger.error('Error deleting files from blob storage', {
          module: 'appointment-handlers',
          context: { error: deleteError }
        });
        // Continue with appointment deletion even if file deletion fails
      }
    }

    // Delete the appointment from the database
    await prisma.appointment.delete({
      where: { id: Number(id) }
    });

    logger.info('Appointment deleted', {
      module: 'appointment-handlers',
      context: { id: Number(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting appointment', {
      module: 'appointment-handlers',
      context: { error }
    });
    return serverErrorResponse('Failed to delete appointment');
  }
}