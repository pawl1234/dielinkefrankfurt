import prisma from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import { AddressInput } from '@/lib/validation/address-schema';

/**
 * Options for finding addresses with pagination and filtering.
 */
export interface FindAddressesOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  orderBy?: 'name' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Result of paginated address query.
 */
export interface PaginatedAddressesResult {
  addresses: Address[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Address type from Prisma.
 */
type Address = {
  id: string;
  name: string;
  street: string;
  city: string;
  postalCode: string;
  locationDetails: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Find all addresses with pagination and optional search.
 *
 * @param options - Pagination and filtering options
 * @returns Paginated list of addresses
 */
export async function findAllAddresses(
  options: FindAddressesOptions = {}
): Promise<PaginatedAddressesResult> {
  const {
    page = 1,
    pageSize = 10,
    search,
    orderBy = 'name',
    orderDirection = 'asc',
  } = options;

  try {
    const skip = (page - 1) * pageSize;

    // Build where clause with search filter
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { street: { contains: search, mode: 'insensitive' as const } },
            { city: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Execute query with pagination
    const [addresses, totalItems] = await Promise.all([
      prisma.address.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [orderBy]: orderDirection },
      }),
      prisma.address.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      addresses,
      totalItems,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    logger.error('Error finding addresses', {
      module: 'address-operations',
      context: { options, error },
    });
    throw new Error('Fehler beim Laden der Adressen');
  }
}

/**
 * Find a single address by ID.
 *
 * @param id - Address ID
 * @returns Address or null if not found
 */
export async function findAddressById(id: string): Promise<Address | null> {
  try {
    const address = await prisma.address.findUnique({
      where: { id },
    });

    return address;
  } catch (error) {
    logger.error('Error finding address by ID', {
      module: 'address-operations',
      context: { id, error },
    });
    throw new Error('Fehler beim Laden der Adresse');
  }
}

/**
 * Create a new address.
 *
 * @param data - Address data
 * @returns Created address
 */
export async function createAddress(data: AddressInput): Promise<Address> {
  try {
    const address = await prisma.address.create({
      data: {
        name: data.name,
        street: data.street,
        city: data.city,
        postalCode: data.postalCode,
        locationDetails: data.locationDetails,
      },
    });

    logger.info('Address created successfully', {
      module: 'address-operations',
      context: { addressId: address.id, name: address.name },
    });

    return address;
  } catch (error) {
    logger.error('Error creating address', {
      module: 'address-operations',
      context: { data, error },
    });
    throw new Error('Fehler beim Erstellen der Adresse');
  }
}

/**
 * Update an existing address.
 *
 * @param id - Address ID
 * @param data - Updated address data
 * @returns Updated address
 */
export async function updateAddress(
  id: string,
  data: AddressInput
): Promise<Address> {
  try {
    const address = await prisma.address.update({
      where: { id },
      data: {
        name: data.name,
        street: data.street,
        city: data.city,
        postalCode: data.postalCode,
        locationDetails: data.locationDetails,
      },
    });

    logger.info('Address updated successfully', {
      module: 'address-operations',
      context: { addressId: address.id, name: address.name },
    });

    return address;
  } catch (error) {
    logger.error('Error updating address', {
      module: 'address-operations',
      context: { id, data, error },
    });
    throw new Error('Fehler beim Aktualisieren der Adresse');
  }
}

/**
 * Delete an address.
 *
 * @param id - Address ID
 * @returns Deleted address
 */
export async function deleteAddress(id: string): Promise<Address> {
  try {
    const address = await prisma.address.delete({
      where: { id },
    });

    logger.info('Address deleted successfully', {
      module: 'address-operations',
      context: { addressId: address.id, name: address.name },
    });

    return address;
  } catch (error) {
    logger.error('Error deleting address', {
      module: 'address-operations',
      context: { id, error },
    });
    throw new Error('Fehler beim Löschen der Adresse');
  }
}

/**
 * Check if an address name already exists.
 *
 * @param name - Address name to check
 * @param excludeId - Optional address ID to exclude from check (for updates)
 * @returns True if duplicate exists, false otherwise
 */
export async function checkDuplicateName(
  name: string,
  excludeId?: string
): Promise<boolean> {
  try {
    const existingAddress = await prisma.address.findUnique({
      where: { name },
    });

    if (!existingAddress) {
      return false;
    }

    // If excludeId is provided and matches, it's the same address being updated
    if (excludeId && existingAddress.id === excludeId) {
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error checking duplicate address name', {
      module: 'address-operations',
      context: { name, excludeId, error },
    });
    throw new Error('Fehler bei der Namensüberprüfung');
  }
}
