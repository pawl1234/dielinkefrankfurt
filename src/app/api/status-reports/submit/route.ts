import { NextRequest, NextResponse } from 'next/server';
import { createStatusReport } from '@/lib/group-handlers';
import { uploadStatusReportFiles, FileUploadError } from '@/lib/file-upload';

/**
 * POST /api/status-reports/submit
 * 
 * Public endpoint for submitting a new status report.
 * Handles file uploads for status report attachments.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data for file upload handling
    const formData = await request.formData();
    
    // Extract basic fields
    const groupId = formData.get('groupId') as string;
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const reporterFirstName = formData.get('reporterFirstName') as string;
    const reporterLastName = formData.get('reporterLastName') as string;
    
    // Collect files for upload
    const files: File[] = [];
    const fileCount = parseInt(formData.get('fileCount') as string, 10) || 0;
    
    for (let i = 0; i < fileCount; i++) {
      const file = formData.get(`file-${i}`) as File | null;
      if (file && file.size > 0) {
        files.push(file);
      }
    }
    
    // Upload files using our utility function
    let fileUrls: string[] = [];
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
    
    // Create the status report
    const statusReportData = {
      groupId,
      title,
      content,
      reporterFirstName,
      reporterLastName,
      fileUrls
    };
    
    const newStatusReport = await createStatusReport(statusReportData);
    
    return NextResponse.json({
      success: true,
      statusReport: {
        id: newStatusReport.id,
        title: newStatusReport.title
      }
    });
  } catch (error) {
    console.error('Error submitting status report:', error);
    
    // Return friendly error message based on the error
    if (error instanceof Error) {
      // Check if it's a validation error from our validation function
      if (error.message.includes('required') || 
          error.message.includes('must be between') ||
          error.message.includes('must not exceed')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      
      // Group not found or not active
      if (error.message.includes('Group not found or not active')) {
        return NextResponse.json(
          { error: 'Group not found or not active' },
          { status: 404 }
        );
      }
    }
    
    // Generic error for other types of errors
    return NextResponse.json(
      { error: 'Failed to submit status report' },
      { status: 500 }
    );
  }
}