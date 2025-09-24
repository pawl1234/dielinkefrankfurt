import { NextRequest, NextResponse } from 'next/server';
import prisma from './prisma';
import type { Appointment, Prisma } from '@prisma/client';
import { serverErrorResponse } from './api-auth';
import { put, del } from '@vercel/blob';
import {
  AppError,
  apiErrorResponse,
  validationErrorResponse,
  handleFileUploadError,
  handleDatabaseError,
  getLocalizedErrorMessage
} from './errors';
import { validateFile, ALLOWED_ATTACHMENT_TYPES, FileUploadError } from './file-handlers';
import { validateAppointmentSubmitWithZod, type AppointmentSubmitData } from './validation/appointment';

/**
 * Types for appointment operations
 */
interface AppointmentMetadata {
  coverImageUrl?: string;
  croppedCoverImageUrl?: string;
}
export interface AppointmentUpdateData {
  id: number;         // Pre-validated: valid appointment ID, required
  processed?: boolean; // Pre-validated: boolean value (when provided)
  status?: 'pending' | 'accepted' | 'rejected'; // Pre-validated: valid status enum (when provided)
  title?: string;     // Pre-validated: 3-200 chars (when provided)
  teaser?: string;    // Pre-validated: 10-500 chars (when provided)
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
  teaser: string;     // Pre-validated: 10-500 chars, required
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
    console.error('Error fetching appointments:', error);
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
    console.error('Error fetching public appointments:', error);
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
        teaser: true,
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
    console.error('Error fetching newsletter appointments:', error);
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
      console.error('Could not update appointment featured status in DB:', dbError);
      return serverErrorResponse('Failed to update appointment in database');
    }
  } catch (error) {
    console.error('Error updating appointment featured status:', error);
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
 * @throws AppError Only for business logic failures (database operations, file upload failures, external service errors)
 *
 * Note: Input validation is handled at API route level using Zod schemas.
 * This function assumes all field validation has already passed.
 * Handles file uploads to Vercel Blob, cover image processing, and database transactions.
 *
 * Business rules enforced:
 * - Featured appointments require cover image
 * - Files are validated against ALLOWED_ATTACHMENT_TYPES
 * - Database connection is verified before operations
 * - File URLs are stored as JSON strings in database
 */
export async function createAppointmentWithFiles(
  validatedData: AppointmentSubmitData,
  formData: FormData,
  featured: boolean
) {
  // Note: Validation is handled by the route handler

  // Process multiple file uploads if present using Vercel Blob Store
  const fileCount = formData.get('fileCount');
  const fileUrls: string[] = [];
  let coverImageUrl: string | null = null;
  let croppedCoverImageUrl: string | null = null;

    if (fileCount) {
      const count = parseInt(fileCount as string, 10);

      // Process files sequentially to upload to Vercel Blob Store
      for (let i = 0; i < count; i++) {
        const file = formData.get(`file-${i}`) as File | null;

        if (file) {
          // Validate file using centralized validation
          try {
            validateFile(file, ALLOWED_ATTACHMENT_TYPES);
          } catch (error) {
            if (error instanceof FileUploadError) {
              throw handleFileUploadError(error, { fileName: file.name });
            }
            throw handleFileUploadError(error, { fileName: file.name });
          }

          try {
            // Create a unique pathname for the blob
            const timestamp = new Date().getTime();
            const sanitizedFileName = file.name.replace(/\s+/g, '-');
            const blobPathname = `appointments/${timestamp}-${i}-${sanitizedFileName}`;

            // Upload the file to Vercel Blob Store
            console.log(`Uploading file ${i+1}/${count} to Blob Store: ${blobPathname}`);

            // Get the file data as an ArrayBuffer and convert to Blob for upload
            const arrayBuffer = await file.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: file.type });

            // Upload to Vercel Blob Store with public access
            const { url } = await put(blobPathname, blob, {
              access: 'public',
              contentType: file.type,
              // Add useful metadata
              addRandomSuffix: false, // Use our own timestamp-based naming
              cacheControlMaxAge: 31536000, // Cache for 1 year (60 * 60 * 24 * 365)
            });

            console.log(`✅ File uploaded successfully to: ${url}`);

            // Add the URL to the array for storing in the database
            fileUrls.push(url);
          } catch (uploadError) {
            throw handleFileUploadError(uploadError, { 
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              index: i
            });
          }
        }
      }
    }

    // Process cover image if present (for featured appointments)
    if (featured) {
      const coverImage = formData.get('coverImage') as File | null;
      const croppedCoverImage = formData.get('croppedCoverImage') as File | null;

      if (!coverImage && featured) {
        throw AppError.validation('Cover-Bild ist für Featured-Termine erforderlich');
      }

      if (coverImage) {
        try {
          // Create unique pathnames for both images
          const timestamp = new Date().getTime();
          const sanitizedFileName = coverImage.name.replace(/\s+/g, '-');
          const originalBlobPathname = `appointments/${timestamp}-cover-${sanitizedFileName}`;
          
          // Upload original cover image
          const arrayBuffer = await coverImage.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: coverImage.type });
          
          const { url } = await put(originalBlobPathname, blob, {
            access: 'public',
            contentType: coverImage.type,
            addRandomSuffix: false,
            cacheControlMaxAge: 31536000, // Cache for 1 year
          });
          
          console.log(`✅ Cover image uploaded successfully to: ${url}`);
          coverImageUrl = url;
          
          // Upload cropped cover image if available
          if (croppedCoverImage) {
            const croppedArrayBuffer = await croppedCoverImage.arrayBuffer();
            const croppedBlob = new Blob([croppedArrayBuffer], { type: croppedCoverImage.type });
            
            // Use _crop suffix to identify cropped versions
            const croppedBlobPathname = `appointments/${timestamp}-cover-${sanitizedFileName.replace(/\.[^.]+$/, '')}_crop.jpg`;
            
            const { url: croppedUrl } = await put(croppedBlobPathname, croppedBlob, {
              access: 'public',
              contentType: 'image/jpeg',
              addRandomSuffix: false,
              cacheControlMaxAge: 31536000, // Cache for 1 year
            });
            
            console.log(`✅ Cropped cover image uploaded successfully to: ${croppedUrl}`);
            croppedCoverImageUrl = croppedUrl;
          }
        } catch (uploadError) {
          throw handleFileUploadError(uploadError, { 
            fileName: coverImage.name,
            fileSize: coverImage.size,
            fileType: coverImage.type,
            isCoverImage: true
          });
        }
      }
    }

    // Save appointment to database
    try {
      // First check database connection
      try {
        // Use a simple query that works with both PostgreSQL and SQLite
        const result = await prisma.$queryRaw`SELECT 1 as connection_test`;
        console.log('✅ Database connection confirmed:', result);
      } catch (connectionError) {
        throw AppError.database('Database connection failed. Please try again later.', 
          connectionError instanceof Error ? connectionError : undefined);
      }

      // Connection successful, proceed with creating appointment
      const appointmentData = {
        title: validatedData.title,
        teaser: validatedData.teaser || '',
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
        status: 'pending' as const,
        // Store file URLs as JSON strings
        fileUrls: fileUrls.length > 0 ? JSON.stringify(fileUrls) : null,
        // Store cover image URLs in metadata field
        metadata: coverImageUrl ? JSON.stringify({
          coverImageUrl,
          croppedCoverImageUrl
        }) : null,
      };
      
      const newAppointment = await prisma.appointment.create({
        data: appointmentData,
      });

      console.log('✅ Appointment successfully saved to database with ID:', newAppointment.id);
      return newAppointment;
    } catch (dbError) {
      throw handleDatabaseError(dbError, 'appointment creation');
    }
}

/**
 * Creates a new appointment submission (legacy handler with validation).
 *
 * @param request Pre-validated NextRequest with FormData from API route level
 * @returns Promise resolving to NextResponse with creation success message
 * @throws Error Only for business logic failures (database operations, file upload failures, validation failures)
 *
 * Note: This function maintains backward compatibility by extracting form data.
 * Performs Zod validation internally before calling createAppointmentWithFiles.
 * Will be deprecated in favor of direct createAppointmentWithFiles usage.
 */
export async function createAppointment(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract text fields
    const appointmentData = {
      title: formData.get('title') as string,
      teaser: formData.get('teaser') as string || undefined,
      mainText: formData.get('mainText') as string,
      startDateTime: formData.get('startDateTime') as string,
      endDateTime: (formData.get('endDateTime') as string) || undefined,
      street: formData.get('street') as string || undefined,
      city: formData.get('city') as string || undefined,
      state: formData.get('state') as string || undefined,
      postalCode: formData.get('postalCode') as string || undefined,
      firstName: formData.get('firstName') as string || undefined,
      lastName: formData.get('lastName') as string || undefined,
      recurringText: formData.get('recurringText') as string || undefined
    };

    const featured = formData.get('featured') === 'true';

    // Validate appointment data using Zod schema
    const validationResult = await validateAppointmentSubmitWithZod(appointmentData);
    if (!validationResult.isValid && validationResult.errors) {
      return validationErrorResponse(validationResult.errors);
    }

    // Use validated data from Zod (guaranteed to be correct after validation)
    const validatedData = validationResult.data!;

    // Call the new business logic function
    const newAppointment = await createAppointmentWithFiles(validatedData, formData, featured);

    // Return the same response format as before
    return NextResponse.json({
      success: true,
      appointmentId: newAppointment.id,
      message: 'Terminanfrage erfolgreich eingereicht'
    });
  } catch (error) {
    return apiErrorResponse(error, 'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.');
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
        const uploadedFiles = [];
        
        for (let i = 0; i < count; i++) {
          const file = formData.get(`file-${i}`);
          if (file instanceof Blob) {
            // Process file upload
            try {
              // Create a unique pathname for the blob
              const timestamp = new Date().getTime();
              const sanitizedFileName = file.name ? file.name.replace(/\s+/g, '-') : `file-${i}`;
              const blobPathname = `appointments/${timestamp}-${i}-${sanitizedFileName}`;
              
              // Upload the file to Vercel Blob Store
              const arrayBuffer = await file.arrayBuffer();
              const blob = new Blob([arrayBuffer], { type: file.type });
              
              const { url } = await put(blobPathname, blob, {
                access: 'public',
                contentType: file.type,
                addRandomSuffix: false,
                cacheControlMaxAge: 31536000, // Cache for 1 year
              });
              
              console.log(`✅ File uploaded successfully to: ${url}`);
              uploadedFiles.push(url);
            } catch (uploadError) {
              console.error('Error uploading file:', uploadError);
            }
          }
        }
        
        // Get existing file URLs if any
        let existingFiles: string[] = [];
        const existingFileUrls = formData.get('existingFileUrls');
        if (existingFileUrls && typeof existingFileUrls === 'string') {
          try {
            existingFiles = JSON.parse(existingFileUrls);
          } catch (e) {
            console.error('Error parsing existing file URLs:', e);
          }
        }
        
        // Combine existing and new file URLs
        data.fileUrls = JSON.stringify([...existingFiles, ...uploadedFiles]);
      } else {
        // If no new files, just preserve existing files
        const existingFileUrls = formData.get('existingFileUrls');
        if (existingFileUrls && typeof existingFileUrls === 'string') {
          try {
            const existingFiles = JSON.parse(existingFileUrls);
            data.fileUrls = JSON.stringify(existingFiles);
          } catch (e) {
            console.error('Error parsing existing file URLs:', e);
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
            console.log(`🗑️ Deleting ${urlsToDelete.length} removed attachment files:`, urlsToDelete);
            await del(urlsToDelete);
            console.log(`✅ Removed attachment files deleted successfully`);
          }
        } catch (deleteError) {
          console.error(`❌ Error deleting removed attachment files:`, deleteError);
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
          let oldCoverImageUrl: string | null = null;
          let oldCroppedCoverImageUrl: string | null = null;
          
          if (existingAppointment?.metadata) {
            try {
              const metadata: AppointmentMetadata = 
                JSON.parse(existingAppointment.metadata);
              oldCoverImageUrl = metadata.coverImageUrl || null;
              oldCroppedCoverImageUrl = metadata.croppedCoverImageUrl || null;
            } catch (e) {
              console.error('Error parsing existing metadata:', e);
            }
          }
          
          // Delete old images if they exist
          if (oldCoverImageUrl || oldCroppedCoverImageUrl) {
            try {
              const urlsToDelete = [];
              
              if (oldCoverImageUrl) urlsToDelete.push(oldCoverImageUrl);
              if (oldCroppedCoverImageUrl) urlsToDelete.push(oldCroppedCoverImageUrl);
              
              if (urlsToDelete.length > 0) {
                console.log(`🗑️ Removing cover images for non-featured appointment:`, urlsToDelete);
                await del(urlsToDelete);
                console.log(`✅ Cover images removed successfully`);
              }
            } catch (deleteError) {
              console.error(`❌ Error deleting cover images:`, deleteError);
            }
          }
          
          // Clear metadata for cover images
          data.metadata = JSON.stringify({});
        } catch (error) {
          console.error('Error handling featured status change:', error);
        }
      }
      
      if (featured && coverImage) {
        try {
          console.log("Processing cover image upload...");
          console.log("Cover image type:", coverImage.type);
          console.log("Cover image size:", coverImage.size);
          
          // Create a unique pathname for the blob
          const timestamp = new Date().getTime();
          const sanitizedFileName = coverImage.name ? coverImage.name.replace(/\s+/g, '-') : 'cover.jpg';
          const originalBlobPathname = `appointments/${timestamp}-cover-${sanitizedFileName}`;
          
          console.log("Original blob pathname:", originalBlobPathname);
          
          // Upload original cover image
          const arrayBuffer = await coverImage.arrayBuffer();
          console.log("Array buffer obtained, size:", arrayBuffer.byteLength);
          
          const blob = new Blob([arrayBuffer], { type: coverImage.type || 'image/jpeg' });
          console.log("Created blob with type:", blob.type);
          
          console.log("Uploading original cover image...");
          const { url } = await put(originalBlobPathname, blob, {
            access: 'public',
            contentType: coverImage.type || 'image/jpeg',
            addRandomSuffix: false,
            cacheControlMaxAge: 31536000, // Cache for 1 year
          });
          
          console.log(`✅ Cover image uploaded successfully to: ${url}`);
          const coverImageUrl = url;
          let croppedCoverImageUrl = null;
          
          // Upload cropped cover image if available
          if (croppedCoverImage) {
            console.log("Processing cropped cover image...");
            console.log("Cropped image type:", croppedCoverImage.type);
            console.log("Cropped image size:", croppedCoverImage.size);
            
            const croppedArrayBuffer = await croppedCoverImage.arrayBuffer();
            console.log("Cropped array buffer obtained, size:", croppedArrayBuffer.byteLength);
            
            const croppedBlob = new Blob([croppedArrayBuffer], { type: croppedCoverImage.type || 'image/jpeg' });
            console.log("Created cropped blob with type:", croppedBlob.type);
            
            // Use _crop suffix to identify cropped versions
            const croppedBlobPathname = `appointments/${timestamp}-cover-${sanitizedFileName.replace(/\.[^.]+$/, '')}_crop.jpg`;
            console.log("Cropped blob pathname:", croppedBlobPathname);
            
            console.log("Uploading cropped cover image...");
            const { url: croppedUrl } = await put(croppedBlobPathname, croppedBlob, {
              access: 'public',
              contentType: 'image/jpeg',
              addRandomSuffix: false,
              cacheControlMaxAge: 31536000, // Cache for 1 year
            });
            
            console.log(`✅ Cropped cover image uploaded successfully to: ${croppedUrl}`);
            croppedCoverImageUrl = croppedUrl;
          }
          
          // Parse existing metadata if available
          let metadata: AppointmentMetadata = {};
          let oldCoverImageUrl: string | null = null;
          let oldCroppedCoverImageUrl: string | null = null;
          
          if (existingAppointment?.metadata) {
            try {
              metadata = JSON.parse(existingAppointment.metadata);
              oldCoverImageUrl = metadata.coverImageUrl || null;
              oldCroppedCoverImageUrl = metadata.croppedCoverImageUrl || null;
            } catch (e) {
              console.error('Error parsing existing metadata:', e);
            }
          }
          
          // Delete old images if they exist
          if (oldCoverImageUrl || oldCroppedCoverImageUrl) {
            try {
              const urlsToDelete = [];
              
              if (oldCoverImageUrl) urlsToDelete.push(oldCoverImageUrl);
              if (oldCroppedCoverImageUrl) urlsToDelete.push(oldCroppedCoverImageUrl);
              
              if (urlsToDelete.length > 0) {
                console.log(`🗑️ Deleting old cover images:`, urlsToDelete);
                await del(urlsToDelete);
                console.log(`✅ Old cover images deleted successfully`);
              }
            } catch (deleteError) {
              console.error(`❌ Error deleting old cover images:`, deleteError);
              // Continue with the update even if deletion fails
            }
          }
          
          // Update metadata with new cover image URLs
          data.metadata = JSON.stringify({
            ...metadata,
            coverImageUrl,
            croppedCoverImageUrl
          });
        } catch (uploadError) {
          console.error(`❌ Error uploading cover image to Blob Store:`, uploadError);
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
      teaser, 
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
    if (teaser !== undefined) updateData.teaser = teaser;
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
      console.log("📝 Adding metadata to update:", data.metadata);
    }

    console.log("📊 Final update data being sent to database:", updateData);

    const updatedAppointment = await prisma.appointment.update({
      where: { id: Number(id) },
      data: updateData,
    });
    
    console.log("✅ Appointment updated successfully with ID:", updatedAppointment.id);

    // Clear cache for this appointment
    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
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
        console.error('Error parsing file URLs:', e);
      }
    }
    
    // Check for cover images in metadata
    if (appointment.metadata) {
      try {
        const metadata = JSON.parse(appointment.metadata);
        if (metadata.coverImageUrl) {
          filesToDelete.push(metadata.coverImageUrl);
        }
        if (metadata.croppedCoverImageUrl) {
          filesToDelete.push(metadata.croppedCoverImageUrl);
        }
      } catch (e) {
        console.error('Error parsing metadata:', e);
      }
    }
    
    // Delete files from blob storage
    if (filesToDelete.length > 0) {
      try {
        console.log(`🗑️ Deleting ${filesToDelete.length} files from blob storage`);
        await del(filesToDelete);
        console.log('✅ Files deleted successfully');
      } catch (deleteError) {
        console.error('❌ Error deleting files from blob storage:', deleteError);
        // Continue with appointment deletion even if file deletion fails
      }
    }
    
    // Delete the appointment from the database
    await prisma.appointment.delete({
      where: { id: Number(id) }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return serverErrorResponse('Failed to delete appointment');
  }
}