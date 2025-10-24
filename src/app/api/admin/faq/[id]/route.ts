/**
 * Admin FAQ Single Entry API endpoints
 *
 * GET    /api/admin/faq/[id] - Get single FAQ entry
 * PATCH  /api/admin/faq/[id] - Update FAQ entry
 * DELETE /api/admin/faq/[id] - Delete FAQ entry (archived only)
 *
 * Authentication handled by middleware.
 * Additional authorization checks in database operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateFaqSchema } from '@/lib/validation/faq-schema';
import {
  findFaqById,
  updateFaqEntry,
  deleteFaqEntry
} from '@/lib/db/faq-operations';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import type { ApiHandler, IdRouteContext } from '@/types/api-types';

/**
 * GET /api/admin/faq/[id]
 *
 * Fetch a single FAQ entry by ID.
 * Admin-only endpoint.
 */
export const GET: ApiHandler<IdRouteContext> = async (request: NextRequest, context) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    const params = await context?.params;
    if (!params?.id) {
      return NextResponse.json({ error: 'FAQ-ID fehlt' }, { status: 400 });
    }

    const faq = await findFaqById(
      params.id,
      { role: session.user.role, user: { id: session.user.id } }
    );

    if (!faq) {
      return NextResponse.json({ error: 'FAQ nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(faq);
  } catch (error) {
    logger.error(error instanceof Error ? error : 'Failed to fetch FAQ by ID', {
      module: 'api/admin/faq/[id]',
      tags: ['faq', 'get', 'error']
    });
    return NextResponse.json(
      { error: 'FAQ konnte nicht geladen werden' },
      { status: 500 }
    );
  }
};

/**
 * PATCH /api/admin/faq/[id]
 *
 * Update an existing FAQ entry (partial update).
 * Admin-only endpoint.
 */
export const PATCH: ApiHandler<IdRouteContext> = async (request: NextRequest, context) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    const params = await context?.params;
    if (!params?.id) {
      return NextResponse.json({ error: 'FAQ-ID fehlt' }, { status: 400 });
    }

    const body = await request.json();

    // Validate with Zod
    const validatedData = updateFaqSchema.parse(body);

    // Use null for environment users, real user ID for database users
    const userId = session.user.isEnvironmentUser ? null : session.user.id;

    const faq = await updateFaqEntry(params.id, validatedData, userId);

    return NextResponse.json(faq);
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

    // Check for Prisma not found error
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'FAQ nicht gefunden' }, { status: 404 });
    }

    logger.error(error instanceof Error ? error : 'Failed to update FAQ', {
      module: 'api/admin/faq/[id]',
      tags: ['faq', 'update', 'error']
    });
    return NextResponse.json(
      { error: 'FAQ konnte nicht aktualisiert werden' },
      { status: 500 }
    );
  }
};

/**
 * DELETE /api/admin/faq/[id]
 *
 * Delete a FAQ entry (only if archived).
 * Admin-only endpoint.
 */
export const DELETE: ApiHandler<IdRouteContext> = async (request: NextRequest, context) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    const params = await context?.params;
    if (!params?.id) {
      return NextResponse.json({ error: 'FAQ-ID fehlt' }, { status: 400 });
    }

    await deleteFaqEntry(
      params.id,
      { role: session.user.role, user: { id: session.user.id } }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    // Check for specific error messages from database operations
    if (error instanceof Error) {
      if (error.message.includes('nicht gefunden')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('Aktive FAQs können nicht gelöscht werden')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    logger.error(error instanceof Error ? error : 'Failed to delete FAQ', {
      module: 'api/admin/faq/[id]',
      tags: ['faq', 'delete', 'error']
    });
    return NextResponse.json(
      { error: 'FAQ konnte nicht gelöscht werden' },
      { status: 500 }
    );
  }
};
