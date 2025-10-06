import { NextRequest, NextResponse } from 'next/server';
import { createGroup } from '@/lib/groups';
import { uploadFiles, deleteFiles } from '@/lib/blob-storage';
import { FILE_TYPES } from '@/lib/validation/file-schemas';
import { logger } from '@/lib/logger';
import { apiErrorResponse, validationErrorResponse } from '@/lib/errors';
import { validateGroupWithZod } from '@/lib/validation/group';

export interface GroupSubmitResponse {
  success: boolean;
  message?: string;
  group?: {
    id: string;
    name: string;
    slug: string;
    description: string;
    status: string;
    logoUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

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
 * POST /api/groups/submit
 */
export async function POST(request: NextRequest) {
  let logoUrl: string | null = null;

  try {
    const formData = await request.formData();

    const groupData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      responsiblePersons: parseResponsiblePersons(formData)
    };

    const validationResult = await validateGroupWithZod(groupData);
    if (!validationResult.isValid && validationResult.errors) {
      return validationErrorResponse(validationResult.errors);
    }

    const logo = formData.get('logo') as File | null;
    if (logo && logo.size > 0) {
      try {
        const uploadResults = await uploadFiles([logo], {
          category: 'groups',
          prefix: 'logo',
          allowedTypes: FILE_TYPES.IMAGE
        });
        logoUrl = uploadResults[0].url;
        logger.info('Logo upload successful', { context: { logoUrl } });
      } catch (error) {
        logger.error('Logo upload failed', {
          context: { errorMessage: error instanceof Error ? error.message : String(error) }
        });
        return apiErrorResponse(error, 'Fehler beim Hochladen des Logos');
      }
    }

    const validatedData = {
      ...validationResult.data!,
      logoUrl: logoUrl || undefined
    };

    const newGroup = await createGroup(validatedData);

    logger.info('Group request submitted', {
      context: { groupId: newGroup.id, name: newGroup.name }
    });

    const response: GroupSubmitResponse = {
      success: true,
      message: 'Gruppenanfrage erfolgreich übermittelt',
      group: {
        id: newGroup.id,
        name: newGroup.name,
        slug: newGroup.slug,
        description: newGroup.description,
        status: newGroup.status,
        logoUrl: newGroup.logoUrl,
        createdAt: newGroup.createdAt.toISOString(),
        updatedAt: newGroup.updatedAt.toISOString()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    if (logoUrl) {
      try {
        await deleteFiles([logoUrl]);
        logger.info('Logo cleanup successful after error');
      } catch (deleteError) {
        logger.error('Logo cleanup failed', {
          context: { errorMessage: deleteError instanceof Error ? deleteError.message : String(deleteError) }
        });
      }
    }

    return apiErrorResponse(error, 'Fehler beim Übermitteln der Gruppenanfrage');
  }
}