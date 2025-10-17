import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { requireRole } from '@/lib/auth/roles';
import { resetPasswordSchema } from '@/lib/validation/user-schema';
import { updateUser } from '@/lib/db/user-operations';
import { findUserById } from '@/lib/db/user-queries';
import { logger } from '@/lib/logger';

/**
 * PATCH /api/admin/users/[id]/reset-password - Reset user password
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Require admin role
    if (!session || !requireRole(session, ['admin'])) {
      logger.warn('Unauthorized password reset attempt', {
        module: 'api-admin-users',
        context: { operation: 'reset-password', userId: session?.user?.id, targetUserId: params.id }
      });
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('Password reset validation failed', {
        module: 'api-admin-users',
        context: { errors: validationResult.error.issues, targetUserId: params.id }
      });
      return NextResponse.json(
        { success: false, error: 'Neues Passwort erforderlich (mindestens 8 Zeichen)' },
        { status: 400 }
      );
    }

    const { newPassword } = validationResult.data;

    // Check if user exists
    const existingUser = await findUserById(params.id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }

    // Update password
    await updateUser(params.id, { password: newPassword });

    logger.info('Password reset successfully', {
      module: 'api-admin-users',
      context: {
        userId: params.id,
        username: existingUser.username,
        resetBy: session.user.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Passwort erfolgreich zurückgesetzt',
    });
  } catch (error) {
    logger.error('Password reset failed', {
      module: 'api-admin-users',
      context: { error, targetUserId: params.id },
      tags: ['critical']
    });
    return NextResponse.json(
      { success: false, error: 'Serverfehler beim Zurücksetzen des Passworts' },
      { status: 500 }
    );
  }
}
