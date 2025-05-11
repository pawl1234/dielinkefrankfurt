import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract text fields
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
      await prisma.appointment.create({
        data: {
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
          // Use explicit type assertion to match Prisma schema
          fileUrls: fileUrls.length > 0 ? JSON.stringify(fileUrls) : null,
        } as any // Use type assertion to bypass the type error
      });
      console.log('✅ Appointment successfully saved to database');
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting appointment:', error);

    return NextResponse.json(
      { error: 'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    );
  }
}