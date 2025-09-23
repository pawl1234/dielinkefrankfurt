import { describe, it, expect } from '@jest/globals';
import { validateGroupData } from '@/lib/validation/group-validator';

describe('Group Validator', () => {
  it('should accept valid group data', async () => {
    const validData = {
      name: 'Test Group Name',
      description: 'A'.repeat(60), // Valid description (50+ chars)
      responsiblePersons: [{
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      }]
    };

    const result = await validateGroupData(validData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should reject group data with missing required fields', async () => {
    const invalidData = {
      // Missing name
      description: 'A'.repeat(60),
      responsiblePersons: []
    };

    const result = await validateGroupData(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.name).toBe('Gruppenname ist erforderlich');
  });

  it('should reject group data with short description', async () => {
    const invalidData = {
      name: 'Test Group',
      description: 'Too short', // Less than 50 chars
      responsiblePersons: [{
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      }]
    };

    const result = await validateGroupData(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.description).toBe('Beschreibung muss zwischen 50 und 5000 Zeichen lang sein');
  });

  it('should reject group data with invalid email', async () => {
    const invalidData = {
      name: 'Test Group',
      description: 'A'.repeat(60),
      responsiblePersons: [{
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email'
      }]
    };

    const result = await validateGroupData(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.responsiblePersons).toContain('E-Mail-Adresse');
  });

  it('should handle invalid input data gracefully', async () => {
    const result = await validateGroupData(null);
    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.general).toBe('Ungültige Daten erhalten');
  });
});