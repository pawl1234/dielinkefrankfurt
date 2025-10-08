import { z } from 'zod';

/**
 * Zod validation schema for Address entity.
 *
 * @description Validates address creation and update operations with German error messages.
 */
export const addressSchema = z.object({
  name: z
    .string()
    .min(1, 'Name ist erforderlich')
    .max(100, 'Name darf maximal 100 Zeichen sein'),
  street: z.string().min(1, 'Straße ist erforderlich'),
  city: z.string().min(1, 'Stadt ist erforderlich'),
  postalCode: z
    .string()
    .regex(/^\d{5}$/, 'Postleitzahl muss genau 5 Ziffern sein'),
  locationDetails: z.string().optional(),
});

/**
 * TypeScript type inferred from addressSchema.
 */
export type AddressInput = z.infer<typeof addressSchema>;

/**
 * Zod validation schema for updating an address (includes id field).
 */
export const addressUpdateSchema = addressSchema.extend({
  id: z.string().min(1, 'Adress-ID ist erforderlich'),
});

/**
 * TypeScript type for address update operations.
 */
export type AddressUpdateInput = z.infer<typeof addressUpdateSchema>;
