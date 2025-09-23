import { describe, it, expect } from '@jest/globals';
import { zodToValidationResult, createZodValidator, validateWithZod } from '@/lib/validation/zod-helpers';
import { ValidationError } from '@/lib/errors';
import { z } from 'zod';

describe('Zod Integration Helpers', () => {
  describe('zodToValidationResult', () => {
    it('should convert valid Zod parse to ValidationResult', () => {
      const schema = z.object({ name: z.string() });
      const result = zodToValidationResult(schema, { name: 'Test' });

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({ name: 'Test' });
      expect(result.errors).toBeUndefined();
    });

    it('should convert Zod errors to German field errors', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email()
      });
      const result = zodToValidationResult(schema, { name: '', email: 'invalid' });

      expect(result.isValid).toBe(false);
      expect(result.errors?.name).toBe('Gruppenname ist erforderlich');
      expect(result.errors?.email).toContain('E-Mail-Adresse');
    });

    it('should handle complex nested object validation', () => {
      // Test nested objects like Antrag purposes
      const schema = z.object({
        purposes: z.object({
          zuschuss: z.object({
            enabled: z.boolean(),
            amount: z.number().min(1)
          })
        })
      });

      const result = zodToValidationResult(schema, {
        purposes: { zuschuss: { enabled: true, amount: 0 } }
      });

      expect(result.isValid).toBe(false);
      // Our error mapping should convert minimum validation to German
      expect(result.errors?.['purposes.zuschuss.amount']).toBeDefined();
      expect(result.errors?.['purposes.zuschuss.amount']).toContain('erforderlich');
    });
  });

  describe('createZodValidator', () => {
    it('should create a validator function that returns ValidationResult', () => {
      const schema = z.object({ name: z.string().min(1) });
      const validator = createZodValidator(schema);

      const validResult = validator({ name: 'Test' });
      expect(validResult.isValid).toBe(true);
      expect(validResult.data).toEqual({ name: 'Test' });

      const invalidResult = validator({ name: '' });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toBeDefined();
    });
  });

  describe('validateWithZod', () => {
    it('should return validated data for valid input', () => {
      const schema = z.object({ name: z.string() });
      const result = validateWithZod(schema, { name: 'Test' });

      expect(result).toEqual({ name: 'Test' });
    });

    it('should throw ValidationError for invalid input', () => {
      const schema = z.object({ name: z.string().min(1) });

      expect(() => {
        validateWithZod(schema, { name: '' });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError with German field errors', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email()
      });

      try {
        validateWithZod(schema, { name: '', email: 'invalid' });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.fieldErrors.name).toBe('Gruppenname ist erforderlich');
        expect(validationError.fieldErrors.email).toContain('E-Mail-Adresse');
      }
    });
  });

  describe('German error message mapping', () => {
    it('should provide German error messages for common validation types', () => {
      const schema = z.object({
        name: z.string().min(3),
        email: z.string().email(),
        age: z.number().min(18),
        enabled: z.boolean()
      });

      const result = zodToValidationResult(schema, {
        name: 'ab',
        email: 'not-email',
        age: 16,
        enabled: 'not-boolean'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors?.name).toBe('Gruppenname muss mindestens 3 Zeichen lang sein');
      expect(result.errors?.email).toBe('E-Mail-Adresse muss eine gültige E-Mail-Adresse sein');
      expect(result.errors?.age).toContain('mindestens');
      expect(result.errors?.enabled).toContain('erforderlich');
    });

    it('should handle nested field paths correctly', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1)
          })
        })
      });

      const result = zodToValidationResult(schema, {
        user: { profile: { name: '' } }
      });

      expect(result.isValid).toBe(false);
      // Nested fields use the full path as field name in our implementation
      expect(result.errors?.['user.profile.name']).toBeDefined();
      expect(result.errors?.['user.profile.name']).toContain('erforderlich');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty objects', () => {
      const schema = z.object({});
      const result = zodToValidationResult(schema, {});

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should handle null and undefined input', () => {
      const schema = z.object({ name: z.string() });

      const nullResult = zodToValidationResult(schema, null);
      expect(nullResult.isValid).toBe(false);

      const undefinedResult = zodToValidationResult(schema, undefined);
      expect(undefinedResult.isValid).toBe(false);
    });

    it('should handle arrays correctly', () => {
      const schema = z.array(z.string().min(1));

      const validResult = zodToValidationResult(schema, ['test', 'array']);
      expect(validResult.isValid).toBe(true);
      expect(validResult.data).toEqual(['test', 'array']);

      const invalidResult = zodToValidationResult(schema, ['']);
      expect(invalidResult.isValid).toBe(false);
    });
  });
});