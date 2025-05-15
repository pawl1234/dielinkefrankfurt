import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

// Get all appointments with optional filtering
export async function GET(request: NextRequest) {
  // Verify admin session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get query parameters for filtering
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'all';
    const status = url.searchParams.get('status');

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
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

// Update appointment (mark as processed, accept or reject)
export async function PATCH(request: NextRequest) {
  // Verify admin session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
            // Process file upload using put from Vercel Blob (or your preferred storage)
            // For this example, we'll assume a simple upload function
            // In a real implementation, you'd handle this with Vercel Blob or similar
            try {
              // Upload file and get URL
              // Example upload code (would be replaced with actual implementation)
              const fileName = `${Date.now()}-${i}-${file.name || 'file'}`;
              const response = await fetch('/api/submit-appointment', {
                method: 'POST',
                body: formData
              });
              
              if (response.ok) {
                const result = await response.json();
                uploadedFiles.push(...result.fileUrls);
              }
            } catch (error) {
              console.error('Error uploading file:', error);
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
              const { del } = await import('@vercel/blob');
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
          
          // Import the put function from Vercel Blob
          const { put } = await import('@vercel/blob');
          
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
          
          // Use existing appointment data that we already fetched above
          // (Don't need to fetch again)
          
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
              const { del } = await import('@vercel/blob');
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
      updateData.metadata = data.metadata; // Add metadata to updateData
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
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

// Type definition for data extracted from a form or JSON request
interface AppointmentUpdateData {
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
  metadata?: string | null; // Add metadata field to the interface
}