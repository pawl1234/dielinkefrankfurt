import { NextRequest, NextResponse } from 'next/server';
import { createGroup, ResponsiblePersonCreateData } from '@/lib/group-handlers';
import { validateFile, uploadCroppedImagePair, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE, FileUploadError } from '@/lib/file-upload';
import { logger } from '@/lib/logger';
import { validationErrorResponse, ValidationError, isValidationError } from '@/lib/errors';

/**
 * Response type for group submission
 */
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
  error?: string;
}

/**
 * POST /api/groups/submit
 * 
 * Public endpoint for submitting a new group request.
 * Handles file upload for group logo with cropping functionality.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data for file upload handling
    const formData = await request.formData();
    
    // Extract basic fields
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    
    // Extract responsible persons data
    const responsiblePersonsCount = parseInt(formData.get('responsiblePersonsCount') as string, 10) || 0;
    const responsiblePersons: ResponsiblePersonCreateData[] = [];
    
    for (let i = 0; i < responsiblePersonsCount; i++) {
      const firstName = formData.get(`responsiblePerson[${i}].firstName`) as string;
      const lastName = formData.get(`responsiblePerson[${i}].lastName`) as string;
      const email = formData.get(`responsiblePerson[${i}].email`) as string;
      
      if (firstName && lastName && email) {
        responsiblePersons.push({
          firstName,
          lastName,
          email
        });
      }
    }
    
    // Handle logo upload if present
    let logoMetadata = undefined;
    
    const originalLogo = formData.get('logo') as File | null;
    const croppedLogo = formData.get('croppedLogo') as File | null;
    
    if (originalLogo && croppedLogo && originalLogo.size > 0 && croppedLogo.size > 0) {
      try {
        // Validate the original logo file
        validateFile(originalLogo, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE);
        
        // Upload both original and cropped logos
        const logoUrls = await uploadCroppedImagePair(originalLogo, croppedLogo, 'groups', 'logo');
        
        // Store the URLs in metadata
        logoMetadata = {
          originalUrl: logoUrls.originalUrl,
          croppedUrl: logoUrls.croppedUrl
        };
      } catch (uploadError) {
        if (uploadError instanceof FileUploadError) {
          const response: GroupSubmitResponse = {
            success: false,
            error: uploadError.message
          };
          return NextResponse.json(response, { status: uploadError.status });
        }
        
        throw uploadError; // Re-throw if it's not a FileUploadError
      }
    }
    
    // Prepare group data
    const groupData = {
      name,
      description,
      logoMetadata,
      responsiblePersons
    };

    // Create the group (validation happens inside createGroup and throws ValidationError if needed)
    const newGroup = await createGroup(groupData);
    
    // Log successful group request submission
    logger.info('Group request submitted', {
      context: {
        groupId: newGroup.id,
        name: newGroup.name
      }
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
  } catch (error: unknown) {
    console.error('Error submitting group request:', error);

    // Check if it's a ValidationError from createGroup
    if (isValidationError(error)) {
      return error.toResponse();
    }

    // Generic error for other types of errors
    const response: GroupSubmitResponse = {
      success: false,
      error: 'Failed to submit group request'
    };

    return NextResponse.json(response, { status: 500 });
  }
}