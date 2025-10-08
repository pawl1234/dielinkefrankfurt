import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db/prisma';

/**
 * Public address type without timestamp fields.
 */
interface PublicAddress {
  id: string;
  name: string;
  street: string;
  city: string;
  postalCode: string;
  locationDetails: string | null;
}

/**
 * GET /api/addresses/public
 *
 * Retrieve all addresses for public appointment form dropdown.
 * No authentication required.
 *
 * @returns List of addresses ordered by name
 */
export async function GET() {
  try {
    // Fetch all addresses ordered by name
    const addresses = await prisma.address.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        street: true,
        city: true,
        postalCode: true,
        locationDetails: true,
      },
    });

    // Return addresses without timestamp fields
    const publicAddresses: PublicAddress[] = addresses.map((addr) => ({
      id: addr.id,
      name: addr.name,
      street: addr.street,
      city: addr.city,
      postalCode: addr.postalCode,
      locationDetails: addr.locationDetails,
    }));

    return NextResponse.json({ addresses: publicAddresses }, { status: 200 });
  } catch (error) {
    logger.error('Error in GET /api/addresses/public', {
      module: 'api',
      context: { error },
    });
    return NextResponse.json(
      { error: 'Fehler beim Laden der Adressen' },
      { status: 500 }
    );
  }
}
