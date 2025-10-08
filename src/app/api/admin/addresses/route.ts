import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { logger } from '@/lib/logger';
import {
  addressSchema,
  addressUpdateSchema,
} from '@/lib/validation/address-schema';
import {
  findAllAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  checkDuplicateName,
  findAddressById,
} from '@/lib/db/address-operations';
import { ZodError } from 'zod';

/**
 * GET /api/admin/addresses
 *
 * Retrieve paginated list of addresses with optional search and sorting.
 *
 * @param request - Next.js request object with query parameters
 * @returns Paginated addresses response or error
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const search = searchParams.get('search') || undefined;
    const orderBy = (searchParams.get('orderBy') || 'name') as
      | 'name'
      | 'createdAt';
    const orderDirection = (searchParams.get('orderDirection') || 'asc') as
      | 'asc'
      | 'desc';

    // Fetch addresses
    const result = await findAllAddresses({
      page,
      pageSize,
      search,
      orderBy,
      orderDirection,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.error('Error in GET /api/admin/addresses', {
      module: 'api',
      context: { error },
    });
    return NextResponse.json(
      { error: 'Fehler beim Laden der Adressen' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/addresses
 *
 * Create a new address with validation and duplicate name checking.
 *
 * @param request - Next.js request object with address data in body
 * @returns Created address or validation error
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = addressSchema.parse(body);

    // Check for duplicate name
    const isDuplicate = await checkDuplicateName(validatedData.name);
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Adresse mit diesem Namen existiert bereits' },
        { status: 409 }
      );
    }

    // Create address
    const address = await createAddress(validatedData);

    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return NextResponse.json(
        { error: 'Validierungsfehler', details },
        { status: 400 }
      );
    }

    logger.error('Error in POST /api/admin/addresses', {
      module: 'api',
      context: { error },
    });
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Adresse' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/addresses
 *
 * Update an existing address with validation and duplicate name checking.
 *
 * @param request - Next.js request object with address update data in body
 * @returns Updated address or error
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = addressUpdateSchema.parse(body);

    // Check if address exists
    const existingAddress = await findAddressById(validatedData.id);
    if (!existingAddress) {
      return NextResponse.json(
        { error: 'Adresse nicht gefunden' },
        { status: 404 }
      );
    }

    // Check for duplicate name (excluding current address)
    const isDuplicate = await checkDuplicateName(
      validatedData.name,
      validatedData.id
    );
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Adresse mit diesem Namen existiert bereits' },
        { status: 409 }
      );
    }

    // Update address
    const address = await updateAddress(validatedData.id, {
      name: validatedData.name,
      street: validatedData.street,
      city: validatedData.city,
      postalCode: validatedData.postalCode,
      locationDetails: validatedData.locationDetails,
    });

    return NextResponse.json(address, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return NextResponse.json(
        { error: 'Validierungsfehler', details },
        { status: 400 }
      );
    }

    logger.error('Error in PATCH /api/admin/addresses', {
      module: 'api',
      context: { error },
    });
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Adresse' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/addresses
 *
 * Delete an address by ID.
 *
 * @param request - Next.js request object with id query parameter
 * @returns Success message or error
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // Extract id from query parameters
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Adress-ID erforderlich' },
        { status: 400 }
      );
    }

    // Check if address exists
    const existingAddress = await findAddressById(id);
    if (!existingAddress) {
      return NextResponse.json(
        { error: 'Adresse nicht gefunden' },
        { status: 404 }
      );
    }

    // Delete address
    await deleteAddress(id);

    return NextResponse.json(
      { message: 'Adresse erfolgreich gelöscht' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error in DELETE /api/admin/addresses', {
      module: 'api',
      context: { error },
    });
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Adresse' },
      { status: 500 }
    );
  }
}
