import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { requireRole } from '@/lib/auth/roles';
import { createUserSchema } from '@/lib/validation/user-schema';
import { createUser } from '@/lib/db/user-operations';
import { findUserByUsername, findUserByEmail, listUsers } from '@/lib/db/user-queries';
import { logger } from '@/lib/logger';
import type { CreateUserRequest, CreateUserResponse, ListUsersResponse } from '@/types/api-types';

/**
 * POST /api/admin/users - Create new user
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Require admin role
    if (!session || !requireRole(session, ['admin'])) {
      logger.warn('Unauthorized user management attempt', {
        module: 'api-admin-users',
        context: { operation: 'create', userId: session?.user?.id }
      });
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung. Nur Administratoren können Benutzer erstellen.' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body: CreateUserRequest = await request.json();
    const validationResult = createUserSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('User creation validation failed', {
        module: 'api-admin-users',
        context: { errors: validationResult.error.issues }
      });
      return NextResponse.json(
        { success: false, error: `Validierungsfehler: ${validationResult.error.issues[0].message}` },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check for duplicate username or email
    const existingUsername = await findUserByUsername(data.username);
    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: 'Benutzername oder E-Mail bereits vorhanden' },
        { status: 409 }
      );
    }

    const existingEmail = await findUserByEmail(data.email);
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'Benutzername oder E-Mail bereits vorhanden' },
        { status: 409 }
      );
    }

    // Create user
    const user = await createUser({
      username: data.username,
      email: data.email,
      password: data.password,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      isActive: data.isActive ?? true,
    });

    logger.info('User created successfully', {
      module: 'api-admin-users',
      context: { userId: user.id, username: user.username, role: user.role, createdBy: session.user.id }
    });

    const response: CreateUserResponse = {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role as 'admin' | 'mitglied',
        isActive: user.isActive,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logger.error('User creation failed', {
      module: 'api-admin-users',
      context: { error },
      tags: ['critical']
    });
    return NextResponse.json(
      { success: false, error: 'Serverfehler beim Erstellen des Benutzers' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/users - List all users
 */
export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Require admin role
    if (!session || !requireRole(session, ['admin'])) {
      logger.warn('Unauthorized user list access attempt', {
        module: 'api-admin-users',
        context: { operation: 'list', userId: session?.user?.id }
      });
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung. Nur Administratoren können Benutzer auflisten.' },
        { status: 403 }
      );
    }

    // Get all users
    const users = await listUsers();

    logger.info('User list retrieved', {
      module: 'api-admin-users',
      context: { count: users.length, requestedBy: session.user.id }
    });

    const response: ListUsersResponse = {
      success: true,
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as 'admin' | 'mitglied',
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to retrieve user list', {
      module: 'api-admin-users',
      context: { error },
      tags: ['critical']
    });
    return NextResponse.json(
      { success: false, error: 'Serverfehler beim Abrufen der Benutzerliste' },
      { status: 500 }
    );
  }
}
