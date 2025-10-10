import prisma from './prisma';
import { GroupSettings } from '@prisma/client';

/**
 * Gets the global group settings singleton record.
 * Creates record with default values if it doesn't exist.
 *
 * @returns Promise resolving to GroupSettings
 */
export async function getGroupSettings(): Promise<GroupSettings> {
  // Try to find existing settings (ID = 1)
  let settings = await prisma.groupSettings.findUnique({
    where: { id: 1 }
  });

  // Create default settings if not found
  if (!settings) {
    settings = await prisma.groupSettings.create({
      data: {
        id: 1,
        officeContactEmail: null
      }
    });
  }

  return settings;
}

/**
 * Updates the global group settings.
 *
 * @param data - Partial settings data to update
 * @returns Promise resolving to updated GroupSettings
 */
export async function updateGroupSettings(
  data: Partial<Pick<GroupSettings, 'officeContactEmail'>>
): Promise<GroupSettings> {
  return await prisma.groupSettings.upsert({
    where: { id: 1 },
    update: data,
    create: {
      id: 1,
      officeContactEmail: data.officeContactEmail || null
    }
  });
}
