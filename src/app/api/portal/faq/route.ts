/**
 * Portal FAQ API endpoints
 *
 * GET  /api/portal/faq - List active FAQs (members only)
 *
 * Authentication handled by middleware.
 * Additional authorization checks in database operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findActiveFaqEntries } from '@/lib/db/faq-operations';
import { logger } from '@/lib/logger';
import type { ApiHandler } from '@/types/api-types';

/**
 * GET /api/portal/faq
 *
 * List all active FAQ entries for member viewing.
 * No pagination (expected small dataset).
 */
export const GET: ApiHandler = async (_request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'mitglied'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    const faqs = await findActiveFaqEntries({
      role: session.user.role,
      user: { id: session.user.id }
    });

    return NextResponse.json({ faqs });
  } catch (error) {
    logger.error(error instanceof Error ? error : 'Failed to fetch active FAQs', {
      module: 'api/portal/faq',
      tags: ['faq', 'list', 'error']
    });
    return NextResponse.json(
      { error: 'FAQ konnten nicht geladen werden' },
      { status: 500 }
    );
  }
};
