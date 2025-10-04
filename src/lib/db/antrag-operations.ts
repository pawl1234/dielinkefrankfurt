import prisma from '../prisma';
import { Antrag, AntragStatus, Prisma } from '@prisma/client';
import { deleteFiles } from '../blob-storage';
import type { AntragPurposes } from '@/types/api-types';

/**
 * Types for Antrag operations
 */
export interface AntragCreateData {
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  summary: string;
  purposes: AntragPurposes;
  fileUrls?: string[];
}

export interface AntragUpdateData {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  title?: string;
  summary?: string;
  purposes?: AntragPurposes;
  fileUrls?: string[];
  status?: AntragStatus;
  decisionComment?: string;
  decidedBy?: string;
  decidedAt?: Date;
}

/**
 * Pagination and filtering response type
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * List options for Anträge
 */
export interface ListAntraegeOptions {
  status?: AntragStatus | 'ALL';
  searchTerm?: string;
  orderBy?: 'createdAt' | 'title' | 'lastName';
  orderDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Validate Antrag data
 */
export function validateAntragData(data: Partial<AntragCreateData>): string | null {
  if (!data.firstName || data.firstName.length < 2 || data.firstName.length > 50) {
    return 'Vorname muss zwischen 2 und 50 Zeichen lang sein';
  }
  
  if (!data.lastName || data.lastName.length < 2 || data.lastName.length > 50) {
    return 'Nachname muss zwischen 2 und 50 Zeichen lang sein';
  }
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return 'Gültige E-Mail-Adresse erforderlich';
  }
  
  if (!data.title || data.title.length < 3 || data.title.length > 200) {
    return 'Titel muss zwischen 3 und 200 Zeichen lang sein';
  }
  
  if (!data.summary || data.summary.length < 10 || data.summary.length > 300) {
    return 'Zusammenfassung muss zwischen 10 und 300 Zeichen lang sein';
  }
  
  if (!data.purposes || typeof data.purposes !== 'object') {
    return 'Mindestens ein Zweck muss ausgewählt werden';
  }
  
  // Check if at least one purpose is enabled
  const hasEnabledPurpose = Object.values(data.purposes).some(
    purpose => purpose && typeof purpose === 'object' && purpose.enabled === true
  );
  
  if (!hasEnabledPurpose) {
    return 'Mindestens ein Zweck muss ausgewählt werden';
  }
  
  // Validate specific purpose fields
  if (data.purposes.zuschuss?.enabled) {
    if (!data.purposes.zuschuss.amount || data.purposes.zuschuss.amount < 1 || data.purposes.zuschuss.amount > 999999) {
      return 'Betrag muss zwischen 1 und 999.999 Euro liegen';
    }
  }
  
  if (data.purposes.personelleUnterstuetzung?.enabled) {
    if (!data.purposes.personelleUnterstuetzung.details || data.purposes.personelleUnterstuetzung.details.trim().length === 0) {
      return 'Details zur personellen Unterstützung sind erforderlich';
    }
  }
  
  if (data.purposes.raumbuchung?.enabled) {
    if (!data.purposes.raumbuchung.location || data.purposes.raumbuchung.location.trim().length === 0) {
      return 'Ort für Raumbuchung ist erforderlich';
    }
    if (!data.purposes.raumbuchung.numberOfPeople || data.purposes.raumbuchung.numberOfPeople < 1) {
      return 'Anzahl der Personen muss mindestens 1 sein';
    }
    if (!data.purposes.raumbuchung.details || data.purposes.raumbuchung.details.trim().length === 0) {
      return 'Details zur Raumbuchung sind erforderlich';
    }
  }
  
  if (data.purposes.weiteres?.enabled) {
    if (!data.purposes.weiteres.details || data.purposes.weiteres.details.trim().length === 0) {
      return 'Details zu weiteren Anliegen sind erforderlich';
    }
  }
  
  return null;
}

/**
 * Create a new Antrag
 */
export async function createAntrag(data: AntragCreateData): Promise<Antrag> {
  // Validate Antrag data
  const validationError = validateAntragData(data);
  if (validationError) {
    throw new Error(validationError);
  }
  
  try {
    const antrag = await prisma.antrag.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim(),
        title: data.title.trim(),
        summary: data.summary.trim(),
        purposes: JSON.stringify(data.purposes),
        fileUrls: data.fileUrls && data.fileUrls.length > 0 ? JSON.stringify(data.fileUrls) : null,
        status: 'NEU' as AntragStatus,
      }
    });
    
    return antrag;
  } catch (error) {
    console.error('Error creating Antrag:', error);
    throw error;
  }
}

/**
 * Get a single Antrag by ID
 */
export async function getAntragById(id: string): Promise<Antrag | null> {
  try {
    const antrag = await prisma.antrag.findUnique({
      where: { id }
    });
    
    return antrag;
  } catch (error) {
    console.error(`Error fetching Antrag with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Update an Antrag
 */
export async function updateAntrag(id: string, data: Partial<AntragUpdateData>): Promise<Antrag> {
  try {
    const currentAntrag = await prisma.antrag.findUnique({
      where: { id }
    });
    
    if (!currentAntrag) {
      throw new Error(`Antrag mit ID ${id} nicht gefunden`);
    }
    
    // Prepare update data
    const updateData: Prisma.AntragUpdateInput = {};
    
    if (data.firstName !== undefined) updateData.firstName = data.firstName.trim();
    if (data.lastName !== undefined) updateData.lastName = data.lastName.trim();
    if (data.email !== undefined) updateData.email = data.email.trim();
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.summary !== undefined) updateData.summary = data.summary.trim();
    
    if (data.purposes !== undefined) {
      updateData.purposes = JSON.stringify(data.purposes);
    }
    
    if (data.fileUrls !== undefined) {
      updateData.fileUrls = data.fileUrls.length > 0 ? JSON.stringify(data.fileUrls) : null;
    }
    
    if (data.status !== undefined) updateData.status = data.status;
    if (data.decisionComment !== undefined) updateData.decisionComment = data.decisionComment;
    if (data.decidedBy !== undefined) updateData.decidedBy = data.decidedBy;
    if (data.decidedAt !== undefined) updateData.decidedAt = data.decidedAt;
    
    const updatedAntrag = await prisma.antrag.update({
      where: { id },
      data: updateData
    });
    
    return updatedAntrag;
  } catch (error) {
    console.error(`Error updating Antrag ${id}:`, error);
    throw error;
  }
}

/**
 * Delete an Antrag and return file URLs for cleanup
 */
export async function deleteAntrag(id: string): Promise<{ success: boolean; fileUrls?: string[] }> {
  try {
    const antrag = await prisma.antrag.findUnique({
      where: { id }
    });
    
    if (!antrag) {
      throw new Error(`Antrag mit ID ${id} nicht gefunden`);
    }
    
    // Extract file URLs for cleanup
    let fileUrls: string[] = [];
    if (antrag.fileUrls) {
      try {
        const urls = JSON.parse(antrag.fileUrls);
        if (Array.isArray(urls)) {
          fileUrls = urls;
        }
      } catch (parseError) {
        console.error(`Error parsing fileUrls for Antrag ${id}:`, parseError);
      }
    }
    
    // Delete the Antrag
    await prisma.antrag.delete({
      where: { id }
    });
    
    // Delete files from blob storage if they exist
    if (fileUrls.length > 0) {
      try {
        await deleteFiles(fileUrls);
      } catch (deleteError) {
        console.error('Error deleting files from blob storage:', deleteError);
        // Continue even if file deletion fails
      }
    }
    
    return { success: true, fileUrls };
  } catch (error) {
    console.error(`Error deleting Antrag ${id}:`, error);
    throw error;
  }
}

/**
 * List Anträge with pagination and filtering
 */
export async function listAntraege(options: ListAntraegeOptions = {}): Promise<PaginatedResponse<Antrag>> {
  const {
    status = 'ALL',
    searchTerm,
    orderBy = 'createdAt',
    orderDirection = 'desc',
    page = 1,
    pageSize = 20
  } = options;
  
  try {
    // Build where clause based on filters
    const where: Prisma.AntragWhereInput = {};
    
    // Filter by status if provided
    if (status && status !== 'ALL') {
      where.status = status;
    }
    
    // Filter by search term if provided
    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { summary: { contains: searchTerm, mode: 'insensitive' } },
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }
    
    // Calculate pagination values
    const skip = (page - 1) * pageSize;
    
    // Get total count
    const totalItems = await prisma.antrag.count({ where });
    
    // Fetch Anträge with filtering and pagination
    const antraege = await prisma.antrag.findMany({
      where,
      orderBy: {
        [orderBy]: orderDirection
      },
      skip,
      take: pageSize
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalItems / pageSize);
    
    return {
      items: antraege,
      totalItems,
      page,
      pageSize,
      totalPages
    };
  } catch (error) {
    console.error('Error fetching Anträge:', error);
    throw error;
  }
}

/**
 * Update Antrag status with decision details
 */
export async function updateAntragDecision(
  id: string, 
  status: AntragStatus, 
  comment?: string,
  decidedBy?: string
): Promise<Antrag> {
  try {
    const updateData: Prisma.AntragUpdateInput = {
      status,
      decidedAt: new Date()
    };
    
    if (comment) {
      updateData.decisionComment = comment;
    }
    
    if (decidedBy) {
      updateData.decidedBy = decidedBy;
    }
    
    const antrag = await prisma.antrag.update({
      where: { id },
      data: updateData
    });
    
    return antrag;
  } catch (error) {
    console.error(`Error updating Antrag decision for ${id}:`, error);
    throw error;
  }
}