import { NextRequest, NextResponse } from 'next/server';
import type { Appointment, Prisma } from '@prisma/client';
import { handleDatabaseError, AppError, ErrorType } from '@/lib/errors';
import { type AppointmentSubmitData } from '@/lib/validation/appointment';
import { logger } from '@/lib/logger';
import {
  uploadAppointmentFiles,
  uploadCoverImages,
  processFileUpdates,
  processFileDeletions,
  processCoverImageUpdate,
  deleteAllAppointmentFiles
} from './file-handlers';
import {
  findAppointmentByIdPartial,
  createAppointment,
  updateAppointmentById,
  deleteAppointmentById
} from '@/lib/db/appointment-operations';
import { generateAppointmentSlug } from './slug-generator';

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
  locationDetails?: string | null;     // Pre-validated: max 100 chars (when provided)
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
  locationDetails?: string;     // Pre-validated: max 100 chars (when provided)
  postalCode?: string; // Pre-validated: valid postal code format (when provided)
  firstName?: string; // Pre-validated: 2-50 chars (when provided)
  lastName?: string;  // Pre-validated: 2-50 chars (when provided)
  recurringText?: string; // Pre-validated: max 500 chars (when provided)
  featured?: boolean; // Pre-validated: boolean value (when provided)
}

/**
 * Updates appointment featured status with validation.
 *
 * @param request - Pre-validated NextRequest with JSON body from API route level
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
      const updatedAppointment = await updateAppointmentById(Number(id), { featured });
      return NextResponse.json(updatedAppointment);
    } catch (dbError) {
      logger.error('Could not update appointment featured status in DB', {
        module: 'appointments/appointment-mutations',
        context: { error: dbError }
      });
      return new AppError('Fehler beim Aktualisieren des Featured-Status in der Datenbank', ErrorType.UNKNOWN, 500).toResponse();
    }
  } catch (error) {
    logger.error('Error updating appointment featured status', {
      module: 'appointments/appointment-mutations',
      context: { error }
    });
    return new AppError('Fehler beim Aktualisieren des Featured-Status', ErrorType.UNKNOWN, 500).toResponse();
  }
}

/**
 * Creates a new appointment with validated data, file uploads, and cover image processing.
 *
 * @param validatedData - Pre-validated appointment data from Zod schema validation at API route level
 * @param formData - Form data containing files for upload to Vercel Blob Storage
 * @param featured - Whether appointment should be featured (requires cover image)
 * @returns Promise resolving to created appointment with uploaded file URLs and metadata
 * @throws Error Only for business logic failures (database operations, file upload failures, external service errors)
 *
 * Note: Input validation is handled at API route level using Zod schemas.
 * This function assumes all field validation has already passed.
 * Handles file uploads to Vercel Blob, cover image processing, and database transactions.
 *
 * Business rules enforced:
 * - Featured appointments require cover image
 * - Files are validated against allowed types
 * - File URLs are stored as JSON strings in database
 */
export async function createAppointmentWithFiles(
  validatedData: AppointmentSubmitData,
  formData: FormData,
  featured: boolean
): Promise<Appointment> {
  // Upload regular attachments
  const files = formData.getAll('files') as (File | Blob)[];
  const fileUrls = await uploadAppointmentFiles(files);

  // Upload cover images if featured
  let metadataJson: string | null = null;

  if (featured) {
    const coverImage = formData.get('coverImage') as File | null;
    const croppedCoverImage = formData.get('croppedCoverImage') as File | null;

    if (!coverImage) {
      throw new Error('Cover-Bild ist für Featured-Termine erforderlich');
    }

    const metadata = await uploadCoverImages(coverImage, croppedCoverImage);
    metadataJson = Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null;
  }

  // Save to database
  try {
    const appointment = await createAppointment({
      title: validatedData.title,
      mainText: validatedData.mainText,
      startDateTime: new Date(validatedData.startDateTime),
      endDateTime: validatedData.endDateTime ? new Date(validatedData.endDateTime) : null,
      street: validatedData.street || '',
      city: validatedData.city || '',
      locationDetails: validatedData.locationDetails || '',
      postalCode: validatedData.postalCode || '',
      firstName: validatedData.firstName || '',
      lastName: validatedData.lastName || '',
      recurringText: validatedData.recurringText || '',
      featured,
      status: 'pending',
      fileUrls: fileUrls.length > 0 ? JSON.stringify(fileUrls) : null,
      metadata: metadataJson,
    });

    logger.info('Appointment created with files', {
      module: 'appointments/appointment-mutations',
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
 * @param request - Pre-validated NextRequest with FormData or JSON from API route level
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

      // Process file uploads and deletions
      data.fileUrls = await processFileUpdates(formData);
      await processFileDeletions(formData);

      // Get the existing appointment metadata
      const existingAppointment = await findAppointmentByIdPartial<{ metadata: string | null; featured: boolean }>(
        Number(data.id),
        { metadata: true, featured: true }
      );

      // Process cover image updates
      if (existingAppointment) {
        data.metadata = await processCoverImageUpdate(
          formData,
          Number(data.id),
          existingAppointment.metadata
        );
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
      locationDetails,
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

      // Generate slug when status changes to "accepted" (T031-T034)
      if (status === 'accepted') {
        // Fetch current appointment to check if slug already exists and get title
        const currentAppointment = await findAppointmentByIdPartial<{ slug: string | null; title: string }>(
          Number(id),
          { slug: true, title: true }
        );

        // Only generate slug if not already set
        if (currentAppointment && !currentAppointment.slug) {
          try {
            const slug = generateAppointmentSlug(currentAppointment.title, Number(id));
            updateData.slug = slug;
          } catch (slugError) {
            // Log error but continue with acceptance (T032)
            logger.error('Slug generation failed during appointment acceptance', {
              module: 'appointments/appointment-mutations',
              context: {
                appointmentId: id,
                title: currentAppointment?.title,
                error: slugError,
              },
              tags: ['slug-generation', 'admin-action'],
            });
            // Slug remains NULL, acceptance succeeds
          }
        }
      }
    }

    /**
     * Slug Regeneration on Title Change
     *
     * When an admin changes the appointment title, regenerate the slug to keep
     * URLs readable and accurate. This ensures shared links reflect current content.
     *
     * Note: Only regenerates for appointments that already have a slug. Old appointments
     * (created before slug feature) without slugs remain unchanged to preserve their
     * numeric-only URLs (/termine/123).
     */
    if (title !== undefined) {
      const currentAppointment = await findAppointmentByIdPartial<{ slug: string | null }>(
        Number(id),
        { slug: true }
      );

      if (currentAppointment?.slug) {
        try {
          const newSlug = generateAppointmentSlug(title, Number(id));
          updateData.slug = newSlug;

          logger.info('Slug regenerated due to title change', {
            module: 'appointments/appointment-mutations',
            context: {
              appointmentId: id,
              oldSlug: currentAppointment.slug,
              newSlug: newSlug,
            },
            tags: ['slug-regeneration', 'admin-action'],
          });
        } catch (slugError) {
          logger.error('Slug regeneration failed on title change', {
            module: 'appointments/appointment-mutations',
            context: {
              appointmentId: id,
              newTitle: title,
              error: slugError,
            },
            tags: ['slug-regeneration', 'admin-action'],
          });
        }
      }
    }

    // Handle other editable fields
    if (title !== undefined) updateData.title = title;
    if (mainText !== undefined) updateData.mainText = mainText;
    if (startDateTime !== undefined) updateData.startDateTime = new Date(startDateTime);
    if (endDateTime !== undefined) updateData.endDateTime = endDateTime ? new Date(endDateTime) : null;
    if (street !== undefined) updateData.street = street;
    if (city !== undefined) updateData.city = city;
    if (locationDetails !== undefined) updateData.locationDetails = locationDetails;
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

    const updatedAppointment = await updateAppointmentById(Number(id), updateData);

    // Clear cache for this appointment
    return NextResponse.json(updatedAppointment);
  } catch (error) {
    logger.error('Error updating appointment', {
      module: 'appointments/appointment-mutations',
      context: { error }
    });
    return new AppError('Fehler beim Aktualisieren des Termins', ErrorType.UNKNOWN, 500).toResponse();
  }
}

/**
 * Deletes an appointment with complete cleanup of associated resources.
 *
 * @param request - Pre-validated NextRequest with appointment ID from API route level
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
    const appointment = await findAppointmentByIdPartial<{ fileUrls: string | null; metadata: string | null }>(
      Number(id),
      { fileUrls: true, metadata: true }
    );

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Delete all associated files
    await deleteAllAppointmentFiles(appointment.fileUrls, appointment.metadata);

    // Delete the appointment from the database
    await deleteAppointmentById(Number(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting appointment', {
      module: 'appointments/appointment-mutations',
      context: { error }
    });
    return new AppError('Fehler beim Löschen des Termins', ErrorType.UNKNOWN, 500).toResponse();
  }
}
