/**
 * Portal Group Join API endpoint
 *
 * POST /api/portal/groups/join - Join a group
 *
 * Authentication handled by middleware.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { joinGroupSchema } from '@/lib/validation/group';
import { createGroupMember, isUserMemberOfGroup } from '@/lib/db/group-member-operations';
import { findGroupById } from '@/lib/db/group-operations';
import { sendMemberJoinedNotification } from '@/lib/groups/member-notifications';
import { logger } from '@/lib/logger';
import type { ApiHandler } from '@/types/api-types';

/**
 * POST /api/portal/groups/join
 *
 * Allows authenticated users to join an ACTIVE group.
 */
export const POST: ApiHandler = async (request: NextRequest) => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'mitglied'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = joinGroupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage', details: validation.error.message },
        { status: 400 }
      );
    }

    const { groupId } = validation.data;

    // Check if group exists and is ACTIVE
    const group = await findGroupById(groupId);
    if (!group) {
      return NextResponse.json(
        { error: 'Gruppe nicht gefunden' },
        { status: 404 }
      );
    }

    if (group.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Diese Gruppe ist nicht aktiv und kann nicht beigetreten werden' },
        { status: 403 }
      );
    }

    // Check if already member
    const isMember = await isUserMemberOfGroup(session.user.id, groupId);
    if (isMember) {
      return NextResponse.json(
        { error: 'Sie sind bereits Mitglied dieser Gruppe' },
        { status: 400 }
      );
    }

    // Create membership
    const groupMember = await createGroupMember(session.user.id, groupId);

    // Send notification (async, don't wait)
    sendMemberJoinedNotification(groupId, session.user.id).catch((err) =>
      logger.error('Failed to send member joined notification', {
        module: 'api/portal/groups/join',
        context: { groupId, userId: session.user.id, error: err },
        tags: ['notification', 'error']
      })
    );

    logger.info('User joined group successfully', {
      module: 'api/portal/groups/join',
      context: { groupId, userId: session.user.id, groupName: group.name },
      tags: ['membership', 'join']
    });

    return NextResponse.json({
      success: true,
      message: 'Erfolgreich der Gruppe beigetreten',
      data: {
        id: groupMember.id,
        groupId: groupMember.groupId,
        joinedAt: groupMember.joinedAt
      }
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : 'Failed to join group', {
      module: 'api/portal/groups/join',
      tags: ['membership', 'join', 'error']
    });
    return NextResponse.json(
      { error: 'Fehler beim Beitreten der Gruppe' },
      { status: 500 }
    );
  }
};
