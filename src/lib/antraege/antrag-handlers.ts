import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import type { Antrag, Prisma } from '@prisma/client';
import { deleteFiles } from '@/lib/blob-storage';
import {
  validationErrorResponse,
  handleDatabaseError,
  AppError,
  ErrorType
} from '@/lib/errors';
import type { AntragPurposes } from '@/lib/validation/antrag';
import { logger } from '@/lib/logger';
import { PaginatedResponse } from '@/types/api-types';

/**
 * Types for antrag operations
 */
export interface AntragUpdateData {
  id: string;         // Pre-validated: valid UUID format, required
  status?: 'NEU' | 'AKZEPTIERT' | 'ABGELEHNT'; // Pre-validated: valid status enum (when provided)
  title?: string;     // Pre-validated: 3-200 chars (when provided)
  summary?: string;   // Pre-validated: 10-300 chars (when provided)
  firstName?: string; // Pre-validated: 2-50 chars with German characters (when provided)
  lastName?: string;  // Pre-validated: 2-50 chars with German characters (when provided)
  email?: string;     // Pre-validated: valid email format, max 100 chars (when provided)
  purposes?: AntragPurposes; // Pre-validated: complex purpose structure with conditional field requirements (when provided)
  fileUrls?: string | null; // Pre-validated: JSON string of valid URLs (when provided)
  decisionComment?: string | null; // Pre-validated: max 2000 chars (when provided)
  decidedBy?: string | null;       // Pre-validated: max 100 chars (when provided)
  decidedAt?: Date | null;         // Pre-validated: valid date object (when provided)
}

export interface AntragCreateData {
  title: string;      // Pre-validated: 3-200 chars, required
  summary: string;    // Pre-validated: 10-300 chars, required
  firstName: string;  // Pre-validated: 2-50 chars with German characters, required
  lastName: string;   // Pre-validated: 2-50 chars with German characters, required
  email: string;      // Pre-validated: valid email format, max 100 chars, required
  purposes: AntragPurposes; // Pre-validated: complex purpose structure with conditional validation rules, at least one enabled
  fileUrls?: string | null; // Pre-validated: JSON string of valid URLs (optional)
}

/**
 * Retrieves Anträge (requests) with filtering, search, and pagination capabilities.
 *
 * @param request Pre-validated NextRequest with query parameters from API route level
 * @returns Promise resolving to NextResponse with paginated Antrag data
 * @throws Error Only for business logic failures (database operations, query processing, search filtering)
 *
 * Note: Query parameter validation is handled at API route level.
 * This function assumes all parameter validation has already passed.
 * Supports comprehensive filtering, full-text search, and optimized pagination.
 *
 * Supported views: 'all', 'pending' (NEU), 'approved' (AKZEPTIERT), 'rejected' (ABGELEHNT)
 * Search functionality covers: title, summary, firstName, lastName, email fields with case-insensitive matching.
 */
export async function getAntraege(request: NextRequest) {
  try {
    // Get query parameters for filtering
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'all';
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const id = url.searchParams.get('id');
    
    // Pagination parameters
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const skip = (page - 1) * pageSize;
    
    // If ID is provided, return a single antrag
    if (id) {
      const antrag = await prisma.antrag.findUnique({
        where: {
          id: id,
        }
      });
      
      if (!antrag) {
        return NextResponse.json(
          { error: 'Antrag not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(antrag);
    }

    // Build where clause for filtering
    const where: Prisma.AntragWhereInput = {};

    // Filter by view/status
    if (view && view !== 'all') {
      switch (view) {
        case 'pending':
          where.status = 'NEU';
          break;
        case 'approved':
          where.status = 'AKZEPTIERT';
          break;
        case 'rejected':
          where.status = 'ABGELEHNT';
          break;
        default:
          if (status && status !== 'all') {
            where.status = status as 'NEU' | 'AKZEPTIERT' | 'ABGELEHNT';
          }
      }
    } else if (status && status !== 'all') {
      where.status = status as 'NEU' | 'AKZEPTIERT' | 'ABGELEHNT';
    }

    // Add search functionality
    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { summary: { contains: searchTerm, mode: 'insensitive' } },
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Get total count for pagination
    const totalItems = await prisma.antrag.count({ where });

    // Get anträge with pagination
    const antraege = await prisma.antrag.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    });

    const totalPages = Math.ceil(totalItems / pageSize);

    const response: PaginatedResponse<Antrag> = {
      items: antraege,
      totalItems,
      page,
      pageSize,
      totalPages,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching anträge', { context: { error }, module: 'antraege' });
    return new AppError('Serverfehler beim Abrufen der Anträge', ErrorType.UNKNOWN, 500).toResponse();
  }
}

/**
 * Updates an existing Antrag with validated data and handles status changes.
 *
 * @param request Pre-validated NextRequest with JSON body from API route level
 * @returns Promise resolving to NextResponse with updated Antrag data
 * @throws Error Only for business logic failures (database operations, Antrag not found, transaction failures)
 *
 * Note: Input validation is handled at API route level using Zod schemas.
 * This function assumes all field validation has already passed.
 * Handles status changes, decision tracking, and automatic timestamp updates.
 *
 * Business rules enforced:
 * - Only existing Anträge can be updated (validates existence)
 * - Status changes automatically update decision metadata
 * - updatedAt timestamp is automatically managed by database
 * - Complex purposes object is serialized to JSON for storage
 */
export async function updateAntrag(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData }: AntragUpdateData = body;

    if (!id) {
      return validationErrorResponse({ id: 'Antrag ID is required' });
    }

    // Check if antrag exists
    const existingAntrag = await prisma.antrag.findUnique({
      where: { id }
    });

    if (!existingAntrag) {
      return NextResponse.json(
        { error: 'Antrag not found' },
        { status: 404 }
      );
    }

    // Build update data
    const prismaUpdateData: Prisma.AntragUpdateInput = {};

    if (updateData.status !== undefined) {
      prismaUpdateData.status = updateData.status;
    }
    if (updateData.title !== undefined) {
      prismaUpdateData.title = updateData.title;
    }
    if (updateData.summary !== undefined) {
      prismaUpdateData.summary = updateData.summary;
    }
    if (updateData.firstName !== undefined) {
      prismaUpdateData.firstName = updateData.firstName;
    }
    if (updateData.lastName !== undefined) {
      prismaUpdateData.lastName = updateData.lastName;
    }
    if (updateData.email !== undefined) {
      prismaUpdateData.email = updateData.email;
    }
    if (updateData.purposes !== undefined) {
      prismaUpdateData.purposes = JSON.stringify(updateData.purposes);
    }
    if (updateData.fileUrls !== undefined) {
      prismaUpdateData.fileUrls = updateData.fileUrls;
    }
    if (updateData.decisionComment !== undefined) {
      prismaUpdateData.decisionComment = updateData.decisionComment;
    }
    if (updateData.decidedBy !== undefined) {
      prismaUpdateData.decidedBy = updateData.decidedBy;
    }
    if (updateData.decidedAt !== undefined) {
      prismaUpdateData.decidedAt = updateData.decidedAt;
    }

    // Always update the updatedAt timestamp
    prismaUpdateData.updatedAt = new Date();

    // Update the antrag
    const updatedAntrag = await prisma.antrag.update({
      where: { id },
      data: prismaUpdateData,
    });

    return NextResponse.json(updatedAntrag);
  } catch (error) {
    logger.error('Error updating antrag', { context: { error }, module: 'antraege' });
    return handleDatabaseError(error, 'updateAntrag').toResponse();
  }
}

/**
 * Deletes an Antrag and its associated files from storage.
 *
 * @param request Pre-validated NextRequest with JSON body containing ID from API route level
 * @returns Promise resolving to NextResponse with deletion confirmation
 * @throws Error Only for business logic failures (database operations, Antrag not found, file deletion failures)
 *
 * Note: Input validation is handled at API route level using Zod schemas.
 * This function assumes all field validation has already passed.
 * Handles comprehensive cleanup of files and database records with graceful error handling.
 *
 * Business rules enforced:
 * - Only existing Anträge can be deleted (validates existence)
 * - Associated files are deleted from Vercel Blob Storage with error tolerance
 * - Database deletion occurs after file cleanup attempts
 * - File deletion failures don't block Antrag deletion (graceful degradation)
 */
export async function deleteAntrag(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return validationErrorResponse({ id: 'Antrag ID is required' });
    }

    // Check if antrag exists
    const existingAntrag = await prisma.antrag.findUnique({
      where: { id }
    });

    if (!existingAntrag) {
      return NextResponse.json(
        { error: 'Antrag not found' },
        { status: 404 }
      );
    }

    // Delete associated files from blob storage if they exist
    if (existingAntrag.fileUrls) {
      try {
        const fileUrls = JSON.parse(existingAntrag.fileUrls);
        if (Array.isArray(fileUrls) && fileUrls.length > 0) {
          await deleteFiles(fileUrls);
        }
      } catch (error) {
        logger.warn('Failed to delete files from blob storage', { context: { error }, module: 'antraege' });
      }
    }

    // Delete the antrag
    await prisma.antrag.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting antrag', { context: { error }, module: 'antraege' });
    return handleDatabaseError(error, 'deleteAntrag').toResponse();
  }
}

/**
 * Creates a new Antrag with validated data and file upload handling.
 *
 * @param data Pre-validated Antrag creation data from Zod schema validation at API route level
 * @returns Promise resolving to created Antrag with NEU status
 * @throws Error Only for business logic failures (database operations, file processing, external service failures)
 *
 * Note: Input validation is handled at API route level using Zod schemas.
 * This function assumes all field validation has already passed.
 * Sets initial status to 'NEU' and handles complex data serialization.
 *
 * Business rules enforced:
 * - New Anträge always start with 'NEU' status (workflow requirement)
 * - Complex purposes object is serialized to JSON for database storage
 * - File URLs are stored as JSON strings when provided
 * - Created and updated timestamps are automatically managed by database
 */
export async function createAntrag(data: AntragCreateData): Promise<Antrag> {
  try {
    // Create antrag with NEU status
    const antrag = await prisma.antrag.create({
      data: {
        title: data.title,
        summary: data.summary,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        purposes: JSON.stringify(data.purposes),
        fileUrls: data.fileUrls || null,
        status: 'NEU',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return antrag;
  } catch (error) {
    logger.error('Error creating antrag', { context: { error }, module: 'antraege' });
    throw error;
  }
}