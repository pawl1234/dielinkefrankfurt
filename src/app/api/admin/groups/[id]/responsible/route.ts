/**
 * Admin API endpoint for managing user-based responsible persons
 *
 * POST /api/admin/groups/[id]/responsible - Assign user as responsible person
 * DELETE /api/admin/groups/[id]/responsible - Remove user as responsible person
 *
 * Authentication: Admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assignResponsibleUser, removeResponsibleUser, findGroupById } from '@/lib/db/group-operations';
import { assignResponsibleUserSchema, removeResponsibleUserSchema } from '@/lib/validation/group';
import { logger } from '@/lib/logger';
import type { ApiHandler, IdRouteContext } from '@/types/api-types';

/**
 * POST /api/admin/groups/[id]/responsible
 *
 * Assign a user account as responsible person for a group.
 * Automatically creates group membership if user is not already a member.
 */
export const POST: ApiHandler<IdRouteContext> = async (
  request: NextRequest,
  context?: IdRouteContext
) => {
  try {
    // Check authentication - admin only
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    // Get groupId from params
    if (!context?.params) {
      return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
    }
    const params = await context.params;
    const { id: groupId } = params;

    // Parse and validate request body
    const body = await request.json();
    const validation = assignResponsibleUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage', details: validation.error.message },
        { status: 400 }
      );
    }

    const { userId } = validation.data;

    // Check if group exists
    const group = await findGroupById(groupId);
    if (!group) {
      return NextResponse.json(
        { error: 'Gruppe nicht gefunden' },
        { status: 404 }
      );
    }

    // Assign user as responsible person (auto-creates membership if needed)
    const result = await assignResponsibleUser(userId, groupId);

    logger.info('User assigned as responsible person', {
      module: 'api/admin/groups/[id]/responsible',
      context: {
        userId,
        groupId,
        groupName: group.name,
        assignedBy: session.user.id,
        memberCreated: result.memberCreated
      },
      tags: ['responsible', 'assign']
    });

    return NextResponse.json({
      success: true,
      message: 'Benutzer erfolgreich als verantwortliche Person zugewiesen',
      data: {
        id: result.responsibleUser.id,
        userId: result.responsibleUser.userId,
        groupId: result.responsibleUser.groupId,
        assignedAt: result.responsibleUser.assignedAt
      }
    });
  } catch (error) {
    // Check for duplicate assignment error
    if (error instanceof Error && error.message.includes('already assigned')) {
      return NextResponse.json(
        { error: 'Benutzer ist bereits als verantwortliche Person zugewiesen' },
        { status: 400 }
      );
    }

    logger.error(error instanceof Error ? error : 'Failed to assign responsible person', {
      module: 'api/admin/groups/[id]/responsible',
      tags: ['responsible', 'assign', 'error']
    });
    return NextResponse.json(
      { error: 'Fehler beim Zuweisen der verantwortlichen Person' },
      { status: 500 }
    );
  }
};

/**
 * DELETE /api/admin/groups/[id]/responsible
 *
 * Remove a user as responsible person from a group.
 * GroupMember record persists (user remains a regular member).
 */
export const DELETE: ApiHandler<IdRouteContext> = async (
  request: NextRequest,
  context?: IdRouteContext
) => {
  try {
    // Check authentication - admin only
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    // Get groupId from params
    if (!context?.params) {
      return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
    }
    const params = await context.params;
    const { id: groupId } = params;

    // Parse and validate request body
    const body = await request.json();
    const validation = removeResponsibleUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage', details: validation.error.message },
        { status: 400 }
      );
    }

    const { userId } = validation.data;

    // Check if group exists
    const group = await findGroupById(groupId);
    if (!group) {
      return NextResponse.json(
        { error: 'Gruppe nicht gefunden' },
        { status: 404 }
      );
    }

    // Remove responsible person assignment
    await removeResponsibleUser(userId, groupId);

    logger.info('User removed as responsible person', {
      module: 'api/admin/groups/[id]/responsible',
      context: { userId, groupId, groupName: group.name, removedBy: session.user.id },
      tags: ['responsible', 'remove']
    });

    return NextResponse.json({
      success: true,
      message: 'Verantwortliche Person erfolgreich entfernt'
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : 'Failed to remove responsible person', {
      module: 'api/admin/groups/[id]/responsible',
      tags: ['responsible', 'remove', 'error']
    });
    return NextResponse.json(
      { error: 'Fehler beim Entfernen der verantwortlichen Person' },
      { status: 500 }
    );
  }
};
