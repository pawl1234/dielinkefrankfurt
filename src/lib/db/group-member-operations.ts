import prisma from './prisma';
import { GroupMember } from '@prisma/client';

/**
 * Create a new group member (user joins group).
 *
 * @param userId - ID of the user joining the group
 * @param groupId - ID of the group being joined
 * @returns Promise resolving to created GroupMember record
 */
export async function createGroupMember(
  userId: string,
  groupId: string
): Promise<GroupMember> {
  return await prisma.groupMember.create({
    data: {
      userId,
      groupId,
    },
  });
}

/**
 * Delete a group member (user leaves or is removed from group).
 *
 * @param userId - ID of the user leaving/being removed
 * @param groupId - ID of the group
 * @returns Promise resolving to number of deleted records
 */
export async function deleteGroupMember(
  userId: string,
  groupId: string
): Promise<number> {
  const result = await prisma.groupMember.deleteMany({
    where: {
      userId,
      groupId,
    },
  });
  return result.count;
}

/**
 * Find all members of a group with pagination and user details.
 *
 * @param params - Query parameters including groupId, pagination, and sorting
 * @returns Promise resolving to members array and total count
 */
export async function findGroupMembers(params: {
  groupId: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{ members: GroupMember[]; totalItems: number }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;
  const skip = (page - 1) * pageSize;
  const sortBy = params.sortBy ?? 'joinedAt';
  const sortOrder = params.sortOrder ?? 'desc';

  const totalItems = await prisma.groupMember.count({
    where: { groupId: params.groupId },
  });

  const members = await prisma.groupMember.findMany({
    where: { groupId: params.groupId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      [sortBy]: sortOrder,
    },
    skip,
    take: pageSize,
  });

  return { members, totalItems };
}

/**
 * Find all groups where user is a member.
 *
 * @param userId - ID of the user
 * @returns Promise resolving to array of GroupMember records with group details
 */
export async function findUserMemberships(userId: string): Promise<GroupMember[]> {
  return await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          status: true,
        },
      },
    },
    orderBy: {
      joinedAt: 'desc',
    },
  });
}

/**
 * Check if user is a member of a group.
 *
 * @param userId - ID of the user
 * @param groupId - ID of the group
 * @returns Promise resolving to boolean indicating membership
 */
export async function isUserMemberOfGroup(
  userId: string,
  groupId: string
): Promise<boolean> {
  const member = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
  });

  return member !== null;
}

/**
 * Count members in a group.
 *
 * @param groupId - ID of the group
 * @returns Promise resolving to member count
 */
export async function countGroupMembers(groupId: string): Promise<number> {
  return await prisma.groupMember.count({
    where: { groupId },
  });
}

/**
 * Find all members of a group with responsible person indicators.
 * OPTIMIZED: Single query with included responsible person data via JOIN.
 *
 * @param params - Query parameters including groupId, pagination, and sorting
 * @returns Promise resolving to members array with isResponsiblePerson flag and total count
 */
export async function findGroupMembersWithRoles(params: {
  groupId: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  members: Array<{
    id: string;
    userId: string;
    groupId: string;
    joinedAt: Date;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
    isResponsiblePerson: boolean;
  }>;
  totalItems: number;
}> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;
  const skip = (page - 1) * pageSize;
  const sortBy = params.sortBy ?? 'joinedAt';
  const sortOrder = params.sortOrder ?? 'desc';

  // Get total count
  const totalItems = await prisma.groupMember.count({
    where: { groupId: params.groupId },
  });

  // Single optimized query with LEFT JOIN to responsible users
  const members = await prisma.groupMember.findMany({
    where: { groupId: params.groupId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          // Include responsible assignments for THIS group only
          responsibleForGroups: {
            where: { groupId: params.groupId },
            select: { id: true },
          },
        },
      },
    },
    orderBy: {
      [sortBy]: sortOrder,
    },
    skip,
    take: pageSize,
  });

  // Transform to add isResponsiblePerson flag and clean up user data
  const membersWithRoles = members.map((member) => ({
    id: member.id,
    userId: member.userId,
    groupId: member.groupId,
    joinedAt: member.joinedAt,
    user: {
      id: member.user.id,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      email: member.user.email,
    },
    // Check if user has responsible assignment for this group
    isResponsiblePerson: member.user.responsibleForGroups.length > 0,
  }));

  return { members: membersWithRoles, totalItems };
}
