import prisma from './prisma';
import { StatusReport, StatusReportStatus, Group, Prisma } from '@prisma/client';

/**
 * Creates a new status report.
 *
 * @param data Status report data
 * @returns Promise resolving to created status report
 */
export async function createStatusReport(data: {
  title: string;
  content: string;
  reporterFirstName: string;
  reporterLastName: string;
  fileUrls: string | null;
  status: StatusReportStatus;
  groupId: string;
}): Promise<StatusReport> {
  return await prisma.statusReport.create({
    data: {
      title: data.title,
      content: data.content,
      reporterFirstName: data.reporterFirstName,
      reporterLastName: data.reporterLastName,
      fileUrls: data.fileUrls,
      status: data.status,
      groupId: data.groupId
    }
  });
}

/**
 * Finds status reports with pagination and filtering.
 *
 * @param params Query parameters including where clause, order, skip, take
 * @returns Promise resolving to status reports array and total count
 */
export async function findStatusReportsWithPagination(params: {
  where: Prisma.StatusReportWhereInput;
  orderBy: Prisma.StatusReportOrderByWithRelationInput;
  skip: number;
  take: number;
}): Promise<{ statusReports: StatusReport[]; totalItems: number }> {
  const totalItems = await prisma.statusReport.count({ where: params.where });

  const statusReports = await prisma.statusReport.findMany({
    where: params.where,
    orderBy: params.orderBy,
    include: {
      group: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true
        }
      }
    },
    skip: params.skip,
    take: params.take
  });

  return { statusReports, totalItems };
}

/**
 * Finds a status report by ID with group data.
 *
 * @param id Status report UUID
 * @returns Promise resolving to status report or null if not found
 */
export async function findStatusReportById(id: string): Promise<(StatusReport & { group?: Group & { responsiblePersons?: Array<{ id: string; firstName: string; lastName: string; email: string; groupId: string }> } }) | null> {
  return await prisma.statusReport.findUnique({
    where: { id },
    include: {
      group: {
        include: {
          responsiblePersons: true
        }
      }
    }
  });
}

/**
 * Finds active status reports for a group.
 *
 * @param groupId Group UUID
 * @returns Promise resolving to array of active status reports
 */
export async function findActiveStatusReportsByGroupId(groupId: string): Promise<StatusReport[]> {
  return await prisma.statusReport.findMany({
    where: {
      groupId: groupId,
      status: 'ACTIVE' as StatusReportStatus
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

/**
 * Updates status report status.
 *
 * @param id Status report UUID
 * @param status New status
 * @returns Promise resolving to updated status report with group and responsible persons
 */
export async function updateStatusReportStatus(
  id: string,
  status: StatusReportStatus
): Promise<StatusReport & { group: Group & { responsiblePersons: Array<{ id: string; firstName: string; lastName: string; email: string; groupId: string }> } }> {
  return await prisma.statusReport.update({
    where: { id },
    data: { status },
    include: {
      group: {
        include: {
          responsiblePersons: true
        }
      }
    }
  });
}

/**
 * Updates a status report.
 *
 * @param id Status report UUID
 * @param updateData Status report update data
 * @returns Promise resolving to updated status report with group and responsible persons
 */
export async function updateStatusReport(
  id: string,
  updateData: Prisma.StatusReportUpdateInput
): Promise<StatusReport & { group: Group & { responsiblePersons: Array<{ id: string; firstName: string; lastName: string; email: string; groupId: string }> } }> {
  return await prisma.statusReport.update({
    where: { id },
    data: updateData,
    include: {
      group: {
        include: {
          responsiblePersons: true
        }
      }
    }
  });
}

/**
 * Deletes a status report.
 *
 * @param id Status report UUID
 * @returns Promise resolving when deletion is complete
 */
export async function deleteStatusReport(id: string): Promise<void> {
  await prisma.statusReport.delete({
    where: { id }
  });
}

/**
 * Finds recent active status reports for newsletter generation.
 *
 * @param since Date to filter from (e.g., 2 weeks ago)
 * @returns Promise resolving to status reports with group data
 */
export async function findRecentActiveStatusReports(since: Date): Promise<(StatusReport & { group: Group })[]> {
  return await prisma.statusReport.findMany({
    where: {
      status: 'ACTIVE' as StatusReportStatus,
      createdAt: {
        gte: since
      }
    },
    include: {
      group: true
    },
    orderBy: [
      { group: { name: 'asc' } },
      { createdAt: 'desc' }
    ]
  });
}
