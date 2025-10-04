import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { put, del } from '@vercel/blob';
import {
  validateAntragUpdateWithZod
} from '@/lib/validation/antrag';

/**
 * GET /api/admin/antraege/[id]
 * 
 * Admin endpoint for retrieving a single Antrag by ID.
 * Authentication required.
 */
export const GET = withAdminAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Antrag ID is required' },
        { status: 400 }
      );
    }

    // Fetch the antrag with all fields
    const antrag = await prisma.antrag.findUnique({
      where: { id },
    });

    if (!antrag) {
      return NextResponse.json(
        { error: 'Antrag not found' },
        { status: 404 }
      );
    }

    // Return the full antrag details
    return NextResponse.json(antrag);
  } catch (error) {
    console.error('Error fetching antrag:', error);
    return NextResponse.json(
      { error: 'Failed to fetch antrag details' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/admin/antraege/[id]
 * 
 * Admin endpoint for updating an Antrag.
 * Authentication required.
 * Only allows updating anträge with NEU status.
 */
export const PUT = withAdminAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Antrag ID is required' },
        { status: 400 }
      );
    }

    // Check if antrag exists and get current data
    const existingAntrag = await prisma.antrag.findUnique({
      where: { id },
    });

    if (!existingAntrag) {
      return NextResponse.json(
        { error: 'Antrag not found' },
        { status: 404 }
      );
    }

    // Only allow editing anträge with NEU status
    if (existingAntrag.status !== 'NEU') {
      return NextResponse.json(
        { error: 'Only anträge with status NEU can be edited' },
        { status: 403 }
      );
    }

    // Handle both JSON and FormData
    const contentType = request.headers.get('content-type');
    let body: Record<string, unknown>;
    const newFiles: Blob[] = [];
    let filesToDelete: string[] = [];

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = {};

      // Extract fields from FormData
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('file-')) {
          // New file upload
          if (value instanceof Blob) {
            newFiles.push(value);
          }
        } else if (key === 'filesToDelete') {
          // Files to delete
          filesToDelete = JSON.parse(value as string);
        } else if (key === 'purposes') {
          // Parse purposes JSON
          body.purposes = JSON.parse(value as string);
        } else if (key === 'existingFileUrls') {
          // Existing files to keep
          body.fileUrls = JSON.parse(value as string);
        } else {
          // Regular fields
          body[key] = value;
        }
      }
    } else {
      // JSON request
      body = await request.json();
    }

    // Validate the update data using Zod schema with consistent error handling
    const validationResult = await validateAntragUpdateWithZod(body);
    if (!validationResult.isValid && validationResult.errors) {
      // Use consistent validationErrorResponse for field errors
      const { validationErrorResponse } = await import('@/lib/errors');
      return validationErrorResponse(validationResult.errors);
    }

    const updateData = validationResult.data!;

    // Handle file operations
    let updatedFileUrls: string[] = [];
    
    // Parse existing file URLs
    if (existingAntrag.fileUrls) {
      try {
        updatedFileUrls = JSON.parse(existingAntrag.fileUrls);
      } catch {
        updatedFileUrls = [];
      }
    }

    // Delete files marked for deletion
    if (filesToDelete.length > 0) {
      for (const fileUrl of filesToDelete) {
        try {
          await del(fileUrl);
          updatedFileUrls = updatedFileUrls.filter(url => url !== fileUrl);
        } catch (error) {
          console.error(`Failed to delete file: ${fileUrl}`, error);
        }
      }
    }

    // Upload new files
    if (newFiles.length > 0) {
      const uploadPromises = newFiles.map(async (file) => {
        const timestamp = Date.now();
        const filename = `antraege/${id}/${timestamp}-${(file as unknown as { name: string }).name}`;
        const blob = await put(filename, file, {
          access: 'public',
          addRandomSuffix: false,
        });
        return blob.url;
      });

      const newFileUrls = await Promise.all(uploadPromises);
      updatedFileUrls = [...updatedFileUrls, ...newFileUrls];
    }

    // If fileUrls was explicitly set in the body, use that instead
    if (updateData.fileUrls !== undefined) {
      updatedFileUrls = updateData.fileUrls || [];
    }

    // Build update object
    const prismaUpdateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Only include fields that were provided
    if (updateData.firstName !== undefined) prismaUpdateData.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) prismaUpdateData.lastName = updateData.lastName;
    if (updateData.email !== undefined) prismaUpdateData.email = updateData.email;
    if (updateData.title !== undefined) prismaUpdateData.title = updateData.title;
    if (updateData.summary !== undefined) prismaUpdateData.summary = updateData.summary;
    if (updateData.purposes !== undefined) prismaUpdateData.purposes = JSON.stringify(updateData.purposes);
    
    // Always update fileUrls if files were modified
    if (newFiles.length > 0 || filesToDelete.length > 0 || body.fileUrls !== undefined) {
      prismaUpdateData.fileUrls = updatedFileUrls.length > 0 ? JSON.stringify(updatedFileUrls) : null;
    }

    // Update the antrag
    const updatedAntrag = await prisma.antrag.update({
      where: { id },
      data: prismaUpdateData,
    });

    return NextResponse.json(updatedAntrag);
  } catch (error) {
    console.error('Error updating antrag:', error);
    return NextResponse.json(
      { error: 'Failed to update antrag' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/admin/antraege/[id]
 * 
 * Admin endpoint for deleting an Antrag.
 * Authentication required.
 * Performs atomic operation: deletes files first, then database record.
 * If file deletion fails, the operation is aborted.
 */
export const DELETE = withAdminAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Antrag ID is required' },
        { status: 400 }
      );
    }

    // Check if antrag exists and get current data
    const existingAntrag = await prisma.antrag.findUnique({
      where: { id },
    });

    if (!existingAntrag) {
      return NextResponse.json(
        { error: 'Antrag not found' },
        { status: 404 }
      );
    }

    // Collect all files that need to be deleted
    const filesToDelete: string[] = [];
    if (existingAntrag.fileUrls) {
      try {
        const fileUrls = JSON.parse(existingAntrag.fileUrls);
        if (Array.isArray(fileUrls)) {
          filesToDelete.push(...fileUrls);
        }
      } catch (error) {
        console.warn('Failed to parse file URLs for deletion:', error);
        // Continue with deletion even if file parsing fails
      }
    }

    // Delete files from blob storage first (atomic operation)
    // If any file deletion fails, abort the entire operation
    const deletionErrors: string[] = [];
    
    if (filesToDelete.length > 0) {
      console.log(`Deleting ${filesToDelete.length} files for antrag ${id}`);
      
      for (const fileUrl of filesToDelete) {
        try {
          await del(fileUrl);
          console.log(`Successfully deleted file: ${fileUrl}`);
        } catch (error) {
          const errorMessage = `Failed to delete file: ${fileUrl}`;
          console.error(errorMessage, error);
          deletionErrors.push(errorMessage);
        }
      }

      // If any file deletion failed, abort the operation
      if (deletionErrors.length > 0) {
        return NextResponse.json(
          { 
            error: 'Failed to delete associated files. Antrag deletion aborted to maintain data integrity.',
            details: deletionErrors
          },
          { status: 500 }
        );
      }
    }

    // All files deleted successfully, now delete the database record
    await prisma.antrag.delete({
      where: { id }
    });

    console.log(`Successfully deleted antrag ${id} and ${filesToDelete.length} associated files`);

    return NextResponse.json({ 
      success: true,
      message: 'Antrag and associated files deleted successfully',
      deletedFiles: filesToDelete.length
    });

  } catch (error) {
    console.error('Error deleting antrag:', error);
    
    // Check if it's a Prisma error (record not found, etc.)
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Antrag not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete antrag' },
      { status: 500 }
    );
  }
});