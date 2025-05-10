import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
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
    
    // Process multiple file uploads if present
    const fileCount = formData.get('fileCount');
    const fileUrls: string[] = [];
    
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    if (fileCount) {
      const count = parseInt(fileCount as string, 10);
      
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

          // Create a unique filename
          const timestamp = new Date().getTime();
          const uniqueFileName = `${timestamp}-${i}-${file.name.replace(/\\s+/g, '-')}`;

          // Save file to public/uploads directory for permanent storage
          const filePath = path.join(uploadDir, uniqueFileName);
          const buffer = Buffer.from(await file.arrayBuffer());
          fs.writeFileSync(filePath, buffer);

          // Add the URL to the array for storing in the database
          fileUrls.push(`/uploads/${uniqueFileName}`);
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
          fileUrls: fileUrls.length > 0 ? JSON.stringify(fileUrls) : null,
        }
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