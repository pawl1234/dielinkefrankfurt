import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth';
import {
  getStatusReports,
  updateStatusReport,
  deleteStatusReport,
  StatusReportUpdateData
} from '@/lib/groups';
import { uploadFiles, deleteFiles } from '@/lib/blob-storage';

/**
 * GET /api/admin/status-reports
 * 
 * Admin endpoint for retrieving status reports with optional filtering.
 * Authentication required.
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const status = (url.searchParams.get('status') || 'ALL') as 'ALL' | 'NEW' | 'ACTIVE' | 'ARCHIVED';
    const groupId = url.searchParams.get('groupId') || undefined;
    const search = url.searchParams.get('search') || '';
    const orderBy = (url.searchParams.get('orderBy') || 'createdAt') as 'title' | 'createdAt';
    const orderDirection = (url.searchParams.get('orderDirection') || 'desc') as 'asc' | 'desc';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    
    const result = await getStatusReports(
      status,
      groupId,
      search,
      orderBy,
      orderDirection,
      page,
      pageSize
    );
    
    // Set cache headers - shorter cache time for admin data (1 minute)
    return NextResponse.json(
      {
        statusReports: result.items,
        totalItems: result.totalItems,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=30',
        }
      }
    );
  } catch (error) {
    console.error('Error fetching status reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status reports' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/admin/status-reports
 * 
 * Admin endpoint for updating status report details.
 * Authentication required.
 */
export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.id) {
      return NextResponse.json(
        { error: 'Status Report ID is required' },
        { status: 400 }
      );
    }
    
    const updatedStatusReport = await updateStatusReport(data);
    return NextResponse.json(updatedStatusReport);
  } catch (error) {
    console.error('Error updating status report:', error);
    return NextResponse.json(
      { error: 'Failed to update status report' },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/admin/status-reports
 * 
 * Admin endpoint for updating status reports with file uploads.
 * Authentication required.
 * Handles multipart/form-data requests.
 */
export const PATCH = withAdminAuth(async (request: NextRequest) => {
  try {
    // Parse form data
    const formData = await request.formData();
    const id = formData.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Status Report ID is required' },
        { status: 400 }
      );
    }
    
    // Prepare update data
    const updateData: Record<string, unknown> = {
      id: id.toString()
    };
    
    // Extract common fields
    const fields = ['title', 'content', 'reporterFirstName', 'reporterLastName', 'groupId', 'status'];
    for (const field of fields) {
      const value = formData.get(field);
      if (value !== null) {
        updateData[field] = value;
      }
    }
    
    // Handle file uploads if any
    const files = formData.getAll('files') as File[];
    const uploadedFiles: string[] = [];

    if (files.length > 0) {
      try {
        const uploadResults = await uploadFiles(files, {
          category: 'status-reports'
        });
        uploadResults.forEach(result => uploadedFiles.push(result.url));
        console.log(`✅ Files uploaded successfully: ${uploadedFiles.length} files`);
      } catch (uploadError) {
        console.error('Error uploading files:', uploadError);
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
    
    // Get current status report to extract previous files
    const statusReportsResult = await getStatusReports('ALL', undefined, '', 'createdAt', 'desc');
    const currentReport = statusReportsResult.items.find(report => report.id === id.toString());
    
    if (currentReport && currentReport.fileUrls) {
      try {
        const currentFiles = JSON.parse(currentReport.fileUrls);
        
        // Find files that were removed
        if (Array.isArray(currentFiles)) {
          const filesToDelete = currentFiles.filter(url => !existingFiles.includes(url));
          
          // Delete removed files from blob storage
          if (filesToDelete.length > 0) {
            try {
              console.log(`🗑️ Deleting ${filesToDelete.length} removed files:`, filesToDelete);
              await deleteFiles(filesToDelete);
              console.log('✅ Removed files deleted successfully');
            } catch (deleteError) {
              console.error('❌ Error deleting removed files:', deleteError);
            }
          }
        }
      } catch (parseError: unknown) {
        console.error('Error parsing current file URLs:', parseError);
      }
    }
    
    // Combine existing and new file URLs
    updateData.fileUrls = [...existingFiles, ...uploadedFiles];
    
    // Update the status report
    const updatedStatusReport = await updateStatusReport(updateData as unknown as StatusReportUpdateData);
    return NextResponse.json(updatedStatusReport);
  } catch (error) {
    console.error('Error updating status report:', error);
    return NextResponse.json(
      { error: 'Failed to update status report' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/admin/status-reports
 * 
 * Admin endpoint for deleting status reports.
 * Authentication required.
 */
export const DELETE = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Status Report ID is required' },
        { status: 400 }
      );
    }
    
    await deleteStatusReport(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting status report:', error);
    return NextResponse.json(
      { error: 'Failed to delete status report' },
      { status: 500 }
    );
  }
});