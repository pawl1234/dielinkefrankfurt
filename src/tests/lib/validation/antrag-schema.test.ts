import { describe, it, expect } from '@jest/globals';
import {
  validateAntragWithZod,
  antragFormDataSchema,
  type AntragFormData
} from '@/lib/validation/antrag-schema';

describe('Antrag Schema Validation', () => {
  const validAntragData: AntragFormData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    title: 'Test Antrag Title',
    summary: 'This is a test summary for the antrag that is long enough to pass validation requirements.',
    purposes: {
      zuschuss: {
        enabled: true,
        amount: 500
      }
    },
    fileUrls: [],
    files: []
  };

  describe('Valid data acceptance', () => {
    it('should accept valid antrag data', async () => {
      const result = await validateAntragWithZod(validAntragData);

      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should accept antrag with multiple purposes enabled', async () => {
      const dataWithMultiplePurposes = {
        ...validAntragData,
        purposes: {
          zuschuss: {
            enabled: true,
            amount: 500
          },
          personelleUnterstuetzung: {
            enabled: true,
            details: 'We need help with organization and coordination of events.'
          }
        }
      };

      const result = await validateAntragWithZod(dataWithMultiplePurposes);

      expect(result.isValid).toBe(true);
      expect(result.data?.purposes.zuschuss?.amount).toBe(500);
      expect(result.data?.purposes.personelleUnterstuetzung?.details).toContain('organization');
    });
  });

  describe('Field validation', () => {
    it('should reject missing required fields', async () => {
      const incompleteData = {
        firstName: 'John',
        // Missing other required fields
      };

      const result = await validateAntragWithZod(incompleteData);

      expect(result.isValid).toBe(false);
      expect(result.errors?.lastName).toBe('Nachname ist erforderlich');
      expect(result.errors?.email).toBe('E-Mail-Adresse ist erforderlich');
      expect(result.errors?.title).toBe('Titel ist erforderlich');
      expect(result.errors?.summary).toBe('summary ist erforderlich'); // Uses field name as fallback
    });

    it('should reject invalid email format', async () => {
      const invalidEmailData = {
        ...validAntragData,
        email: 'not-a-valid-email'
      };

      const result = await validateAntragWithZod(invalidEmailData);

      expect(result.isValid).toBe(false);
      expect(result.errors?.email).toBe('E-Mail-Adresse muss eine gültige E-Mail-Adresse sein');
    });

    it('should reject names with invalid characters', async () => {
      const invalidNameData = {
        ...validAntragData,
        firstName: 'John123',
        lastName: 'Doe@#$'
      };

      const result = await validateAntragWithZod(invalidNameData);

      expect(result.isValid).toBe(false);
      expect(result.errors?.firstName).toBe('Nur deutsche Zeichen, Leerzeichen, Bindestriche und Apostrophe sind erlaubt');
      expect(result.errors?.lastName).toBe('Nur deutsche Zeichen, Leerzeichen, Bindestriche und Apostrophe sind erlaubt');
    });

    it('should reject summary that is too short', async () => {
      const shortSummaryData = {
        ...validAntragData,
        summary: 'Too short'
      };

      const result = await validateAntragWithZod(shortSummaryData);

      expect(result.isValid).toBe(false);
      expect(result.errors?.summary).toBe('summary muss mindestens 10 Zeichen lang sein'); // Uses field name as fallback
    });
  });

  describe('Purposes validation', () => {
    it('should reject antrag with no enabled purposes', async () => {
      const noPurposesData = {
        ...validAntragData,
        purposes: {
          zuschuss: {
            enabled: false,
            amount: 0
          }
        }
      };

      const result = await validateAntragWithZod(noPurposesData);

      expect(result.isValid).toBe(false);
      expect(result.errors?.['purposes.general']).toBe('Mindestens ein Verwendungszweck muss ausgewählt werden');
    });

    it('should reject zuschuss without amount when enabled', async () => {
      const zuschussNoAmountData = {
        ...validAntragData,
        purposes: {
          zuschuss: {
            enabled: true,
            amount: 0 // Invalid amount
          }
        }
      };

      const result = await validateAntragWithZod(zuschussNoAmountData);

      expect(result.isValid).toBe(false);
      expect(result.errors?.['purposes.zuschuss.amount']).toBe('Betrag für finanziellen Zuschuss ist erforderlich'); // Custom refine message
    });

    it('should reject zuschuss with amount too high', async () => {
      const zuschussHighAmountData = {
        ...validAntragData,
        purposes: {
          zuschuss: {
            enabled: true,
            amount: 1000000 // Too high
          }
        }
      };

      const result = await validateAntragWithZod(zuschussHighAmountData);

      expect(result.isValid).toBe(false);
      expect(result.errors?.['purposes.zuschuss.amount']).toContain('maximal'); // Number validation message pattern
    });

    it('should reject personelle unterstuetzung without details when enabled', async () => {
      const personelleNoDetailsData = {
        ...validAntragData,
        purposes: {
          personelleUnterstuetzung: {
            enabled: true,
            details: '' // Missing details
          }
        }
      };

      const result = await validateAntragWithZod(personelleNoDetailsData);

      expect(result.isValid).toBe(false);
      expect(result.errors?.['purposes.personelleUnterstuetzung.details']).toBe('Details zur personellen Unterstützung sind erforderlich');
    });

    it('should reject raumbuchung without required fields when enabled', async () => {
      const raumbuchungIncompleteData = {
        ...validAntragData,
        purposes: {
          raumbuchung: {
            enabled: true,
            location: '', // Missing location
            numberOfPeople: 0, // Invalid number
            details: '' // Missing details
          }
        }
      };

      const result = await validateAntragWithZod(raumbuchungIncompleteData);

      expect(result.isValid).toBe(false);
      expect(result.errors?.['purposes.raumbuchung.details']).toBe('Details zur Raumbuchung sind erforderlich');
    });

    it('should reject weiteres without details when enabled', async () => {
      const weiteresNoDetailsData = {
        ...validAntragData,
        purposes: {
          weiteres: {
            enabled: true,
            details: '' // Missing details
          }
        }
      };

      const result = await validateAntragWithZod(weiteresNoDetailsData);

      expect(result.isValid).toBe(false);
      expect(result.errors?.['purposes.weiteres.details']).toBe('Details zu weiteren Anliegen sind erforderlich');
    });
  });

  describe('Edge cases', () => {
    it('should handle null/undefined input gracefully', async () => {
      const nullResult = await validateAntragWithZod(null);
      expect(nullResult.isValid).toBe(false);

      const undefinedResult = await validateAntragWithZod(undefined);
      expect(undefinedResult.isValid).toBe(false);
    });

    it('should handle empty object input', async () => {
      const result = await validateAntragWithZod({});

      expect(result.isValid).toBe(false);
      expect(result.errors?.firstName).toBe('Vorname ist erforderlich');
      expect(result.errors?.lastName).toBe('Nachname ist erforderlich');
    });

    it('should handle purposes with all disabled but existing objects', async () => {
      const allDisabledData = {
        ...validAntragData,
        purposes: {
          zuschuss: {
            enabled: false,
            amount: 100
          },
          personelleUnterstuetzung: {
            enabled: false,
            details: 'Some details'
          }
        }
      };

      const result = await validateAntragWithZod(allDisabledData);

      expect(result.isValid).toBe(false);
      expect(result.errors?.['purposes.general']).toBe('Mindestens ein Verwendungszweck muss ausgewählt werden');
    });
  });
});