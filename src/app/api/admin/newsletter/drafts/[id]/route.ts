import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AppError, apiErrorResponse } from '@/lib/errors';
import {
  getNewsletterById,
  updateNewsletterItem,
  deleteNewsletterItem
} from '@/lib/db/newsletter-operations';
import type { IdRouteContext } from '@/types/api-types';

/**
 * GET handler for fetching a single newsletter draft
 * Requires admin authentication
 */
export async function GET(request: NextRequest, { params }: IdRouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return AppError.authentication('Nicht autorisiert').toResponse();
    }

    const { id } = await params;

    const newsletter = await getNewsletterById(id);

    if (!newsletter) {
      return AppError.notFound('Newsletter nicht gefunden').toResponse();
    }

    return NextResponse.json(newsletter);
  } catch (error) {
    return apiErrorResponse(error, 'Fehler beim Laden des Newsletters');
  }
}

/**
 * PUT handler for updating a newsletter draft
 * Requires admin authentication
 */
export async function PUT(request: NextRequest, { params }: IdRouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return AppError.authentication('Nicht autorisiert').toResponse();
    }

    const { id } = await params;
    const body = await request.json();
    const { subject, introductionText, content, status, recipientCount, sentAt, settings } = body;

    // Build update data object with conditional fields
    const updateData: Partial<{
      subject: string;
      introductionText: string;
      content: string;
      status: string;
      recipientCount: number;
      sentAt: Date | null;
      settings: string;
    }> = {
      ...(subject !== undefined && { subject }),
      ...(introductionText !== undefined && { introductionText }),
      ...(content !== undefined && { content }),
      ...(status !== undefined && { status }),
      ...(recipientCount !== undefined && { recipientCount }),
      ...(sentAt !== undefined && { sentAt: sentAt ? new Date(sentAt) : null }),
      ...(settings !== undefined && { settings }),
    };

    const newsletter = await updateNewsletterItem(id, updateData);

    return NextResponse.json(newsletter);
  } catch (error) {
    return apiErrorResponse(error, 'Fehler beim Aktualisieren des Newsletters');
  }
}

/**
 * DELETE handler for deleting a newsletter draft
 * Requires admin authentication
 */
export async function DELETE(request: NextRequest, { params }: IdRouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return AppError.authentication('Nicht autorisiert').toResponse();
    }

    const { id } = await params;

    await deleteNewsletterItem(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'Fehler beim Löschen des Newsletters');
  }
}