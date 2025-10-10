import { z } from 'zod';

/**
 * Validation schema for group contact form
 */
export const groupContactSchema = z.object({
  requesterName: z
    .string()
    .min(2, 'Name muss mindestens 2 Zeichen lang sein')
    .max(100, 'Name darf maximal 100 Zeichen lang sein')
    .trim(),

  requesterEmail: z
    .string()
    .email('Bitte geben Sie eine gültige E-Mail-Adresse ein')
    .max(200, 'E-Mail-Adresse darf maximal 200 Zeichen lang sein')
    .trim(),

  message: z
    .string()
    .min(10, 'Nachricht muss mindestens 10 Zeichen lang sein')
    .max(5000, 'Nachricht darf maximal 5000 Zeichen lang sein')
    .trim(),
});

export type GroupContactFormData = z.infer<typeof groupContactSchema>;
