/**
 * Portal Groups List API endpoint
 *
 * GET /api/portal/groups - List groups with membership indicators
 *
 * Query params:
 * - view: 'all' (default) | 'my' - Filter to all ACTIVE groups or user's groups
 * - search: string - Search by group name or slug (case-insensitive)
 *
 * Authentication handled by middleware.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findGroupsWithMembershipStatus } from '@/lib/db/group-operations';
import { logger } from '@/lib/logger';
import type { ApiHandler } from '@/types/api-types';
import type { PortalGroupListItem } from '@/types/api-types';

/**
 * GET /api/portal/groups
 *
 * List groups with membership status for the current user.
 * OPTIMIZED: Uses single query with included membership data.
 */
export const GET: ApiHandler = async (request: NextRequest) => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'mitglied'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'all';
    const searchQuery = searchParams.get('search') || '';

    // OPTIMIZED: Single query with membership data included
    const groupsWithMembership = await findGroupsWithMembershipStatus({
      userId: session.user.id,
      view: view as 'all' | 'my',
      searchQuery: searchQuery || undefined,
    });

    return NextResponse.json({
      success: true,
      groups: groupsWithMembership as PortalGroupListItem[],
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : 'Failed to fetch groups', {
      module: 'api/portal/groups',
      tags: ['groups', 'list', 'error']
    });
    return NextResponse.json(
      { error: 'Gruppen konnten nicht geladen werden' },
      { status: 500 }
    );
  }
};
