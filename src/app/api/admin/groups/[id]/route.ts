import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import { getGroupById, updateGroup, deleteGroup, GroupUpdateData } from '@/lib/group-handlers';
import { Group, ResponsiblePerson, StatusReport, GroupStatus } from '@prisma/client';
import { validateFile, uploadCroppedImagePair, deleteFiles, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE, FileUploadError } from '@/lib/file-upload';


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
    
    // Get existing group to check if it exists
    const existingGroup = await getGroupById(id);
    if (!existingGroup) {
      const response: GroupUpdateResponse = {
        success: false,
        error: 'Group not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Check if the request is multipart/form-data or JSON
    const contentType = request.headers.get('content-type') || '';
    let updateData: GroupUpdateData = { id };
    let logoMetadata = undefined;
    
    if (contentType.includes('multipart/form-data')) {
      // Handle form data for file uploads
      const formData = await request.formData();
      
      // Extract basic fields
      if (formData.has('name')) updateData.name = formData.get('name') as string;
      if (formData.has('description')) updateData.description = formData.get('description') as string;
      if (formData.has('status')) updateData.status = formData.get('status') as GroupStatus;
      
      // Handle responsible persons if provided
      if (formData.has('responsiblePersonsCount')) {
        const responsiblePersonsCount = parseInt(formData.get('responsiblePersonsCount') as string, 10) || 0;
        const responsiblePersons = [];
        
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
        
        updateData.responsiblePersons = responsiblePersons;
      }
      
      // Handle logo upload if present
      const originalLogo = formData.get('logo') as File | null;
      const croppedLogo = formData.get('croppedLogo') as File | null;
      
      // Check if removing logo
      if (formData.has('removeLogo') && formData.get('removeLogo') === 'true') {
        // Set logoMetadata to null to indicate removal
        logoMetadata = null;
      } 
      // Handle logo update
      else if (originalLogo && croppedLogo && originalLogo.size > 0 && croppedLogo.size > 0) {
        try {
          // Validate the original logo file
          validateFile(originalLogo, ALLOWED_IMAGE_TYPES, MAX_LOGO_SIZE);
          
          // Upload both original and cropped logos
          const logoUrls = await uploadCroppedImagePair(originalLogo, croppedLogo, 'groups', 'logo');
          
          // If we had previous logo files, delete them
          if (existingGroup.logoUrl) {
            try {
              const filesToDelete = [existingGroup.logoUrl];
              
              // Check if there's an original URL in metadata
              if (existingGroup.metadata) {
                try {
                  const metadata = JSON.parse(existingGroup.metadata);
                  if (metadata.originalUrl && metadata.originalUrl !== existingGroup.logoUrl) {
                    filesToDelete.push(metadata.originalUrl);
                  }
                } catch (e) {
                  console.error(`Error parsing metadata for group ${id}:`, e);
                }
              }
              
              await deleteFiles(filesToDelete);
            } catch (deleteError) {
              console.error('Error deleting old logo files:', deleteError);
              // Continue even if deletion fails
            }
          }
          
          // Store the URLs in metadata
          logoMetadata = {
            originalUrl: logoUrls.originalUrl,
            croppedUrl: logoUrls.croppedUrl
          };
        } catch (uploadError) {
          if (uploadError instanceof FileUploadError) {
            const response: GroupUpdateResponse = {
              success: false,
              error: uploadError.message
            };
            return NextResponse.json(response, { status: uploadError.status });
          }
          
          throw uploadError; // Re-throw if it's not a FileUploadError
        }
      }
      
      // Add logo metadata to update data if it was set
      if (logoMetadata !== undefined) {
        updateData.logoMetadata = logoMetadata;
      }
    } else {
      // Handle JSON data
      updateData = await request.json() as GroupUpdateData;
      updateData.id = id; // Ensure ID is set correctly
    }
    
    // Update the group
    const updatedGroup = await updateGroup(updateData);
    
    const response: GroupUpdateResponse = {
      success: true,
      group: updatedGroup as Group & {
        responsiblePersons: ResponsiblePerson[];
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error updating group:`, error);
    
    // Return friendly error message based on the error
    if (error instanceof Error) {
      // Handle validation errors or other known error types
      const response: GroupUpdateResponse = {
        success: false,
        error: error.message
      };
      
      // Return 400 for validation errors, 500 for other errors
      const status = error.message.includes('required') || 
                    error.message.includes('must be between') ? 400 : 500;
      
      return NextResponse.json(response, { status });
    }
    
    // Generic error for other types of errors
    const response: GroupUpdateResponse = {
      success: false,
      error: 'Failed to update group'
    };
    
    return NextResponse.json(response, { status: 500 });
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