import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { updateGroupStatus, getGroupById } from '@/lib/group-handlers';
import { Group, GroupStatus, ResponsiblePerson } from '@prisma/client';

/**
 * Response type for group status update
 */
export interface GroupStatusUpdateResponse {
  success: boolean;
  group?: Group & {
    responsiblePersons: ResponsiblePerson[];
  };
  error?: string;
}

/**
 * PUT /api/admin/groups/[id]/status
 * 
 * Admin endpoint for updating a group's status.
 * Authentication required.
 */
export const PUT = withAdminAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const params = await context.params;
    const { id } = params;
    const data = await request.json();
    const { status } = data;
    
    if (!id) {
      const response: GroupStatusUpdateResponse = {
        success: false,
        error: 'Group ID is required'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // Check if the group exists
    const group = await getGroupById(id);
    if (!group) {
      const response: GroupStatusUpdateResponse = {
        success: false,
        error: 'Group not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    if (!status || !['NEW', 'ACTIVE', 'ARCHIVED'].includes(status)) {
      const response: GroupStatusUpdateResponse = {
        success: false,
        error: 'Valid status is required (NEW, ACTIVE, ARCHIVED)'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const updatedGroup = await updateGroupStatus(id, status as GroupStatus);
    
    const response: GroupStatusUpdateResponse = {
      success: true,
      group: updatedGroup
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error updating status for group:`, error);
    
    const response: GroupStatusUpdateResponse = {
      success: false,
      error: 'Failed to update group status'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
});