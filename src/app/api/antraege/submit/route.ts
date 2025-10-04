import { NextRequest, NextResponse } from 'next/server';
import { createAntrag } from '@/lib/db/antrag-operations';
import { uploadAntragFiles, deleteAntragFiles } from '@/lib/antrag-file-utils';
import { FileUploadError } from '@/lib/file-upload';
import { logger } from '@/lib/logger';
import {
  validateAntragWithZod,
  type AntragFormData
} from '@/lib/validation/antrag';
import { apiErrorResponse, validationErrorResponse } from '@/lib/errors';
import { getRecipientEmails } from '@/lib/db/antrag-config-operations';
import { sendAntragSubmissionEmail } from '@/lib/email-senders';

/**
 * Response type for Antrag submission
 */
export interface AntragSubmitResponse {
  success: boolean;
  message?: string;
  antrag?: {
    id: string;
    title: string;
    summary: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * POST /api/antraege/submit
 *
 * Public endpoint for submitting a new Antrag an Kreisvorstand.
 * Handles both form data with file uploads and JSON data without files.
 */
export async function POST(request: NextRequest) {
  let uploadedFileUrls: string[] = [];

  try {
    // Check content type to determine parsing method
    const contentType = request.headers.get('content-type') || '';
    let formData: AntragFormData;
    const files: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Parse form data for file upload handling
      const formDataRaw = await request.formData();

      // Extract basic fields
      const firstName = formDataRaw.get('firstName') as string;
      const lastName = formDataRaw.get('lastName') as string;
      const email = formDataRaw.get('email') as string;
      const title = formDataRaw.get('title') as string;
      const summary = formDataRaw.get('summary') as string;

      // Parse purposes JSON
      const purposesStr = formDataRaw.get('purposes') as string;
      const purposes = purposesStr ? JSON.parse(purposesStr) : {};

      // Collect files
      const fileCount = parseInt(formDataRaw.get('fileCount') as string, 10) || 0;
      for (let i = 0; i < fileCount; i++) {
        const file = formDataRaw.get(`file-${i}`) as File | null;
        if (file && file.size > 0) {
          files.push(file);
        }
      }

      formData = { firstName, lastName, email, title, summary, purposes, files };
    } else {
      // Parse JSON data from request body
      const jsonData = await request.json();
      formData = {
        ...jsonData,
        files: [] // No files in JSON requests
      };
    }
    
    // Validate form data using Zod schema (includes file validation with magic bytes)
    const validationResult = await validateAntragWithZod(formData);
    if (!validationResult.isValid && validationResult.errors) {
      // Use consistent validationErrorResponse for field errors
      return validationErrorResponse(validationResult.errors);
    }

    // Use validated data from Zod (guaranteed to be correct after validation)
    const validatedData = validationResult.data!;

    // Prepare Antrag data for database
    const antragData = {
      firstName: validatedData.firstName.trim(),
      lastName: validatedData.lastName.trim(),
      email: validatedData.email.trim(),
      title: validatedData.title.trim(),
      summary: validatedData.summary.trim(),
      purposes: validatedData.purposes
    };
    
    // Upload files if present
    if (files.length > 0) {
      try {
        uploadedFileUrls = await uploadAntragFiles(files);
        console.log(`✅ Successfully uploaded ${uploadedFileUrls.length} files for Antrag`);
      } catch (error) {
        console.error('Error uploading files:', error);
        
        // Handle FileUploadError with appropriate status code
        if (error instanceof FileUploadError) {
          const response: AntragSubmitResponse = {
            success: false,
            error: error.message
          };
          return NextResponse.json(response, { status: error.status });
        }
        
        // Generic error for other types
        const response: AntragSubmitResponse = {
          success: false,
          error: 'Fehler beim Hochladen der Dateien'
        };
        return NextResponse.json(response, { status: 500 });
      }
    }
    
    // Create the Antrag with file URLs
    const antragDataWithFiles = {
      ...antragData,
      fileUrls: uploadedFileUrls
    };
    
    let newAntrag;
    try {
      newAntrag = await createAntrag(antragDataWithFiles);
    } catch (createError) {
      // If database operation failed and we uploaded files, clean them up
      if (uploadedFileUrls.length > 0) {
        console.log('🧹 Cleaning up uploaded files after database error...');
        await deleteAntragFiles(uploadedFileUrls).catch(deleteError => {
          console.error('Error cleaning up uploaded files:', deleteError);
        });
      }
      throw createError; // Re-throw to be handled by outer catch
    }
    
    // Log successful submission
    logger.info('Antrag submitted successfully', {
      context: {
        antragId: newAntrag.id,
        title: newAntrag.title,
        email: newAntrag.email
      }
    });
    
    // Send email notification - don't fail the request if email fails
    try {
      const recipientEmails = await getRecipientEmails();
      const emailResult = await sendAntragSubmissionEmail(
        newAntrag,
        uploadedFileUrls,
        recipientEmails
      );
      
      if (!emailResult.success) {
        logger.error('Failed to send Antrag submission email', {
          context: {
            antragId: newAntrag.id,
            error: emailResult.error
          }
        });
      }
    } catch (emailError) {
      // Log error but don't fail the submission
      logger.error('Error sending Antrag submission email', {
        context: {
          antragId: newAntrag.id,
          error: emailError
        }
      });
    }
    
    const response: AntragSubmitResponse = {
      success: true,
      message: 'Antrag erfolgreich übermittelt',
      antrag: {
        id: newAntrag.id,
        title: newAntrag.title,
        summary: newAntrag.summary,
        status: newAntrag.status,
        createdAt: newAntrag.createdAt.toISOString(),
        updatedAt: newAntrag.updatedAt.toISOString()
      }
    };
    
    return NextResponse.json(response);
  } catch (error: unknown) {
    // Clean up uploaded files if any error occurred
    if (uploadedFileUrls.length > 0) {
      console.log('🧹 Cleaning up uploaded files after error...');
      await deleteAntragFiles(uploadedFileUrls).catch(deleteError => {
        console.error('Error cleaning up uploaded files:', deleteError);
      });
    }
    
    // Handle specific error types
    if (error instanceof FileUploadError) {
      const response: AntragSubmitResponse = {
        success: false,
        error: error.message
      };
      return NextResponse.json(response, { status: error.status });
    }
    
    // Check if error looks like AppError (for test compatibility)
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AppError') {
      return apiErrorResponse(error, 'Fehler beim Übermitteln des Antrags');
    }
    
    // Log unexpected errors
    console.error('Error submitting Antrag:', error);
    
    // Return generic error response
    return apiErrorResponse(error, 'Fehler beim Übermitteln des Antrags');
  }
}