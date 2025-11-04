/**
 * Portal Group Leave API endpoint
 *
 * POST /api/portal/groups/leave - Leave a group (members only, not responsible persons)
 *
 * Authentication handled by middleware.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leaveGroupSchema } from '@/lib/validation/group';
import { canUserLeaveGroup } from '@/lib/groups/permissions';
import { deleteGroupMember } from '@/lib/db/group-member-operations';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/errors';

/**
 * POST /api/portal/groups/leave
 *
 * Allow regular members to leave a group.
 * Responsible persons cannot leave - they must be removed by an admin first.
 */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'mitglied'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Zugriff verweigert' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = leaveGroupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage', details: validation.error.message },
        { status: 400 }
      );
    }

    const { groupId } = validation.data;

    // Check if user has permission to leave (member but not responsible person)
    const canLeave = await canUserLeaveGroup(session.user.id, groupId);

    if (!canLeave) {
      logger.warn('User attempted to leave group without permission', {
        module: 'api/portal/groups/leave',
        context: { userId: session.user.id, groupId }
      });
      return NextResponse.json(
        {
          error: 'Du kannst diese Gruppe nicht verlassen. Entweder bist du kein Mitglied oder du bist eine verantwortliche Person.'
        },
        { status: 403 }
      );
    }

    // Remove user from group
    const deletedCount = await deleteGroupMember(session.user.id, groupId);

    if (deletedCount === 0) {
      logger.warn('Leave group called but no membership found to delete', {
        module: 'api/portal/groups/leave',
        context: { userId: session.user.id, groupId }
      });
      return NextResponse.json(
        { error: 'Keine Mitgliedschaft gefunden' },
        { status: 404 }
      );
    }

    logger.info('User left group successfully', {
      module: 'api/portal/groups/leave',
      context: { userId: session.user.id, groupId, deletedCount }
    });

    return NextResponse.json({
      success: true,
      message: 'Du hast die Gruppe erfolgreich verlassen'
    });
  } catch (error) {
    logger.error('Failed to process leave request', {
      module: 'api/portal/groups/leave',
      context: { error: error instanceof Error ? error.message : String(error) }
    });
    return apiErrorResponse(error, 'Fehler beim Verlassen der Gruppe');
  }
};
