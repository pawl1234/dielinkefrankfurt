import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { requireRole } from '@/lib/auth/roles';
import { updateUserSchema } from '@/lib/validation/user-schema';
import { updateUser, deleteUser } from '@/lib/db/user-operations';
import { findUserById, findUserByUsername, findUserByEmail } from '@/lib/db/user-queries';
import { logger } from '@/lib/logger';
import type { UpdateUserRequest, UpdateUserResponse, DeleteUserResponse } from '@/types/api-types';

/**
 * PATCH /api/admin/users/[id] - Update user
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Require admin role
    if (!session || !requireRole(session, ['admin'])) {
      logger.warn('Unauthorized user update attempt', {
        module: 'api-admin-users',
        context: { operation: 'update', userId: session?.user?.id, targetUserId: params.id }
      });
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung. Nur Administratoren können Benutzer bearbeiten.' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body: UpdateUserRequest = await request.json();
    const validationResult = updateUserSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('User update validation failed', {
        module: 'api-admin-users',
        context: { errors: validationResult.error.issues, targetUserId: params.id }
      });
      return NextResponse.json(
        { success: false, error: `Validierungsfehler: ${validationResult.error.issues[0].message}` },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if user exists
    const existingUser = await findUserById(params.id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }

    // Check for duplicate username (if changing username)
    if (data.username && data.username !== existingUser.username) {
      const duplicateUsername = await findUserByUsername(data.username);
      if (duplicateUsername) {
        return NextResponse.json(
          { success: false, error: 'Benutzername oder E-Mail bereits vorhanden' },
          { status: 409 }
        );
      }
    }

    // Check for duplicate email (if changing email)
    if (data.email && data.email !== existingUser.email) {
      const duplicateEmail = await findUserByEmail(data.email);
      if (duplicateEmail) {
        return NextResponse.json(
          { success: false, error: 'Benutzername oder E-Mail bereits vorhanden' },
          { status: 409 }
        );
      }
    }

    // Prevent self-deactivation
    if (data.isActive === false && params.id === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Sie können Ihr eigenes Konto nicht deaktivieren' },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await updateUser(params.id, data);

    logger.info('User updated successfully', {
      module: 'api-admin-users',
      context: {
        userId: updatedUser.id,
        username: updatedUser.username,
        changes: Object.keys(data),
        updatedBy: session.user.id
      }
    });

    const response: UpdateUserResponse = {
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role as 'admin' | 'mitglied',
        isActive: updatedUser.isActive,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('User update failed', {
      module: 'api-admin-users',
      context: { error, targetUserId: params.id },
      tags: ['critical']
    });
    return NextResponse.json(
      { success: false, error: 'Serverfehler beim Aktualisieren des Benutzers' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id] - Delete user
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Require admin role
    if (!session || !requireRole(session, ['admin'])) {
      logger.warn('Unauthorized user deletion attempt', {
        module: 'api-admin-users',
        context: { operation: 'delete', userId: session?.user?.id, targetUserId: params.id }
      });
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung. Nur Administratoren können Benutzer löschen.' },
        { status: 403 }
      );
    }

    // Prevent self-deletion
    if (params.id === session.user.id) {
      logger.warn('Self-deletion attempt prevented', {
        module: 'api-admin-users',
        context: { userId: session.user.id }
      });
      return NextResponse.json(
        { success: false, error: 'Sie können Ihr eigenes Konto nicht löschen' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await findUserById(params.id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }

    // Delete user
    await deleteUser(params.id);

    logger.info('User deleted successfully', {
      module: 'api-admin-users',
      context: {
        deletedUserId: params.id,
        deletedUsername: existingUser.username,
        deletedBy: session.user.id
      }
    });

    const response: DeleteUserResponse = {
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('User deletion failed', {
      module: 'api-admin-users',
      context: { error, targetUserId: params.id },
      tags: ['critical']
    });
    return NextResponse.json(
      { success: false, error: 'Serverfehler beim Löschen des Benutzers' },
      { status: 500 }
    );
  }
}
