import { NextRequest, NextResponse } from 'next/server';
import { getGroupBySlug } from '@/lib/group-handlers';
import { Group, StatusReport } from '@prisma/client';

/**
 * Response type for public group details
 */
export interface PublicGroupDetailResponse {
  success: boolean;
  group?: (Group & {
    statusReports: StatusReport[];
  }) | null;
  error?: string;
}

/**
 * GET /api/groups/[slug]
 * 
 * Public endpoint for retrieving a specific group by slug, including its active status reports.
 * Only returns groups with ACTIVE status.
 */
export async function GET(
    request: NextRequest, 
    { params }: { params: { slug: string } }
  ) {
  try {
    const { slug } = await params;
    
    if (!slug) {
      const response: PublicGroupDetailResponse = {
        success: false,
        error: 'Group slug is required'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const group = await getGroupBySlug(slug);
    
    if (!group) {
      const response: PublicGroupDetailResponse = {
        success: false,
        error: 'Group not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Only show active groups to the public
    if (group.status !== 'ACTIVE') {
      const response: PublicGroupDetailResponse = {
        success: false,
        error: 'Group not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    const response: PublicGroupDetailResponse = {
      success: true,
      group
    };
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error(`Error fetching group:`, error);
    
    const response: PublicGroupDetailResponse = {
      success: false,
      error: 'Failed to fetch group'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}