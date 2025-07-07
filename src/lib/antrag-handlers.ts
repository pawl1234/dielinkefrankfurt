import { NextRequest, NextResponse } from 'next/server';
import prisma from './prisma';
import type { Antrag, Prisma } from '@prisma/client';
import { serverErrorResponse } from './api-auth';
import { del } from '@vercel/blob';
import { 
  validationErrorResponse, 
  handleDatabaseError
} from './errors';
import type { AntragPurposes } from '@/types/api-types';

/**
 * Types for antrag operations
 */
export interface AntragUpdateData {
  id: string;
  status?: 'NEU' | 'AKZEPTIERT' | 'ABGELEHNT';
  title?: string;
  summary?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  purposes?: AntragPurposes;
  fileUrls?: string | null;
  decisionComment?: string | null;
  decidedBy?: string | null;
  decidedAt?: Date | null;
}

export interface AntragCreateData {
  title: string;
  summary: string;
  firstName: string;
  lastName: string;
  email: string;
  purposes: AntragPurposes;
  fileUrls?: string | null;
}

/**
 * Interface for paginated responses
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get all Anträge with optional filtering and pagination
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
    console.error('Error fetching anträge:', error);
    return serverErrorResponse('Failed to fetch anträge');
  }
}

/**
 * Update an existing antrag
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
    console.error('Error updating antrag:', error);
    return handleDatabaseError(error, 'updateAntrag').toResponse();
  }
}

/**
 * Delete an antrag
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
        if (Array.isArray(fileUrls)) {
          await Promise.all(
            fileUrls.map(async (url: string) => {
              try {
                await del(url);
              } catch (error) {
                console.warn(`Failed to delete file: ${url}`, error);
              }
            })
          );
        }
      } catch (error) {
        console.warn('Failed to parse file URLs for deletion:', error);
      }
    }

    // Delete the antrag
    await prisma.antrag.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting antrag:', error);
    return handleDatabaseError(error, 'deleteAntrag').toResponse();
  }
}