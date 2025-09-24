import { NextRequest, NextResponse } from 'next/server';
import { createStatusReport } from '@/lib/group-handlers';
import { uploadStatusReportFiles, FileUploadError } from '@/lib/file-upload';
import { logger } from '@/lib/logger';
import { del } from '@vercel/blob';
import { ValidationError, isValidationError, apiErrorResponse, validationErrorResponse } from '@/lib/errors';
import { validateStatusReportWithZod } from '@/lib/validation/status-report';

/**
 * POST /api/status-reports/submit
 * 
 * Public endpoint for submitting a new status report.
 * Handles file uploads for status report attachments.
 */
export async function POST(request: NextRequest) {
  let fileUrls: string[] = [];

  try {
    // Extract form data explicitly
    const formData = await request.formData();

    // Extract basic fields
    const statusReportData = {
      groupId: formData.get('groupId') as string,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      reporterFirstName: formData.get('reporterFirstName') as string,
      reporterLastName: formData.get('reporterLastName') as string,
      fileUrls: [] as string[] // Will be populated after file upload
    };

    // Handle file uploads BEFORE validation
    const files: File[] = [];
    const fileCount = parseInt(formData.get('fileCount') as string, 10) || 0;

    for (let i = 0; i < fileCount; i++) {
      const file = formData.get(`file-${i}`) as File | null;
      if (file && file.size > 0) {
        files.push(file);
      }
    }

    // Upload files using our utility function
    try {
      if (files.length > 0) {
        fileUrls = await uploadStatusReportFiles(files);
        console.log(`✅ Successfully uploaded ${fileUrls.length} files for status report`);
      }
    } catch (error) {
      console.error('Error uploading files:', error);

      // Handle FileUploadError with appropriate status code
      if (error instanceof FileUploadError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        );
      }

      // Generic error for other types
      return NextResponse.json(
        { error: 'Failed to upload file attachments' },
        { status: 500 }
      );
    }

    // Populate fileUrls after successful upload
    statusReportData.fileUrls = fileUrls;

    // Direct Zod validation (explicit and visible)
    const validationResult = await validateStatusReportWithZod(statusReportData);
    if (!validationResult.isValid && validationResult.errors) {
      // Clean up uploaded files on validation failure
      if (fileUrls.length > 0) {
        await del(fileUrls);
      }
      return validationErrorResponse(validationResult.errors);
    }

    // Use validated data for business logic
    const validatedData = validationResult.data!;
    const result = await createStatusReport(validatedData);

    // Log successful submission
    logger.info('Status report submitted successfully', {
      context: {
        reportId: result.id,
        groupId: result.groupId,
        title: result.title
      }
    });

    // Consistent success response
    return NextResponse.json({
      success: true,
      statusReport: { id: result.id, title: result.title }
    });
  } catch (error) {
    // Clean up uploaded files on any error
    if (fileUrls.length > 0) {
      try {
        await del(fileUrls);
        console.log('Cleaned up uploaded files after error');
      } catch (deleteError) {
        console.error('Error cleaning up uploaded files:', deleteError);
      }
    }

    // Handle specific known errors
    if (error instanceof Error) {
      // Group not found or not active (German message)
      if (error.message.includes('nicht gefunden oder nicht aktiv')) {
        return NextResponse.json(
          { error: 'Group not found or not active' },
          { status: 404 }
        );
      }
    }

    // Consistent error handling
    return apiErrorResponse(error, 'Fehler beim Übermitteln des Statusberichts');
  }
}