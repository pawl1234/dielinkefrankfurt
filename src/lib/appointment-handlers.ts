import { NextRequest, NextResponse } from 'next/server';
import prisma from './prisma';
import { serverErrorResponse } from './api-auth';
import { put, del } from '@vercel/blob';

/**
 * Types for appointment operations
 */
export interface AppointmentUpdateData {
  id: number;
  processed?: boolean;
  status?: 'pending' | 'accepted' | 'rejected';
  title?: string;
  teaser?: string;
  mainText?: string;
  startDateTime?: string | Date;
  endDateTime?: string | Date | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  recurringText?: string | null;
  fileUrls?: string | null;
  featured?: boolean;
  metadata?: string | null;
}

export interface AppointmentCreateData {
  title: string;
  teaser: string;
  mainText: string;
  startDateTime: string;
  endDateTime?: string | null;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  firstName?: string;
  lastName?: string;
  recurringText?: string;
  featured?: boolean;
}

/**
 * Get all appointments with optional filtering
 */
export async function getAppointments(request: NextRequest) {
  try {
    // Get query parameters for filtering
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'all';
    const status = url.searchParams.get('status');
    const id = url.searchParams.get('id');

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
      
      return NextResponse.json(appointment);
    }

    // Build filter based on parameters
    const filter: any = {};
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

    // Get appointments with filters
    const appointments = await prisma.appointment.findMany({
      where: filter,
      orderBy: [
        // For upcoming events, sort by date ascending
        ...(view === 'upcoming' ? [{ startDateTime: 'asc' as const }] : []),
        // For all other views, newest first
        { createdAt: 'desc' as const }
      ],
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return serverErrorResponse('Failed to fetch appointments');
  }
}

/**
 * Get public appointments (accepted status only)
 */
export async function getPublicAppointments(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
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
      
      return NextResponse.json(appointment);
    }
    
    // Otherwise, return filtered appointments
    const currentDate = new Date();
    
    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'accepted',
        startDateTime: {
          gte: currentDate // Only future appointments
        }
      },
      orderBy: {
        startDateTime: 'asc' // Chronological order
      },
      select: {
        id: true,
        title: true,
        teaser: true,
        startDateTime: true,
        endDateTime: true,
        street: true,
        city: true,
        state: true,
        postalCode: true
      }
    });
    
    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error fetching public appointments:', error);
    return serverErrorResponse('Failed to fetch appointments');
  }
}

/**
 * Get newsletter ready appointments (accepted and future date)
 */
export async function getNewsletterAppointments(request: NextRequest) {
  try {
    // Get all future accepted appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'accepted',
        startDateTime: {
          gte: new Date() // Only future events
        }
      },
      orderBy: {
        startDateTime: 'asc'
      },
      select: {
        id: true,
        title: true,
        teaser: true,
        startDateTime: true,
        featured: true
      }
    });
    
    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error fetching newsletter appointments:', error);
    return serverErrorResponse('Failed to fetch appointments');
  }
}

/**
 * Update appointment featured status
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
 * Create a new appointment submission
 */
export async function createAppointment(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract text fields
    const title = formData.get('title') as string;
    const teaser = formData.get('teaser') as string;
    const mainText = formData.get('mainText') as string;
    const startDateTime = formData.get('startDateTime') as string;
    const endDateTime = formData.get('endDateTime') as string || null;
    const street = formData.get('street') as string || '';
    const city = formData.get('city') as string || '';
    const state = formData.get('state') as string || '';
    const postalCode = formData.get('postalCode') as string || '';
    const firstName = formData.get('firstName') as string || '';
    const lastName = formData.get('lastName') as string || '';
    const recurringText = formData.get('recurringText') as string || '';
    const featured = formData.get('featured') === 'true';

    // Additional validation
    if (!teaser || !mainText || !startDateTime) {
      return NextResponse.json(
        { error: 'Pflichtfelder fehlen' },
        { status: 400 }
      );
    }

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
          // Check file size (5MB)
          if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
              { error: 'File size exceeds 5MB limit. Please upload smaller files.' },
              { status: 400 }
            );
          }

          // Check file type
          const fileType = file.type;
          if (!['image/jpeg', 'image/png', 'application/pdf'].includes(fileType)) {
            return NextResponse.json(
              { error: 'Unsupported file type. Please upload only JPEG, PNG, or PDF files.' },
              { status: 400 }
            );
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
            console.error(`❌ Error uploading file to Blob Store:`, uploadError);
            return NextResponse.json(
              { error: 'Fehler beim Hochladen der Datei. Bitte versuchen Sie es später erneut.' },
              { status: 500 }
            );
          }
        }
      }
    }

    // Process cover image if present (for featured appointments)
    if (featured) {
      const coverImage = formData.get('coverImage') as File | null;
      const croppedCoverImage = formData.get('croppedCoverImage') as File | null;

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
          console.error(`❌ Error uploading cover image to Blob Store:`, uploadError);
          return NextResponse.json(
            { error: 'Fehler beim Hochladen des Cover-Bildes. Bitte versuchen Sie es später erneut.' },
            { status: 500 }
          );
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
        console.error('❌ Database connection test failed:', connectionError);
        return NextResponse.json(
          { error: 'Database connection failed. Please try again later.' },
          { status: 503 }
        );
      }

      // Connection successful, proceed with creating appointment
      const newAppointment = await prisma.appointment.create({
        data: {
          title,
          teaser,
          mainText,
          startDateTime: new Date(startDateTime),
          endDateTime: endDateTime ? new Date(endDateTime) : null,
          street,
          city,
          state,
          postalCode,
          firstName,
          lastName,
          recurringText,
          featured,
          // Store file URLs as JSON strings
          fileUrls: fileUrls.length > 0 ? JSON.stringify(fileUrls) : null,
          // Store cover image URLs in metadata field
          ...(coverImageUrl && {
            metadata: JSON.stringify({
              coverImageUrl,
              croppedCoverImageUrl
            })
          }),
        } as any // Use type assertion to bypass the type error
      });
      console.log('✅ Appointment successfully saved to database with ID:', newAppointment.id);
      
      return NextResponse.json({ success: true, id: newAppointment.id });
    } catch (dbError) {
      console.error('❌ Error saving to database:', dbError);
      // Log more detailed error information
      if (dbError instanceof Error) {
        console.error('Error message:', dbError.message);
        console.error('Error stack:', dbError.stack);
      }
      return NextResponse.json(
        { error: 'Fehler beim Speichern der Terminanfrage in der Datenbank.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error submitting appointment:', error);
    return NextResponse.json(
      { error: 'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    );
  }
}

/**
 * Update an existing appointment
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
        const typedData = data as Record<string, any>;
        
        // Convert boolean values
        if (value === 'true') {
          typedData[key] = true;
        } else if (value === 'false') {
          typedData[key] = false;
        } else {
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
              const metadata: { coverImageUrl?: string; croppedCoverImageUrl?: string; [key: string]: any } = 
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
          let coverImageUrl = url;
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
          let metadata: { coverImageUrl?: string; croppedCoverImageUrl?: string; [key: string]: any } = {};
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
      featured
    } = data;

    if (!id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};

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

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    return serverErrorResponse('Failed to update appointment');
  }
}

/**
 * Delete an appointment
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