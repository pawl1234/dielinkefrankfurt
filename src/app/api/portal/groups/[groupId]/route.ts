/**
 * Portal Group Detail API endpoint
 *
 * GET /api/portal/groups/[groupId] - Get group details with permissions
 * PUT /api/portal/groups/[groupId] - Update group (responsible persons only)
 *
 * Authentication handled by middleware.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findGroupById, findGroupResponsibleUsers } from '@/lib/db/group-operations';
import { updateGroup, GroupUpdateData } from '@/lib/groups';
import { getGroupPermissions, canUserEditGroup } from '@/lib/groups/permissions';
import { logger } from '@/lib/logger';
import type { PortalGroupDetail, GroupResponsibleUserResponse } from '@/types/api-types';
import { uploadFiles, deleteFiles } from '@/lib/blob-storage';
import { FILE_TYPES } from '@/lib/validation/file-schemas';
import { validateGroupUpdateWithZod } from '@/lib/validation/group';
import { apiErrorResponse, validationErrorResponse } from '@/lib/errors';
import { patternsToRRules } from '@/lib/groups/recurring-patterns';
import { PatternConfig } from '@/types/form-types';

/**
 * GET /api/portal/groups/[groupId]
 *
 * Get detailed information about a group with user permissions.
 */
export const GET = async (
  _request: NextRequest,
  context: { params: Promise<{ groupId: string }> }
): Promise<NextResponse> => {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'mitglied'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    // Get groupId from params
    const params = await context.params;
    const { groupId } = params;

    // Fetch group
    const group = await findGroupById(groupId);
    if (!group) {
      return NextResponse.json(
        { error: 'Gruppe nicht gefunden' },
        { status: 404 }
      );
    }

    // Get responsible users
    const responsibleUsers = await findGroupResponsibleUsers(groupId);

    // Get permissions for current user
    const permissions = await getGroupPermissions(session.user.id, groupId);

    // Map responsible users to response format
    const responsibleUsersResponse: GroupResponsibleUserResponse[] = responsibleUsers.map((ru) => ({
      id: ru.id,
      userId: ru.userId,
      groupId: ru.groupId,
      assignedAt: ru.assignedAt.toISOString(),
      user: {
        id: ru.user.id,
        firstName: ru.user.firstName,
        lastName: ru.user.lastName,
        email: ru.user.email
      }
    }));

    // Build response
    const groupDetail: PortalGroupDetail = {
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
      responsiblePersons: group.responsiblePersons.map((rp) => ({
        firstName: rp.firstName,
        lastName: rp.lastName,
        email: rp.email
      })),
      responsibleUsers: responsibleUsersResponse,
      permissions
    };

    return NextResponse.json({
      success: true,
      group: groupDetail
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : 'Failed to fetch group detail', {
      module: 'api/portal/groups/[groupId]',
      tags: ['groups', 'detail', 'error']
    });
    return NextResponse.json(
      { error: 'Gruppe konnte nicht geladen werden' },
      { status: 500 }
    );
  }
};

/**
 * Parse responsible persons from FormData
 *
 * @param formData - FormData object containing responsible persons
 * @returns Array of responsible persons
 */
function parseResponsiblePersons(formData: FormData) {
  const count = parseInt(formData.get('responsiblePersonsCount') as string, 10) || 0;
  const persons = [];

  for (let i = 0; i < count; i++) {
    const firstName = formData.get(`responsiblePerson[${i}].firstName`) as string;
    const lastName = formData.get(`responsiblePerson[${i}].lastName`) as string;
    const email = formData.get(`responsiblePerson[${i}].email`) as string;

    if (firstName && lastName && email) {
      persons.push({ firstName, lastName, email });
    }
  }

  return persons;
}

/**
 * Parse recurring meeting data from FormData
 *
 * @param formData - FormData object containing recurring meeting data
 * @returns Recurring meeting data with rrule strings and time
 */
function parseRecurringMeeting(formData: FormData): {
  recurringPatterns: string | null | undefined;
  meetingTime: string | null | undefined;
} {
  const recurringMeetingData = formData.get('recurringMeeting') as string | null;

  if (!recurringMeetingData) {
    return { recurringPatterns: undefined, meetingTime: undefined };
  }

  try {
    const parsed = JSON.parse(recurringMeetingData);

    // Handle "no meeting" case
    if (parsed.hasNoMeeting === true) {
      return { recurringPatterns: '[]', meetingTime: null };
    }

    // Handle patterns
    if (parsed.patterns && Array.isArray(parsed.patterns) && parsed.patterns.length > 0) {
      const rruleStrings = patternsToRRules(parsed.patterns as PatternConfig[]);
      return {
        recurringPatterns: JSON.stringify(rruleStrings),
        meetingTime: parsed.time || null
      };
    }

    return { recurringPatterns: null, meetingTime: null };
  } catch (error) {
    logger.error('Failed to parse recurringMeeting data', {
      module: 'api/portal/groups/[groupId]',
      context: { error }
    });
    return { recurringPatterns: undefined, meetingTime: undefined };
  }
}

/**
 * PUT /api/portal/groups/[groupId]
 *
 * Update group details (responsible persons only).
 * Similar to admin endpoint but prevents status changes.
 */
export const PUT = async (
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> }
): Promise<NextResponse> => {
  let logoUrl: string | null = null;

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'mitglied'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    const params = await context.params;
    const { groupId } = params;

    if (!groupId) {
      return NextResponse.json(
        { error: 'Gruppen-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Check if group exists
    const existingGroup = await findGroupById(groupId);
    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Gruppe nicht gefunden' },
        { status: 404 }
      );
    }

    // Check if user has permission to edit this group
    const canEdit = await canUserEditGroup(session.user.id, groupId);
    if (!canEdit) {
      logger.warn('Unauthorized group edit attempt', {
        module: 'api/portal/groups/[groupId]',
        context: { userId: session.user.id, groupId }
      });
      return NextResponse.json(
        { error: 'Du hast keine Berechtigung, diese Gruppe zu bearbeiten' },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let updateData: GroupUpdateData = { id: groupId };

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();

      const recurringMeeting = parseRecurringMeeting(formData);

      // Parse all fields
      const parsedData: Partial<GroupUpdateData> = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        recurringPatterns: recurringMeeting.recurringPatterns,
        meetingTime: recurringMeeting.meetingTime,
        meetingStreet: formData.get('meetingStreet') as string || undefined,
        meetingCity: formData.get('meetingCity') as string || undefined,
        meetingPostalCode: formData.get('meetingPostalCode') as string || undefined,
        meetingLocationDetails: formData.get('meetingLocationDetails') as string || undefined,
        responsiblePersons: parseResponsiblePersons(formData)
      };

      // IMPORTANT: Remove status if provided - portal users cannot change status
      // This prevents privilege escalation
      delete parsedData.status;

      updateData = {
        id: groupId,
        ...parsedData
      };

      const logo = formData.get('logo') as File | null;

      if (formData.has('removeLogo') && formData.get('removeLogo') === 'true') {
        updateData.logoUrl = null;
        if (existingGroup.logoUrl) {
          try {
            await deleteFiles([existingGroup.logoUrl]);
            logger.info('Old logo deleted successfully', {
              module: 'api/portal/groups/[groupId]',
              context: { groupId }
            });
          } catch (deleteError) {
            logger.error('Error deleting old logo', {
              module: 'api/portal/groups/[groupId]',
              context: {
                errorMessage: deleteError instanceof Error ? deleteError.message : String(deleteError),
                groupId
              }
            });
          }
        }
      } else if (logo && logo.size > 0) {
        try {
          const uploadResults = await uploadFiles([logo], {
            category: 'groups',
            prefix: 'logo',
            allowedTypes: FILE_TYPES.IMAGE
          });
          logoUrl = uploadResults[0].url;
          logger.info('Logo upload successful', {
            module: 'api/portal/groups/[groupId]',
            context: { logoUrl, groupId }
          });

          if (existingGroup.logoUrl) {
            try {
              await deleteFiles([existingGroup.logoUrl]);
              logger.info('Old logo deleted successfully', {
                module: 'api/portal/groups/[groupId]',
                context: { groupId }
              });
            } catch (deleteError) {
              logger.error('Error deleting old logo', {
                module: 'api/portal/groups/[groupId]',
                context: {
                  errorMessage: deleteError instanceof Error ? deleteError.message : String(deleteError),
                  groupId
                }
              });
            }
          }

          updateData.logoUrl = logoUrl;
        } catch (error) {
          logger.error('Logo upload failed', {
            module: 'api/portal/groups/[groupId]',
            context: {
              errorMessage: error instanceof Error ? error.message : String(error),
              groupId
            }
          });
          return apiErrorResponse(error, 'Fehler beim Hochladen des Logos');
        }
      }
    } else {
      updateData = await request.json() as GroupUpdateData;
      updateData.id = groupId;
      // Remove status if provided via JSON
      delete updateData.status;
    }

    const validationResult = await validateGroupUpdateWithZod(updateData);
    if (!validationResult.isValid && validationResult.errors) {
      return validationErrorResponse(validationResult.errors);
    }

    const validatedData = {
      ...updateData,
      ...validationResult.data
    };

    const updatedGroup = await updateGroup(validatedData);

    logger.info('Group updated successfully by responsible person', {
      module: 'api/portal/groups/[groupId]',
      context: {
        groupId: updatedGroup.id,
        name: updatedGroup.name,
        userId: session.user.id
      }
    });

    return NextResponse.json({
      success: true,
      group: updatedGroup
    });
  } catch (error) {
    if (logoUrl) {
      try {
        await deleteFiles([logoUrl]);
      } catch (deleteError) {
        logger.error('Logo cleanup failed', {
          module: 'api/portal/groups/[groupId]',
          context: {
            errorMessage: deleteError instanceof Error ? deleteError.message : String(deleteError)
          }
        });
      }
    }

    return apiErrorResponse(error, 'Fehler beim Aktualisieren der Gruppe');
  }
};
