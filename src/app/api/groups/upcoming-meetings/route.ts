import { NextRequest, NextResponse } from 'next/server';
import { getGroupsWithUpcomingMeetings } from '@/lib/db/group-operations';
import { calculateUpcomingMeetings } from '@/lib/groups/meeting-calculator';
import { logger } from '@/lib/logger';
import { CalculatedMeeting } from '@/types/form-types';

/**
 * Response type for upcoming meetings
 */
export interface UpcomingMeetingsResponse {
  success: boolean;
  meetings?: CalculatedMeeting[];
  error?: string;
}

/**
 * GET /api/groups/upcoming-meetings
 *
 * Public endpoint for retrieving upcoming meetings for all active groups.
 * Query parameters:
 * - days: Number of days to look ahead (default: 7, max: 30)
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const daysParam = url.searchParams.get('days');

    // Parse and validate days parameter
    let days = 7; // default
    if (daysParam) {
      const parsedDays = parseInt(daysParam, 10);
      if (isNaN(parsedDays) || parsedDays < 1) {
        const response: UpcomingMeetingsResponse = {
          success: false,
          error: 'Ungültiger Wert für Parameter "days". Muss eine positive Zahl sein.'
        };
        return NextResponse.json(response, { status: 400 });
      }

      // Limit to max 30 days
      days = Math.min(parsedDays, 30);
    }

    // Load groups with recurring patterns
    const groups = await getGroupsWithUpcomingMeetings();

    if (!groups || groups.length === 0) {
      const response: UpcomingMeetingsResponse = {
        success: true,
        meetings: []
      };
      return NextResponse.json(response);
    }

    // Calculate upcoming meetings
    const meetings = calculateUpcomingMeetings(groups, days);

    logger.info('Upcoming meetings calculated', {
      module: 'api/groups/upcoming-meetings',
      context: { groupCount: groups.length, meetingCount: meetings.length, days }
    });

    const response: UpcomingMeetingsResponse = {
      success: true,
      meetings: meetings.map(meeting => ({
        ...meeting,
        date: meeting.date // Will be serialized as ISO string by NextResponse.json
      }))
    };

    // Set cache headers - cache for 1 hour for better performance
    return NextResponse.json(
      response,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
        }
      }
    );
  } catch (error) {
    logger.error('Error calculating upcoming meetings', {
      module: 'api/groups/upcoming-meetings',
      context: { error: error instanceof Error ? error.message : String(error) }
    });

    const response: UpcomingMeetingsResponse = {
      success: false,
      error: 'Fehler beim Berechnen der Termine'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
