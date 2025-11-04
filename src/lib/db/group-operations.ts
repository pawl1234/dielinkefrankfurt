import prisma from './prisma';
import { Group, GroupStatus, ResponsiblePerson, StatusReport, GroupResponsibleUser, Prisma } from '@prisma/client';

/**
 * Creates a new group with responsible persons in a transaction.
 *
 * @param data Group data including responsible persons
 * @returns Promise resolving to created group
 */
export async function createGroupWithPersons(data: {
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  status: GroupStatus;
  recurringPatterns?: string | null;
  meetingTime?: string | null;
  meetingStreet?: string | null;
  meetingCity?: string | null;
  meetingPostalCode?: string | null;
  meetingLocationDetails?: string | null;
  responsiblePersons: Array<{
    firstName: string;
    lastName: string;
    email: string;
  }>;
}): Promise<Group> {
  return await prisma.$transaction(async (tx) => {
    const newGroup = await tx.group.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        logoUrl: data.logoUrl,
        status: data.status,
        recurringPatterns: data.recurringPatterns,
        meetingTime: data.meetingTime,
        meetingStreet: data.meetingStreet,
        meetingCity: data.meetingCity,
        meetingPostalCode: data.meetingPostalCode,
        meetingLocationDetails: data.meetingLocationDetails,
      }
    });

    for (const person of data.responsiblePersons) {
      await tx.responsiblePerson.create({
        data: {
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          groupId: newGroup.id
        }
      });
    }

    return newGroup;
  });
}

/**
 * Finds groups with pagination and filtering.
 *
 * @param params Query parameters including where clause, order, skip, take
 * @returns Promise resolving to groups array and total count
 */
export async function findGroupsWithPagination(params: {
  where: Prisma.GroupWhereInput;
  orderBy: Prisma.GroupOrderByWithRelationInput;
  skip: number;
  take: number;
}): Promise<{ groups: Group[]; totalItems: number }> {
  const totalItems = await prisma.group.count({ where: params.where });

  const groups = await prisma.group.findMany({
    where: params.where,
    orderBy: params.orderBy,
    include: {
      _count: {
        select: {
          statusReports: true
        }
      },
      responsiblePersons: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          groupId: true
        }
      },
      responsibleUsers: {
        select: {
          id: true,
          userId: true,
          groupId: true,
          assignedAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }
    },
    skip: params.skip,
    take: params.take
  });

  return { groups, totalItems };
}

/**
 * Finds a group by ID with responsible persons.
 *
 * @param id Group UUID
 * @returns Promise resolving to group or null if not found
 */
export async function findGroupById(id: string): Promise<(Group & { responsiblePersons: ResponsiblePerson[] }) | null> {
  return await prisma.group.findUnique({
    where: { id },
    include: {
      responsiblePersons: true
    }
  });
}

/**
 * Finds a group by slug with active status reports.
 *
 * @param slug Group slug
 * @returns Promise resolving to group or null if not found
 */
export async function findGroupBySlug(slug: string): Promise<(Group & { statusReports: StatusReport[] }) | null> {
  return await prisma.group.findUnique({
    where: { slug },
    include: {
      statusReports: {
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
}

/**
 * Finds public (ACTIVE) groups with optional pagination.
 *
 * @param params Query parameters including skip and take (optional)
 * @returns Promise resolving to groups array and total count
 */
export async function findPublicGroups(params: {
  skip?: number;
  take?: number;
}): Promise<{ groups: Group[]; totalItems: number }> {
  const where = { status: 'ACTIVE' as GroupStatus };

  const totalItems = await prisma.group.count({ where });

  const groups = await prisma.group.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      createdAt: true,
      status: true,
      metadata: true,
      updatedAt: true,
      recurringPatterns: true,
      meetingTime: true,
      meetingStreet: true,
      meetingCity: true,
      meetingPostalCode: true,
      meetingLocationDetails: true
    },
    skip: params.skip,
    take: params.take
  });

  return { groups, totalItems };
}

/**
 * Updates group status.
 *
 * @param id Group UUID
 * @param status New status
 * @returns Promise resolving to updated group with responsible persons
 */
export async function updateGroupStatus(id: string, status: GroupStatus): Promise<Group & { responsiblePersons: ResponsiblePerson[] }> {
  return await prisma.group.update({
    where: { id },
    data: { status },
    include: { responsiblePersons: true }
  });
}

/**
 * Updates a group with optional responsible persons update.
 *
 * @param id Group UUID
 * @param updateData Group update data
 * @param responsiblePersons Optional new responsible persons (replaces existing)
 * @returns Promise resolving to updated group or null
 */
export async function updateGroupWithPersons(
  id: string,
  updateData: Prisma.GroupUpdateInput,
  responsiblePersons?: Array<{
    firstName: string;
    lastName: string;
    email: string;
  }>
): Promise<(Group & { responsiblePersons: ResponsiblePerson[] }) | null> {
  return await prisma.$transaction(async (tx) => {
    // Update the group
    await tx.group.update({
      where: { id },
      data: updateData
    });

    // Handle responsible persons if they are provided
    if (responsiblePersons) {
      // Delete existing responsible persons
      await tx.responsiblePerson.deleteMany({
        where: { groupId: id }
      });

      // Create new responsible persons
      for (const person of responsiblePersons) {
        await tx.responsiblePerson.create({
          data: {
            firstName: person.firstName,
            lastName: person.lastName,
            email: person.email,
            groupId: id
          }
        });
      }
    }

    // Return the updated group with related data
    return tx.group.findUnique({
      where: { id },
      include: { responsiblePersons: true }
    });
  });
}

/**
 * Finds a group with all its status reports (for file cleanup).
 *
 * @param id Group UUID
 * @returns Promise resolving to group with status reports or null
 */
export async function findGroupWithStatusReports(id: string): Promise<(Group & { statusReports: StatusReport[] }) | null> {
  return await prisma.group.findUnique({
    where: { id },
    include: {
      statusReports: true
    }
  });
}

/**
 * Deletes a group (cascade deletes related data).
 *
 * @param id Group UUID
 * @returns Promise resolving when deletion is complete
 */
export async function deleteGroup(id: string): Promise<void> {
  await prisma.group.delete({
    where: { id }
  });
}

/**
 * Finds public (ACTIVE) groups with meeting information for overview page.
 *
 * @returns Promise resolving to groups array with meeting details
 */
export async function findPublicGroupsWithMeeting() {
  return await prisma.group.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      recurringPatterns: true,
      meetingTime: true,
      meetingStreet: true,
      meetingCity: true,
      meetingPostalCode: true,
      meetingLocationDetails: true
    }
  });
}

/**
 * Finds groups with upcoming meetings (active groups with recurring patterns).
 *
 * @returns Promise resolving to groups array with meeting details
 */
export async function getGroupsWithUpcomingMeetings() {
  return await prisma.group.findMany({
    where: {
      status: 'ACTIVE',
      recurringPatterns: {
        not: null
      }
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      recurringPatterns: true,
      meetingTime: true,
      meetingStreet: true,
      meetingCity: true,
      meetingPostalCode: true,
      meetingLocationDetails: true
    }
  });
}

/**
 * Finds a group by slug with responsible persons for contact form.
 *
 * @param slug Group slug
 * @returns Promise resolving to group with responsible persons or null
 */
export async function findGroupBySlugForContact(
  slug: string
): Promise<(Group & { responsiblePersons: ResponsiblePerson[] }) | null> {
  return await prisma.group.findUnique({
    where: {
      slug,
      status: 'ACTIVE'
    },
    include: {
      responsiblePersons: true
    }
  });
}

/**
 * Assign a user as a responsible person for a group.
 * Automatically creates GroupMember record if not exists.
 *
 * @param userId - ID of the user to assign
 * @param groupId - ID of the group
 * @returns Promise resolving to created responsible user and whether member was created
 */
export async function assignResponsibleUser(
  userId: string,
  groupId: string
): Promise<{ responsibleUser: GroupResponsibleUser; memberCreated: boolean }> {
  return await prisma.$transaction(async (tx) => {
    // Check if user is already a member
    const existingMember = await tx.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    let memberCreated = false;

    // Create member record if not exists
    if (!existingMember) {
      await tx.groupMember.create({
        data: {
          userId,
          groupId,
        },
      });
      memberCreated = true;
    }

    // Create responsible user record
    const responsibleUser = await tx.groupResponsibleUser.create({
      data: {
        userId,
        groupId,
      },
    });

    return { responsibleUser, memberCreated };
  });
}

/**
 * Remove a user's responsible person assignment.
 * Does NOT remove GroupMember record.
 *
 * @param userId - ID of the user to remove
 * @param groupId - ID of the group
 * @returns Promise resolving to void
 */
export async function removeResponsibleUser(
  userId: string,
  groupId: string
): Promise<void> {
  await prisma.groupResponsibleUser.deleteMany({
    where: {
      userId,
      groupId,
    },
  });
}

/**
 * Find all user-based responsible persons for a group.
 *
 * @param groupId - ID of the group
 * @returns Promise resolving to array of GroupResponsibleUser with user details
 */
export async function findGroupResponsibleUsers(
  groupId: string
): Promise<Array<GroupResponsibleUser & { user: { id: string; firstName: string | null; lastName: string | null; email: string } }>> {
  return await prisma.groupResponsibleUser.findMany({
    where: { groupId },
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
      assignedAt: 'asc',
    },
  });
}

/**
 * Check if user is a responsible person for a group.
 *
 * @param userId - ID of the user
 * @param groupId - ID of the group
 * @returns Promise resolving to boolean indicating responsible person status
 */
export async function isUserResponsibleForGroup(
  userId: string,
  groupId: string
): Promise<boolean> {
  const responsibleUser = await prisma.groupResponsibleUser.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
  });

  return responsibleUser !== null;
}

/**
 * Find all groups where user is a member or responsible person.
 *
 * @param userId - ID of the user
 * @returns Promise resolving to array of groups with membership flags
 */
export async function findGroupsWithMembership(
  userId: string
): Promise<Group[]> {
  return await prisma.group.findMany({
    where: {
      OR: [
        {
          members: {
            some: {
              userId,
            },
          },
        },
        {
          responsibleUsers: {
            some: {
              userId,
            },
          },
        },
      ],
    },
    orderBy: {
      name: 'asc',
    },
  });
}

/**
 * Get all responsible person emails for a group (both email-based and user-based).
 *
 * @param groupId - ID of the group
 * @returns Promise resolving to array of email addresses
 */
export async function getGroupResponsibleEmails(
  groupId: string
): Promise<string[]> {
  // Get email-based responsible persons
  const emailBased = await prisma.responsiblePerson.findMany({
    where: { groupId },
    select: { email: true },
  });

  // Get user-based responsible persons
  const userBased = await prisma.groupResponsibleUser.findMany({
    where: { groupId },
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  return [
    ...emailBased.map((p) => p.email),
    ...userBased.map((p) => p.user.email),
  ];
}

/**
 * Find groups with membership status for a specific user.
 * OPTIMIZED: Single query with included membership and responsible person data.
 *
 * @param params - Query parameters including userId, view type, and search
 * @returns Promise resolving to groups array with membership indicators
 */
export async function findGroupsWithMembershipStatus(params: {
  userId: string;
  view: 'all' | 'my';
  searchQuery?: string;
}): Promise<Array<{
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  status: string;
  recurringPatterns: string | null;
  meetingTime: string | null;
  meetingStreet: string | null;
  meetingCity: string | null;
  meetingPostalCode: string | null;
  meetingLocationDetails: string | null;
  isMember: boolean;
  isResponsiblePerson: boolean;
}>> {
  // Build where clause based on view
  const baseWhere: Prisma.GroupWhereInput = params.view === 'my'
    ? {
        OR: [
          {
            members: {
              some: {
                userId: params.userId,
              },
            },
          },
          {
            responsibleUsers: {
              some: {
                userId: params.userId,
              },
            },
          },
        ],
      }
    : {
        status: 'ACTIVE',
      };

  // Add search filter if provided
  const searchWhere: Prisma.GroupWhereInput = params.searchQuery
    ? {
        OR: [
          {
            name: {
              contains: params.searchQuery,
              mode: 'insensitive',
            },
          },
          {
            slug: {
              contains: params.searchQuery,
              mode: 'insensitive',
            },
          },
        ],
      }
    : {};

  // Single optimized query with membership data included
  const groups = await prisma.group.findMany({
    where: {
      AND: [baseWhere, searchWhere],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      status: true,
      recurringPatterns: true,
      meetingTime: true,
      meetingStreet: true,
      meetingCity: true,
      meetingPostalCode: true,
      meetingLocationDetails: true,
      // Include membership data for current user only
      members: {
        where: {
          userId: params.userId,
        },
        select: {
          userId: true,
        },
      },
      // Include responsible person data for current user only
      responsibleUsers: {
        where: {
          userId: params.userId,
        },
        select: {
          userId: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Transform to include boolean flags
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    slug: group.slug,
    description: group.description,
    logoUrl: group.logoUrl,
    status: group.status,
    recurringPatterns: group.recurringPatterns,
    meetingTime: group.meetingTime,
    meetingStreet: group.meetingStreet,
    meetingCity: group.meetingCity,
    meetingPostalCode: group.meetingPostalCode,
    meetingLocationDetails: group.meetingLocationDetails,
    // Check if membership array has any items
    isMember: group.members.length > 0,
    // Check if responsible users array has any items
    isResponsiblePerson: group.responsibleUsers.length > 0,
  }));
}
