import { NextRequest, NextResponse } from 'next/server';
import { getGroupSettings, updateGroupSettings } from '@/lib/db/group-settings-operations';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

/**
 * GET /api/admin/group-settings
 * Fetches the current group settings
 */
export async function GET(_request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const settings = await getGroupSettings();

    return NextResponse.json({
      success: true,
      settings: {
        id: settings.id,
        officeContactEmail: settings.officeContactEmail
      }
    });
  } catch (error) {
    logger.error('Error fetching group settings', {
      module: 'api/admin/group-settings',
      context: { error }
    });

    return NextResponse.json(
      { success: false, error: 'Fehler beim Laden der Einstellungen' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/group-settings
 * Updates the group settings
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { officeContactEmail } = body;

    // Validate email format if provided
    if (officeContactEmail && officeContactEmail.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(officeContactEmail)) {
        return NextResponse.json(
          { success: false, error: 'Ungültige E-Mail-Adresse' },
          { status: 400 }
        );
      }
    }

    const settings = await updateGroupSettings({
      officeContactEmail: officeContactEmail?.trim() || null
    });

    logger.info('Group settings updated', {
      module: 'api/admin/group-settings',
      context: { hasOfficeEmail: !!settings.officeContactEmail }
    });

    return NextResponse.json({
      success: true,
      settings: {
        id: settings.id,
        officeContactEmail: settings.officeContactEmail
      }
    });
  } catch (error) {
    logger.error('Error updating group settings', {
      module: 'api/admin/group-settings',
      context: { error }
    });

    return NextResponse.json(
      { success: false, error: 'Fehler beim Speichern der Einstellungen' },
      { status: 500 }
    );
  }
}
