import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth';
import { getGroupById, updateGroup, deleteGroup, GroupUpdateData } from '@/lib/groups';
import { Group, ResponsiblePerson, StatusReport, GroupStatus } from '@prisma/client';
import { GroupWithResponsiblePersons } from '@/types/email-types';
import { uploadFiles, deleteFiles } from '@/lib/blob-storage';
import { FILE_TYPES } from '@/lib/validation/file-schemas';
import { logger } from '@/lib/logger';
import { validateGroupUpdateWithZod } from '@/lib/validation/group';
import { apiErrorResponse, validationErrorResponse } from '@/lib/errors';


/**
 * Parse responsible persons from FormData
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
 * Response type for group details
 */
export interface GroupDetailResponse {
  group?: (Group & {
    responsiblePersons: ResponsiblePerson[];
    statusReports: StatusReport[];
  }) | null;
  error?: string;
}

/**
 * Response type for group update
 */
export interface GroupUpdateResponse {
  success: boolean;
  group?: Group & {
    responsiblePersons: ResponsiblePerson[];
  };
  error?: string;
}

/**
 * GET /api/admin/groups/[id]
 * 
 * Admin endpoint for retrieving a specific group by ID.
 * Authentication required.
 */
export const GET = withAdminAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const params = await context.params;
    const { id } = params;
    
    if (!id) {
      const response: GroupDetailResponse = {
        error: 'Group ID is required'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const group = await getGroupById(id);
    
    if (!group) {
      const response: GroupDetailResponse = {
        error: 'Group not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    const response: GroupDetailResponse = { 
      group: group as (Group & {
        responsiblePersons: ResponsiblePerson[];
        statusReports: StatusReport[];
      })
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error fetching group:`, error);
    
    const response: GroupDetailResponse = {
      error: 'Failed to fetch group'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
});

/**
 * PUT /api/admin/groups/[id]
 * 
 * Admin endpoint for updating group details.
 * Handles file uploads for group logo.
 * Authentication required.
 */
export const PUT = withAdminAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  let logoUrl: string | null = null;

  try {
    const params = await context.params;
    const { id } = params;

    if (!id) {
      const response: GroupUpdateResponse = {
        success: false,
        error: 'Group ID is required'
      };
      return NextResponse.json(response, { status: 400 });
    }

    const existingGroup = await getGroupById(id);
    if (!existingGroup) {
      const response: GroupUpdateResponse = {
        success: false,
        error: 'Group not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const contentType = request.headers.get('content-type') || '';
    let updateData: GroupUpdateData = { id };

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();

      const parsedData: Partial<GroupUpdateData> = {};

      if (formData.has('name')) {
        parsedData.name = formData.get('name') as string;
      }

      if (formData.has('description')) {
        parsedData.description = formData.get('description') as string;
      }

      if (formData.has('status')) {
        parsedData.status = formData.get('status') as GroupStatus;
      }

      if (formData.has('responsiblePersonsCount')) {
        parsedData.responsiblePersons = parseResponsiblePersons(formData);
      }

      updateData = {
        id,
        ...parsedData
      };

      const logo = formData.get('logo') as File | null;

      if (formData.has('removeLogo') && formData.get('removeLogo') === 'true') {
        updateData.logoUrl = null;
        if (existingGroup.logoUrl) {
          try {
            await deleteFiles([existingGroup.logoUrl]);
            logger.info('Old logo deleted successfully');
          } catch (deleteError) {
            logger.error('Error deleting old logo', {
              context: { errorMessage: deleteError instanceof Error ? deleteError.message : String(deleteError) }
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
          logger.info('Logo upload successful', { context: { logoUrl } });

          if (existingGroup.logoUrl) {
            try {
              await deleteFiles([existingGroup.logoUrl]);
              logger.info('Old logo deleted successfully');
            } catch (deleteError) {
              logger.error('Error deleting old logo', {
                context: { errorMessage: deleteError instanceof Error ? deleteError.message : String(deleteError) }
              });
            }
          }

          updateData.logoUrl = logoUrl;
        } catch (error) {
          logger.error('Logo upload failed', {
            context: { errorMessage: error instanceof Error ? error.message : String(error) }
          });
          return apiErrorResponse(error, 'Fehler beim Hochladen des Logos');
        }
      }
    } else {
      updateData = await request.json() as GroupUpdateData;
      updateData.id = id;
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
    
    // If status was changed, send appropriate notification emails
    if (validatedData.status && validatedData.status !== existingGroup.status) {
      try {
        const { sendGroupAcceptanceEmail, sendGroupArchivingEmail } = await import('@/lib/email');

        let emailResult;
        if (validatedData.status === 'ACTIVE') {
          emailResult = await sendGroupAcceptanceEmail(updatedGroup as GroupWithResponsiblePersons);
        } else if (validatedData.status === 'ARCHIVED') {
          emailResult = await sendGroupArchivingEmail(updatedGroup as GroupWithResponsiblePersons);
        }

        if (emailResult && !emailResult.success) {
          logger.error('Failed to send notification email', {
            context: {
              groupId: id,
              errorMessage: emailResult.error instanceof Error ? emailResult.error.message : String(emailResult.error)
            }
          });
        }
      } catch (emailError) {
        logger.error('Failed to send notification email', {
          context: {
            groupId: id,
            errorMessage: emailError instanceof Error ? emailError.message : String(emailError)
          }
        });
      }
    }

    logger.info('Group updated successfully', {
      context: { groupId: updatedGroup.id, name: updatedGroup.name }
    });
    
    const response: GroupUpdateResponse = {
      success: true,
      group: updatedGroup as Group & {
        responsiblePersons: ResponsiblePerson[];
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    if (logoUrl) {
      try {
        await deleteFiles([logoUrl]);
      } catch (deleteError) {
        logger.error('Logo cleanup failed', {
          context: { errorMessage: deleteError instanceof Error ? deleteError.message : String(deleteError) }
        });
      }
    }

    return apiErrorResponse(error, 'Fehler beim Aktualisieren der Gruppe');
  }
});

/**
 * DELETE /api/admin/groups/[id]
 * 
 * Admin endpoint for deleting a group.
 * Deletes the group and all related data, including responsible persons and status reports.
 * Also deletes any associated files from blob storage.
 * Authentication required.
 */
export const DELETE = withAdminAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  try {
    const params = await context.params;
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Group ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the group exists
    const group = await getGroupById(id);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }
    
    // Delete the group and related data
    await deleteGroup(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error deleting group:`, error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete group' },
      { status: 500 }
    );
  }
});