import { deleteFiles } from '@/lib/blob-storage';
import { logger } from '@/lib/logger';
import * as groupOps from '@/lib/db/group-operations';
import * as statusReportOps from '@/lib/db/status-report-operations';

/**
 * Collects and deletes all files associated with a group.
 * This includes the group logo and all files from associated status reports.
 *
 * @param groupId Group UUID to collect files from
 * @returns Promise resolving to array of file URLs that were deleted
 * @throws Error Only for database operation failures
 *
 * Note: File deletion failures are logged but don't prevent the operation from completing.
 * This function is used before deleting a group to clean up blob storage.
 */
export async function deleteGroupFiles(groupId: string): Promise<string[]> {
  try {
    // Get the group to check for files to delete
    const group = await groupOps.findGroupWithStatusReports(groupId);

    if (!group) {
      throw new Error(`Group with ID ${groupId} not found`);
    }

    // Collect files to delete
    const filesToDelete: string[] = [];

    // Add logo if it exists
    if (group.logoUrl) {
      filesToDelete.push(group.logoUrl);

      // Check for original logo URL in metadata
      if (group.metadata) {
        try {
          const metadata = JSON.parse(group.metadata);
          if (metadata.originalUrl && metadata.originalUrl !== group.logoUrl) {
            filesToDelete.push(metadata.originalUrl);
          }
        } catch (parseError) {
          logger.error(`Error parsing metadata for group ${groupId}`, { context: { parseError } });
        }
      }
    }

    // Add status report files
    for (const report of group.statusReports) {
      if (report.fileUrls) {
        try {
          const urls = JSON.parse(report.fileUrls);
          if (Array.isArray(urls)) {
            filesToDelete.push(...urls);
          }
        } catch (parseError) {
          logger.error(`Error parsing fileUrls for status report ${report.id}`, { context: { parseError } });
        }
      }
    }

    // Delete files from blob storage
    if (filesToDelete.length > 0) {
      try {
        await deleteFiles(filesToDelete);
      } catch (deleteError) {
        logger.error('Error deleting files from blob storage', { context: { deleteError } });
        // Continue even if file deletion fails
      }
    }

    return filesToDelete;
  } catch (error) {
    logger.error(`Error collecting files for group ${groupId}`, { context: { error } });
    throw error;
  }
}

/**
 * Collects and deletes all files associated with a status report.
 *
 * @param statusReportId Status report UUID to collect files from
 * @returns Promise resolving to array of file URLs that were deleted
 * @throws Error Only for database operation failures
 *
 * Note: File deletion failures are logged but don't prevent the operation from completing.
 * This function is used before deleting a status report to clean up blob storage.
 */
export async function deleteStatusReportFiles(statusReportId: string): Promise<string[]> {
  try {
    // Get the status report to check for files to delete
    const statusReport = await statusReportOps.findStatusReportById(statusReportId);

    if (!statusReport) {
      throw new Error(`Status report with ID ${statusReportId} not found`);
    }

    // Collect files to delete
    const filesToDelete: string[] = [];

    // Delete files from blob storage if they exist
    if (statusReport.fileUrls) {
      try {
        const fileUrls = JSON.parse(statusReport.fileUrls);
        if (Array.isArray(fileUrls) && fileUrls.length > 0) {
          filesToDelete.push(...fileUrls);
        }
      } catch (parseError) {
        logger.error(`Error parsing fileUrls for status report ${statusReportId}`, { context: { parseError } });
        // Continue even if parsing fails
      }
    }

    // Delete files from blob storage
    if (filesToDelete.length > 0) {
      try {
        await deleteFiles(filesToDelete);
      } catch (deleteError) {
        logger.error('Error deleting files from blob storage', { context: { deleteError } });
        // Continue even if file deletion fails
      }
    }

    return filesToDelete;
  } catch (error) {
    logger.error(`Error collecting files for status report ${statusReportId}`, { context: { error } });
    throw error;
  }
}
