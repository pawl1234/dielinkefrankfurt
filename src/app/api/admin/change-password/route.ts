// src/app/api/admin/change-password/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { changePasswordSchema } from '@/lib/validation/user-schema';
import { updateUser } from '@/lib/db/user-operations';
import { findUserByUsername } from '@/lib/db/user-queries';
import { comparePassword } from '@/lib/auth';
import { logger } from '@/lib/logger';
import type { ChangePasswordRequest, ChangePasswordResponse } from '@/types/api-types';

/**
 * POST /api/admin/change-password - Change authenticated user's password
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Require authentication
    if (!session?.user) {
      logger.warn('Unauthorized password change attempt - no session', {
        module: 'api-admin-change-password',
        context: { operation: 'change-password' }
      });
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung. Authentifizierung erforderlich.' },
        { status: 401 }
      );
    }

    // Environment users can't change password
    if (session.user.isEnvironmentUser) {
      logger.warn('Environment user attempted password change', {
        module: 'api-admin-change-password',
        context: { username: session.user.username }
      });
      return NextResponse.json(
        { success: false, error: 'Das Passwort des System-Administrators kann nicht geändert werden.' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body: ChangePasswordRequest = await request.json();
    const validationResult = changePasswordSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('Password change validation failed', {
        module: 'api-admin-change-password',
        context: {
          userId: session.user.id,
          errors: validationResult.error.issues
        }
      });
      return NextResponse.json(
        { success: false, error: `Validierungsfehler: ${validationResult.error.issues[0].message}` },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validationResult.data;

    // Find user
    const user = await findUserByUsername(session.user.username);

    if (!user) {
      logger.error('User not found during password change', {
        module: 'api-admin-change-password',
        context: { username: session.user.username, userId: session.user.id },
        tags: ['critical']
      });
      return NextResponse.json(
        { success: false, error: 'Benutzer nicht gefunden.' },
        { status: 404 }
      );
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      logger.warn('Password change failed - incorrect current password', {
        module: 'api-admin-change-password',
        context: { userId: user.id, username: user.username }
      });
      return NextResponse.json(
        { success: false, error: 'Aktuelles Passwort ist nicht korrekt.' },
        { status: 400 }
      );
    }

    // Update password using user-operations
    await updateUser(user.id, { password: newPassword });

    logger.info('Password changed successfully', {
      module: 'api-admin-change-password',
      context: { userId: user.id, username: user.username }
    });

    const response: ChangePasswordResponse = {
      success: true,
      message: 'Passwort erfolgreich geändert'
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Password change failed', {
      module: 'api-admin-change-password',
      context: { error },
      tags: ['critical']
    });
    return NextResponse.json(
      { success: false, error: 'Serverfehler beim Ändern des Passworts' },
      { status: 500 }
    );
  }
}
