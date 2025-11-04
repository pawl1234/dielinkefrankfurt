import { isUserMemberOfGroup } from '@/lib/db/group-member-operations';
import { isUserResponsibleForGroup } from '@/lib/db/group-operations';

/**
 * Check if user has permission to edit a group.
 * Only responsible persons can edit groups.
 *
 * @param userId - ID of the user
 * @param groupId - ID of the group
 * @returns Promise resolving to boolean indicating edit permission
 */
export async function canUserEditGroup(
  userId: string,
  groupId: string
): Promise<boolean> {
  return await isUserResponsibleForGroup(userId, groupId);
}

/**
 * Check if user has permission to manage members.
 * Only responsible persons can manage members.
 *
 * @param userId - ID of the user
 * @param groupId - ID of the group
 * @returns Promise resolving to boolean indicating member management permission
 */
export async function canUserManageMembers(
  userId: string,
  groupId: string
): Promise<boolean> {
  return await isUserResponsibleForGroup(userId, groupId);
}

/**
 * Check if user can leave a group.
 * Users can leave if they are members but NOT responsible persons.
 *
 * @param userId - ID of the user
 * @param groupId - ID of the group
 * @returns Promise resolving to boolean indicating leave permission
 */
export async function canUserLeaveGroup(
  userId: string,
  groupId: string
): Promise<boolean> {
  const isMember = await isUserMemberOfGroup(userId, groupId);
  const isResponsible = await isUserResponsibleForGroup(userId, groupId);
  return isMember && !isResponsible;
}

/**
 * Get comprehensive permissions for a user on a group.
 *
 * @param userId - ID of the user
 * @param groupId - ID of the group
 * @returns Promise resolving to object with all permission flags
 */
export async function getGroupPermissions(
  userId: string,
  groupId: string
): Promise<{
  isMember: boolean;
  isResponsiblePerson: boolean;
  canEdit: boolean;
  canManageMembers: boolean;
  canLeave: boolean;
}> {
  const isMember = await isUserMemberOfGroup(userId, groupId);
  const isResponsiblePerson = await isUserResponsibleForGroup(userId, groupId);

  return {
    isMember,
    isResponsiblePerson,
    canEdit: isResponsiblePerson,
    canManageMembers: isResponsiblePerson,
    canLeave: isMember && !isResponsiblePerson,
  };
}
