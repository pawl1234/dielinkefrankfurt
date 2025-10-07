import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth';
import {
  getGroups
} from '@/lib/groups';
import { Group, GroupStatus } from '@prisma/client';

/**
 * Response type for groups fetch
 */
export interface GroupsResponse {
  groups: Group[];
  totalItems?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string;
}

/**
 * GET /api/admin/groups
 * 
 * Admin endpoint for retrieving groups with optional filtering.
 * Authentication required.
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'ALL';
    const search = url.searchParams.get('search') || '';
    const orderBy = (url.searchParams.get('orderBy') || 'name') as 'name' | 'createdAt';
    const orderDirection = (url.searchParams.get('orderDirection') || 'asc') as 'asc' | 'desc';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    
    const result = await getGroups(
      status as GroupStatus | 'ALL', 
      search, 
      orderBy, 
      orderDirection,
      page,
      pageSize
    );
    
    const response: GroupsResponse = { 
      groups: result.items,
      totalItems: result.totalItems,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages
    };
    
    // Set cache headers - shorter cache time for admin data (1 minute)
    return NextResponse.json(
      response,
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=30',
        }
      }
    );
  } catch (error) {
    console.error('Error fetching groups:', error);
    
    const response: GroupsResponse = { 
      groups: [],
      error: 'Failed to fetch groups'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
});