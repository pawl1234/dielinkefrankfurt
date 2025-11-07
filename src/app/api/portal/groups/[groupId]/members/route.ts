/**
 * Portal API endpoint for managing group members
 *
 * GET /api/portal/groups/[groupId]/members - List group members with pagination
 * DELETE /api/portal/groups/[groupId]/members - Remove a member from the group
 *
 * Authentication: User must be logged in
 * Access:
 * - GET: User must be a member of the group
 * - DELETE: User must be a responsible person of the group
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findGroupMembersWithRoles, deleteGroupMember, isUserMemberOfGroup } from '@/lib/db/group-member-operations';
import { isUserResponsibleForGroup } from '@/lib/db/group-operations';
import { canUserManageMembers } from '@/lib/groups/permissions';
import { removeMemberSchema } from '@/lib/validation/group';
import { logger } from '@/lib/logger';

/**
 * GET /api/portal/groups/[groupId]/members
 *
 * List all members of a group with pagination and role indicators.
 * User must be a member of the group to view the list.
 * OPTIMIZED: Uses single query with included responsible person data.
 */
export const GET = async (
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> }
): Promise<NextResponse> => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    // Get groupId from params
    const params = await context.params;
    const { groupId } = params;

    // Check if user is a member of the group
    const isMember = await isUserMemberOfGroup(session.user.id, groupId);
    if (!isMember) {
      return NextResponse.json({ error: 'Zugriff verweigert - Sie sind kein Mitglied dieser Gruppe' }, { status: 403 });
    }

    // Parse pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const sortBy = searchParams.get('sortBy') || 'joinedAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // OPTIMIZED: Fetch members with responsible person status in single query
    const { members, totalItems } = await findGroupMembersWithRoles({
      groupId,
      page,
      pageSize,
      sortBy,
      sortOrder
    });

    // Transform to response format
    const membersResponse = members.map((member) => ({
      id: member.id,
      userId: member.userId,
      groupId: member.groupId,
      joinedAt: member.joinedAt.toISOString(),
      user: {
        id: member.user.id,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        email: member.user.email
      },
      isResponsiblePerson: member.isResponsiblePerson
    }));

    logger.info('Group members listed', {
      module: 'api/portal/groups/[groupId]/members',
      context: { groupId, userId: session.user.id, totalItems, page, pageSize },
      tags: ['members', 'list']
    });

    return NextResponse.json({
      success: true,
      members: membersResponse,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize)
      }
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : 'Failed to list group members', {
      module: 'api/portal/groups/[groupId]/members',
      tags: ['members', 'list', 'error']
    });
    return NextResponse.json(
      { error: 'Fehler beim Laden der Mitglieder' },
      { status: 500 }
    );
  }
};

/**
 * DELETE /api/portal/groups/[groupId]/members
 *
 * Remove a member from the group.
 * User must be a responsible person of the group.
 * Cannot remove responsible persons through this endpoint.
 */
export const DELETE = async (
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> }
): Promise<NextResponse> => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    // Get groupId from params
    const params = await context.params;
    const { groupId } = params;

    // Check if user has permission to manage members
    const canManage = await canUserManageMembers(session.user.id, groupId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Zugriff verweigert - Nur verantwortliche Personen können Mitglieder verwalten' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = removeMemberSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage', details: validation.error.message },
        { status: 400 }
      );
    }

    const { userId } = validation.data;

    // Prevent removal of responsible persons
    const isResponsible = await isUserResponsibleForGroup(userId, groupId);
    if (isResponsible) {
      return NextResponse.json(
        { error: 'Verantwortliche Personen können nicht über diese Funktion entfernt werden' },
        { status: 400 }
      );
    }

    // Remove member
    const deletedCount = await deleteGroupMember(userId, groupId);

    logger.info('Member removed from group', {
      module: 'api/portal/groups/[groupId]/members',
      context: { groupId, removedUserId: userId, removedBy: session.user.id, deletedCount },
      tags: ['members', 'remove']
    });

    return NextResponse.json({
      success: true,
      message: 'Mitglied erfolgreich entfernt'
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : 'Failed to remove member', {
      module: 'api/portal/groups/[groupId]/members',
      tags: ['members', 'remove', 'error']
    });
    return NextResponse.json(
      { error: 'Fehler beim Entfernen des Mitglieds' },
      { status: 500 }
    );
  }
};
