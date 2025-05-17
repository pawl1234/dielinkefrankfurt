import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { getStatusReportById, updateStatusReport, deleteStatusReport } from '@/lib/group-handlers';
import { uploadStatusReportFiles, FileUploadError, deleteFiles } from '@/lib/file-upload';
import { StatusReport } from '@prisma/client';

/**
 * Response type for status report operations
 */
export interface StatusReportResponse {
  success: boolean;
  statusReport?: StatusReport;
  error?: string;
}

/**
 * GET /api/admin/status-reports/[id]
 * 
 * Admin endpoint for retrieving a specific status report by ID.
 * Authentication required.
 */
export const GET = withAdminAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const params = await context.params;
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Status Report ID is required' },
        { status: 400 }
      );
    }
    
    const statusReport = await getStatusReportById(id);
    
    if (!statusReport) {
      return NextResponse.json(
        { error: 'Status Report not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(statusReport);
  } catch (error) {
    console.error(`Error fetching status report:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch status report' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/admin/status-reports/[id]
 * 
 * Admin endpoint for updating a status report.
 * Handles file uploads for status report attachments.
 * Authentication required.
 */
export const PUT = withAdminAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const params = await context.params;
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Status Report ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the status report exists
    const existingReport = await getStatusReportById(id);
    if (!existingReport) {
      return NextResponse.json(
        { error: 'Status Report not found' },
        { status: 404 }
      );
    }
    
    // Check if the request is multipart/form-data or JSON
    const contentType = request.headers.get('content-type') || '';
    let updateData: any = { id };
    let fileUrls: string[] = [];
    let existingFileUrls: string[] = [];
    let retainExistingFiles = true;
    
    // Parse existing file URLs if they exist
    if (existingReport.fileUrls) {
      try {
        existingFileUrls = JSON.parse(existingReport.fileUrls);
      } catch (e) {
        console.error(`Error parsing existing fileUrls for status report ${id}:`, e);
        existingFileUrls = [];
      }
    }
    
    if (contentType.includes('multipart/form-data')) {
      // Handle form data for file upload handling
      const formData = await request.formData();
      
      // Extract basic fields
      if (formData.has('title')) updateData.title = formData.get('title') as string;
      if (formData.has('content')) updateData.content = formData.get('content') as string;
      if (formData.has('reporterFirstName')) updateData.reporterFirstName = formData.get('reporterFirstName') as string;
      if (formData.has('reporterLastName')) updateData.reporterLastName = formData.get('reporterLastName') as string;
      if (formData.has('status')) updateData.status = formData.get('status') as any;
      
      // Check if we need to clear existing files
      if (formData.has('retainExistingFiles')) {
        retainExistingFiles = formData.get('retainExistingFiles') === 'true';
      }
      
      // Handle file uploads if present
      const files: File[] = [];
      const fileCount = parseInt(formData.get('fileCount') as string, 10) || 0;
      
      for (let i = 0; i < fileCount; i++) {
        const file = formData.get(`file-${i}`) as File | null;
        if (file && file.size > 0) {
          files.push(file);
        }
      }
      
      // Upload new files if any
      if (files.length > 0) {
        try {
          const newFileUrls = await uploadStatusReportFiles(files);
          fileUrls = newFileUrls;
          console.log(`✅ Successfully uploaded ${newFileUrls.length} files for status report update`);
        } catch (error) {
          console.error('Error uploading files:', error);
          
          // Handle FileUploadError with appropriate status code
          if (error instanceof FileUploadError) {
            return NextResponse.json(
              { success: false, error: error.message },
              { status: error.status }
            );
          }
          
          // Generic error for other types
          return NextResponse.json(
            { success: false, error: 'Failed to upload file attachments' },
            { status: 500 }
          );
        }
      }
      
      // Combine existing and new file URLs if needed
      if (retainExistingFiles) {
        fileUrls = [...existingFileUrls, ...fileUrls];
      }
      
      // If not retaining existing files and no new files uploaded, clear the fileUrls
      updateData.fileUrls = fileUrls;
      
    } else {
      // Handle JSON data
      updateData = await request.json();
      updateData.id = id; // Ensure ID is set correctly
      
      // If fileUrls are provided in the JSON, use them directly
      // This allows for reordering or selectively removing files
      if (updateData.fileUrls !== undefined) {
        // Check if the fileUrls is different from the existing ones
        if (!retainExistingFiles) {
          // Files to delete are those in existingFileUrls but not in updateData.fileUrls
          const filesToDelete = existingFileUrls.filter(url => !updateData.fileUrls.includes(url));
          
          if (filesToDelete.length > 0) {
            try {
              await deleteFiles(filesToDelete);
              console.log(`✅ Deleted ${filesToDelete.length} unused files from status report ${id}`);
            } catch (error) {
              console.error('Error deleting unused files:', error);
              // Continue even if file deletion fails
            }
          }
        }
      }
    }
    
    // Update the status report
    const updatedStatusReport = await updateStatusReport(updateData);
    
    const response: StatusReportResponse = {
      success: true,
      statusReport: updatedStatusReport
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error updating status report:`, error);
    
    // Return friendly error message based on the error
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    // Generic error for other types of errors
    return NextResponse.json(
      { success: false, error: 'Failed to update status report' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/admin/status-reports/[id]
 * 
 * Admin endpoint for deleting a status report.
 * Also deletes any associated files from blob storage.
 * Authentication required.
 */
export const DELETE = withAdminAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const params = await context.params;
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Status Report ID is required' },
        { status: 400 }
      );
    }
    
    // Delete the status report (along with its files)
    await deleteStatusReport(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error deleting status report:`, error);
    
    // If it's a not found error, return 404
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'Status Report not found' },
        { status: 404 }
      );
    }
    
    // Generic error for other types
    return NextResponse.json(
      { success: false, error: 'Failed to delete status report' },
      { status: 500 }
    );
  }
});