import { NextRequest, NextResponse } from 'next/server';
import { createStatusReport } from '@/lib/groups';
import { uploadFiles, deleteFiles } from '@/lib/blob-storage';
import { logger } from '@/lib/logger';
import { apiErrorResponse, validationErrorResponse } from '@/lib/errors';
import { validateStatusReportWithZod } from '@/lib/validation/status-report';
import { StatusReportSubmissionRequest, StatusReportSubmissionResponse } from '@/types/api-types';

export async function POST(request: NextRequest) {
  let fileUrls: string[] = [];

  try {
    const formData = await request.formData();

    const submissionData: StatusReportSubmissionRequest = {
      groupId: formData.get('groupId') as string,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      reporterFirstName: formData.get('reporterFirstName') as string,
      reporterLastName: formData.get('reporterLastName') as string,
      files: formData.getAll('files') as File[]
    };

    const validationResult = await validateStatusReportWithZod(submissionData);

    if (!validationResult.isValid && validationResult.errors) {
      return validationErrorResponse(validationResult.errors);
    }

    if (submissionData.files && submissionData.files.length > 0) {
      try {
        const uploadResults = await uploadFiles(submissionData.files, {
          category: 'status-reports'
        });
        fileUrls = uploadResults.map(r => r.url);
        logger.info('File upload successful');
      } catch (error) {
        logger.error('File upload failed', {
          context: { errorMessage: error instanceof Error ? error.message : String(error) }
        });
        return apiErrorResponse(error, 'Fehler beim Hochladen der Dateien');
      }
    }

    const validatedData = {
      ...validationResult.data!,
      fileUrls
    };

    const result = await createStatusReport(validatedData);

    logger.info('Status report submitted successfully', {
      context: {
        reportId: result.id,
        groupId: result.groupId,
        title: result.title
      }
    });

    const response: StatusReportSubmissionResponse = {
      success: true,
      statusReport: { id: result.id, title: result.title }
    };

    return NextResponse.json(response);

  } catch (error) {
    if (fileUrls.length > 0) {
      try {
        await deleteFiles(fileUrls);
        logger.info('File cleanup successful after error');
      } catch (deleteError) {
        logger.error('File cleanup failed', {
          context: { errorMessage: deleteError instanceof Error ? deleteError.message : String(deleteError) }
        });
      }
    }

    return apiErrorResponse(error, 'Fehler beim Übermitteln des Statusberichts');
  }
}