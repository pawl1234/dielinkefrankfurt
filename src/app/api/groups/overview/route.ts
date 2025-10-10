import { NextRequest, NextResponse } from 'next/server';
import { findPublicGroupsWithMeeting } from '@/lib/db/group-operations';
import { logger } from '@/lib/logger';

/**
 * GET /api/groups/overview
 * Fetches all active groups with meeting information for public groups overview page
 */
export async function GET(_request: NextRequest) {
  try {
    const groups = await findPublicGroupsWithMeeting();

    return NextResponse.json({
      success: true,
      groups
    });
  } catch (error) {
    logger.error('Error fetching groups overview', {
      module: 'api/groups/overview',
      context: { error }
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Laden der Arbeitsgruppen'
      },
      { status: 500 }
    );
  }
}
