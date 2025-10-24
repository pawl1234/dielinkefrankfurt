/**
 * Portal FAQ Single Entry API endpoint
 *
 * GET /api/portal/faq/[id] - Get single active FAQ entry
 *
 * Authentication handled by middleware.
 * Additional authorization checks in database operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findFaqById } from '@/lib/db/faq-operations';
import { logger } from '@/lib/logger';
import type { ApiHandler, IdRouteContext } from '@/types/api-types';

/**
 * GET /api/portal/faq/[id]
 *
 * Fetch a single active FAQ entry by ID.
 * Returns 404 if archived or doesn't exist.
 */
export const GET: ApiHandler<IdRouteContext> = async (request: NextRequest, context) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'mitglied'].includes(session.user.role)) {
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
      module: 'api/portal/faq/[id]',
      tags: ['faq', 'get', 'error']
    });
    return NextResponse.json(
      { error: 'FAQ konnte nicht geladen werden' },
      { status: 500 }
    );
  }
};
