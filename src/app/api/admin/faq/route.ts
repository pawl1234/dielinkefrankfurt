/**
 * Admin FAQ API endpoints
 *
 * GET  /api/admin/faq - List FAQs with pagination
 * POST /api/admin/faq - Create new FAQ entry
 *
 * Authentication handled by middleware.
 * Additional authorization checks in database operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createFaqSchema, FAQ_SEARCH_MAX_LENGTH } from '@/lib/validation/faq-schema';
import {
  createFaqEntry,
  findFaqsWithPagination
} from '@/lib/db/faq-operations';
import { resolveUserId } from '@/lib/db/system-user';
import { logger } from '@/lib/logger';
import { FaqStatus } from '@prisma/client';
import { z } from 'zod';
import type { ApiHandler } from '@/types/api-types';

/**
 * GET /api/admin/faq
 *
 * List FAQ entries with pagination, status filter, and search.
 * Admin-only endpoint.
 */
export const GET: ApiHandler = async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const statusParam = searchParams.get('status');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {};
    if (statusParam && ['ACTIVE', 'ARCHIVED'].includes(statusParam)) {
      where.status = statusParam as FaqStatus;
    }
    if (search) {
      where.OR = [
        { title: { contains: search.slice(0, FAQ_SEARCH_MAX_LENGTH), mode: 'insensitive' } },
        { content: { contains: search.slice(0, FAQ_SEARCH_MAX_LENGTH), mode: 'insensitive' } }
      ];
    }

    const { faqs, totalItems } = await findFaqsWithPagination(
      {
        where,
        orderBy: { title: 'asc' },
        skip,
        take: pageSize
      },
      { role: session.user.role, user: { id: session.user.id } }
    );

    const totalPages = Math.ceil(totalItems / pageSize);

    return NextResponse.json({
      faqs,
      totalItems,
      totalPages,
      currentPage: page,
      pageSize
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : 'Failed to fetch FAQs', {
      module: 'api/admin/faq',
      tags: ['faq', 'list', 'error']
    });
    return NextResponse.json(
      { error: 'FAQ konnten nicht geladen werden' },
      { status: 500 }
    );
  }
};

/**
 * POST /api/admin/faq
 *
 * Create a new FAQ entry.
 * Admin-only endpoint.
 */
export const POST: ApiHandler = async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    const body = await request.json();

    // Validate with Zod
    const validatedData = createFaqSchema.parse(body);

    // Resolve user ID (handle environment users)
    const userId = await resolveUserId(session.user.id, session.user.isEnvironmentUser);

    const faq = await createFaqEntry(validatedData, userId);

    return NextResponse.json(faq, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validierung fehlgeschlagen',
          details: error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    logger.error(error instanceof Error ? error : 'Failed to create FAQ', {
      module: 'api/admin/faq',
      tags: ['faq', 'create', 'error']
    });
    return NextResponse.json(
      { error: 'FAQ konnte nicht erstellt werden' },
      { status: 500 }
    );
  }
};
