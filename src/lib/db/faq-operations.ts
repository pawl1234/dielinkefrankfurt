/**
 * Database operations for FAQ system
 *
 * All database queries for FAQ entries are consolidated in this file.
 * Includes role-based authorization checks at the database layer following
 * the Next.js data access layer pattern.
 */

import prisma from './prisma';
import { FaqEntry, FaqStatus, Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

/**
 * Session context for authorization checks
 */
interface SessionContext {
  role: string;
  user?: {
    id: string;
    email?: string;
    username?: string;
  };
}

/**
 * Creates a new FAQ entry.
 *
 * @param data FAQ data including title, content, and optional status
 * @param userId ID of the admin user creating the FAQ (null for environment users)
 * @returns Promise resolving to created FAQ entry with user relations
 */
export async function createFaqEntry(
  data: { title: string; content: string; status?: FaqStatus },
  userId: string | null
): Promise<FaqEntry & {
  creator: { id: string; username: string } | null;
  updater: { id: string; username: string } | null;
}> {
  try {
    return await prisma.faqEntry.create({
      data: {
        title: data.title,
        content: data.content,
        status: data.status || FaqStatus.ACTIVE,
        createdBy: userId ?? undefined,
        updatedBy: userId ?? undefined
      },
      include: {
        creator: { select: { id: true, username: true } },
        updater: { select: { id: true, username: true } }
      }
    }) as FaqEntry & {
      creator: { id: string; username: string } | null;
      updater: { id: string; username: string } | null;
    };
  } catch (error) {
    logger.error(error instanceof Error ? error : 'Failed to create FAQ entry', {
      module: 'db/faq-operations',
      context: { title: data.title, userId },
      tags: ['faq', 'create', 'error']
    });
    throw error;
  }
}

/**
 * Finds FAQ entries with pagination, filtering, and search.
 * Admin-only operation with role-based authorization check.
 *
 * @param params Query parameters including where clause, order, pagination
 * @param session User session for authorization
 * @returns Promise resolving to FAQ entries and total count
 */
export async function findFaqsWithPagination(
  params: {
    where: Prisma.FaqEntryWhereInput;
    orderBy: Prisma.FaqEntryOrderByWithRelationInput;
    skip: number;
    take: number;
  },
  session: SessionContext | null
): Promise<{
  faqs: Array<FaqEntry & {
    creator: { id: string; username: string } | null;
    updater: { id: string; username: string } | null;
  }>;
  totalItems: number;
}> {
  // Authorization check: admin only
  if (!session || session.role !== 'admin') {
    logger.warn('Unauthorized FAQ pagination access attempt', {
      module: 'db/faq-operations',
      context: { role: session?.role, operation: 'findFaqsWithPagination' },
      tags: ['security', 'unauthorized']
    });
    throw new Error('Unauthorized: Nur Administratoren dürfen auf diese Funktion zugreifen');
  }

  try {
    const totalItems = await prisma.faqEntry.count({ where: params.where });

    const faqs = await prisma.faqEntry.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: {
        creator: { select: { id: true, username: true } },
        updater: { select: { id: true, username: true } }
      }
    });

    return { faqs, totalItems };
  } catch (error) {
    logger.error(error instanceof Error ? error : 'Failed to fetch paginated FAQs', {
      module: 'db/faq-operations',
      context: { userId: session.user?.id, skip: params.skip, take: params.take },
      tags: ['faq', 'list', 'error']
    });
    throw error;
  }
}

/**
 * Finds all active FAQ entries for member viewing.
 * Returns only ACTIVE entries, sorted alphabetically by title.
 *
 * @param session User session for authorization
 * @returns Promise resolving to active FAQ entries
 */
export async function findActiveFaqEntries(
  session: SessionContext | null
): Promise<Array<Pick<FaqEntry, 'id' | 'title' | 'content' | 'status' | 'createdAt' | 'updatedAt'>>> {
  // Authorization check: admin or mitglied
  if (!session || !['admin', 'mitglied'].includes(session.role)) {
    logger.warn('Unauthorized active FAQ access attempt', {
      module: 'db/faq-operations',
      context: { role: session?.role, operation: 'findActiveFaqEntries' },
      tags: ['security', 'unauthorized']
    });
    throw new Error('Unauthorized: Zugriff verweigert');
  }

  try {
    return await prisma.faqEntry.findMany({
      where: { status: FaqStatus.ACTIVE },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : 'Failed to fetch active FAQs', {
      module: 'db/faq-operations',
      context: { userId: session.user?.id, role: session.role },
      tags: ['faq', 'list', 'error']
    });
    throw error;
  }
}

/**
 * Finds a single FAQ entry by ID.
 * Role-based filtering: members can only see ACTIVE entries.
 *
 * @param id FAQ entry ID
 * @param session User session for authorization
 * @returns Promise resolving to FAQ entry or null
 */
export async function findFaqById(
  id: string,
  session: SessionContext | null
): Promise<(FaqEntry & {
  creator: { id: string; username: string } | null;
  updater: { id: string; username: string } | null;
}) | null> {
  // Authorization check: admin or mitglied
  if (!session || !['admin', 'mitglied'].includes(session.role)) {
    logger.warn('Unauthorized FAQ by ID access attempt', {
      module: 'db/faq-operations',
      context: { role: session?.role, operation: 'findFaqById', faqId: id },
      tags: ['security', 'unauthorized']
    });
    throw new Error('Unauthorized: Zugriff verweigert');
  }

  try {
    const faq = await prisma.faqEntry.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, username: true } },
        updater: { select: { id: true, username: true } }
      }
    });

    // Members can only see active FAQs
    if (session.role === 'mitglied' && faq?.status !== FaqStatus.ACTIVE) {
      return null;
    }

    return faq;
  } catch (error) {
    logger.error(error instanceof Error ? error : 'Failed to fetch FAQ by ID', {
      module: 'db/faq-operations',
      context: { userId: session.user?.id, faqId: id },
      tags: ['faq', 'get', 'error']
    });
    throw error;
  }
}

/**
 * Updates an existing FAQ entry.
 * Partial update with automatic updatedBy tracking.
 *
 * @param id FAQ entry ID
 * @param data Partial FAQ data to update
 * @param userId ID of the admin user updating the FAQ (null for environment users)
 * @returns Promise resolving to updated FAQ entry
 */
export async function updateFaqEntry(
  id: string,
  data: { title?: string; content?: string; status?: FaqStatus },
  userId: string | null
): Promise<FaqEntry & {
  creator: { id: string; username: string } | null;
  updater: { id: string; username: string } | null;
}> {
  try {
    return await prisma.faqEntry.update({
      where: { id },
      data: {
        ...data,
        updatedBy: userId ?? undefined
      },
      include: {
        creator: { select: { id: true, username: true } },
        updater: { select: { id: true, username: true } }
      }
    }) as FaqEntry & {
      creator: { id: string; username: string } | null;
      updater: { id: string; username: string } | null;
    };
  } catch (error) {
    logger.error(error instanceof Error ? error : 'Failed to update FAQ entry', {
      module: 'db/faq-operations',
      context: { faqId: id, userId },
      tags: ['faq', 'update', 'error']
    });
    throw error;
  }
}

/**
 * Deletes a FAQ entry (only if archived).
 * Safety rule: Cannot delete ACTIVE entries.
 *
 * @param id FAQ entry ID
 * @param session User session for authorization
 * @returns Promise resolving when deleted
 */
export async function deleteFaqEntry(
  id: string,
  session: SessionContext | null
): Promise<void> {
  // Authorization check: admin only
  if (!session || session.role !== 'admin') {
    logger.warn('Unauthorized FAQ delete attempt', {
      module: 'db/faq-operations',
      context: { role: session?.role, operation: 'deleteFaqEntry', faqId: id },
      tags: ['security', 'unauthorized']
    });
    throw new Error('Unauthorized: Nur Administratoren dürfen FAQs löschen');
  }

  try {
    // Safety check: Only allow deleting archived entries
    const faq = await prisma.faqEntry.findUnique({ where: { id } });
    if (!faq) {
      throw new Error('FAQ nicht gefunden');
    }
    if (faq.status === FaqStatus.ACTIVE) {
      logger.warn('Attempt to delete active FAQ blocked', {
        module: 'db/faq-operations',
        context: { faqId: id, userId: session.user?.id },
        tags: ['faq', 'delete', 'blocked']
      });
      throw new Error('Aktive FAQs können nicht gelöscht werden. Bitte zuerst archivieren.');
    }

    await prisma.faqEntry.delete({ where: { id } });
  } catch (error) {
    logger.error(error instanceof Error ? error : 'Failed to delete FAQ entry', {
      module: 'db/faq-operations',
      context: { faqId: id, userId: session.user?.id },
      tags: ['faq', 'delete', 'error']
    });
    throw error;
  }
}
