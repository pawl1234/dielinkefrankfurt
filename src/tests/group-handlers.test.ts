import {
  validateGroupData,
  validateStatusReportData,
  createGroupSlug
} from '../lib/group-handlers';

describe('Group Handlers', () => {
  describe('validateGroupData', () => {
    it('should return null for valid group data', () => {
      const validData = {
        name: 'Test Group',
        description: 'This is a test group with a sufficiently long description that meets the minimum requirements.',
        responsiblePersons: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com'
          }
        ]
      };
      
      expect(validateGroupData(validData)).toBeNull();
    });
    
    it('should return error message for missing name', () => {
      const invalidData = {
        description: 'This is a test group with a sufficiently long description that meets the minimum requirements.',
        responsiblePersons: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com'
          }
        ]
      };
      
      expect(validateGroupData(invalidData)).toBe('Group name is required');
    });
    
    it('should return error message for name that is too short', () => {
      const invalidData = {
        name: 'AB',
        description: 'This is a test group with a sufficiently long description that meets the minimum requirements.',
        responsiblePersons: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com'
          }
        ]
      };
      
      expect(validateGroupData(invalidData)).toBe('Group name must be between 3 and 100 characters');
    });
    
    it('should return error message for missing description', () => {
      const invalidData = {
        name: 'Test Group',
        responsiblePersons: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com'
          }
        ]
      };
      
      expect(validateGroupData(invalidData)).toBe('Group description is required');
    });
    
    it('should return error message for description that is too short', () => {
      const invalidData = {
        name: 'Test Group',
        description: 'Too short',
        responsiblePersons: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com'
          }
        ]
      };
      
      expect(validateGroupData(invalidData)).toBe('Group description must be between 50 and 5000 characters');
    });
    
    it('should return error message for missing responsible persons', () => {
      const invalidData = {
        name: 'Test Group',
        description: 'This is a test group with a sufficiently long description that meets the minimum requirements.',
        responsiblePersons: []
      };
      
      expect(validateGroupData(invalidData)).toBe('At least one responsible person is required');
    });
    
    it('should return error message for invalid email', () => {
      const invalidData = {
        name: 'Test Group',
        description: 'This is a test group with a sufficiently long description that meets the minimum requirements.',
        responsiblePersons: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'invalid-email'
          }
        ]
      };
      
      expect(validateGroupData(invalidData)).toBe('Valid email is required for all responsible persons');
    });
  });
  
  describe('validateStatusReportData', () => {
    it('should return null for valid status report data', () => {
      const validData = {
        groupId: '123',
        title: 'Test Report',
        content: 'This is a test report content.',
        reporterFirstName: 'John',
        reporterLastName: 'Doe'
      };
      
      expect(validateStatusReportData(validData)).toBeNull();
    });
    
    it('should return error message for missing groupId', () => {
      const invalidData = {
        title: 'Test Report',
        content: 'This is a test report content.',
        reporterFirstName: 'John',
        reporterLastName: 'Doe'
      };
      
      expect(validateStatusReportData(invalidData)).toBe('Group ID is required');
    });
    
    it('should return error message for missing title', () => {
      const invalidData = {
        groupId: '123',
        content: 'This is a test report content.',
        reporterFirstName: 'John',
        reporterLastName: 'Doe'
      };
      
      expect(validateStatusReportData(invalidData)).toBe('Report title is required');
    });
    
    it('should return error message for title that is too short', () => {
      const invalidData = {
        groupId: '123',
        title: 'AB',
        content: 'This is a test report content.',
        reporterFirstName: 'John',
        reporterLastName: 'Doe'
      };
      
      expect(validateStatusReportData(invalidData)).toBe('Report title must be between 3 and 100 characters');
    });
    
    it('should return error message for missing content', () => {
      const invalidData = {
        groupId: '123',
        title: 'Test Report',
        reporterFirstName: 'John',
        reporterLastName: 'Doe'
      };
      
      expect(validateStatusReportData(invalidData)).toBe('Report content is required');
    });
    
    it('should return error message for content that is too long', () => {
      const longContent = 'A'.repeat(1001);
      const invalidData = {
        groupId: '123',
        title: 'Test Report',
        content: longContent,
        reporterFirstName: 'John',
        reporterLastName: 'Doe'
      };
      
      expect(validateStatusReportData(invalidData)).toBe('Report content must not exceed 1000 characters');
    });
    
    it('should return error message for missing reporter first name', () => {
      const invalidData = {
        groupId: '123',
        title: 'Test Report',
        content: 'This is a test report content.',
        reporterLastName: 'Doe'
      };
      
      expect(validateStatusReportData(invalidData)).toBe('Reporter first name must be between 2 and 50 characters');
    });
    
    it('should return error message for missing reporter last name', () => {
      const invalidData = {
        groupId: '123',
        title: 'Test Report',
        content: 'This is a test report content.',
        reporterFirstName: 'John'
      };
      
      expect(validateStatusReportData(invalidData)).toBe('Reporter last name must be between 2 and 50 characters');
    });
  });
  
  describe('createGroupSlug', () => {
    it('should create a valid slug from a group name', () => {
      const slug = createGroupSlug('Test Group Name');
      
      // Slug should be lowercase with hyphens
      expect(slug).toMatch(/^test-group-name-\d{4}$/);
    });
    
    it('should handle special characters in group name', () => {
      const slug = createGroupSlug('Tést Gröüp & Name!');
      
      // Slug should be sanitized, lowercase with hyphens
      expect(slug).toMatch(/^test-group-name-\d{4}$/);
    });
    
    it('should create unique slugs for the same name', () => {
      const slug1 = createGroupSlug('Same Name');
      const slug2 = createGroupSlug('Same Name');
      
      // The timestamps should make them different
      expect(slug1).not.toBe(slug2);
    });
  });
});