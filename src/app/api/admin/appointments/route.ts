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
    let data: any;
    
    if (contentType.includes('multipart/form-data')) {
      // Handle form data for file uploads
      const formData = await request.formData();
      data = {};
      
      // Extract form fields
      // Using Array.from to avoid TS2802 error with for...of and FormData.entries()
      Array.from(formData.entries()).forEach(([key, value]) => {
        // Skip file entries, they'll be handled separately
        if (key.startsWith('file-')) return;
        
        // Convert boolean values
        if (value === 'true') {
          data[key] = true;
        } else if (value === 'false') {
          data[key] = false;
        } else {
          data[key] = value;
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
    } else {
      // Handle JSON data
      data = await request.json();
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

    const updatedAppointment = await prisma.appointment.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}