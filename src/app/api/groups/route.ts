import { NextRequest, NextResponse } from 'next/server';
import { getPublicGroups } from '@/lib/groups';
import { Group } from '@prisma/client';

/**
 * Response type for public groups listing
 */
export interface PublicGroupsResponse {
  success: boolean;
  groups: Partial<Group>[];
  totalItems?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string;
}

/**
 * GET /api/groups
 * 
 * Public endpoint for retrieving active groups.
 * Returns all active groups sorted alphabetically.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : undefined;
    const pageSize = url.searchParams.get('pageSize') ? parseInt(url.searchParams.get('pageSize')!) : undefined;
    
    // Get groups with pagination if parameters are provided
    const result = await getPublicGroups(page, pageSize);
    
    // Format response based on whether pagination was used
    const response: PublicGroupsResponse = {
      success: true,
      groups: Array.isArray(result) ? result : result.items,
    };
    
    // Add pagination metadata if available
    if (!Array.isArray(result)) {
      response.totalItems = result.totalItems;
      response.page = result.page;
      response.pageSize = result.pageSize;
      response.totalPages = result.totalPages;
    }
    
    // Set cache headers - cache for 5 minutes for better performance
    return NextResponse.json(
      response,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        }
      }
    );
  } catch (error) {
    console.error('Error fetching public groups:', error);
    
    const response: PublicGroupsResponse = {
      success: false,
      groups: [],
      error: 'Failed to fetch groups'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}