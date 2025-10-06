import prisma from './prisma';
import { Group, GroupStatus, ResponsiblePerson, StatusReport, Prisma } from '@prisma/client';

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
      updatedAt: true
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
