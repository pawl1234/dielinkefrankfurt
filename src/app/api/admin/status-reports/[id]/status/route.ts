import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth';
import { updateStatusReportStatus } from '@/lib/groups';
import { StatusReportStatus } from '@prisma/client';

/**
 * PUT /api/admin/status-reports/[id]/status
 * 
 * Admin endpoint for updating a status report's status.
 * Authentication required.
 */
export const PUT = withAdminAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const params = await context.params;
    const { id } = params;
    const data = await request.json();
    const { status } = data;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Status Report ID is required' },
        { status: 400 }
      );
    }
    
    if (!status || !['NEW', 'ACTIVE', 'REJECTED', 'ARCHIVED'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (NEW, ACTIVE, REJECTED, ARCHIVED)' },
        { status: 400 }
      );
    }
    
    const updatedStatusReport = await updateStatusReportStatus(id, status as StatusReportStatus);
    return NextResponse.json(updatedStatusReport);
  } catch (error) {
    console.error(`Error updating status for status report:`, error);
    return NextResponse.json(
      { error: 'Failed to update status report status' },
      { status: 500 }
    );
  }
});