import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { POST } from '@/app/api/groups/submit/route';
import { 
  assertValidationError,
  cleanupTestDatabase
} from '../helpers/api-test-helpers';
import { clearAllMocks } from '../helpers/workflow-helpers';
import { createMockImageFile } from '../factories';

// Helper to create valid form data
function createValidFormData() {
  const formData = new FormData();
  formData.append('name', 'Test Group');
  formData.append('description', '<p>This is a comprehensive test description that contains more than fifty characters to meet the validation requirements for group descriptions.</p>');
  formData.append('responsiblePersons', JSON.stringify([
    { firstName: 'Test', lastName: 'User', email: 'test@example.com' }
  ]));
  return formData;
}

// Helper to create FormData request
function createFormDataRequest(url: string, formData: FormData) {
  return new Request(url, {
    method: 'POST',
    headers: new Headers(),
    body: formData
  });
}

describe('Group Submission Workflow', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe('Required Field Validation', () => {
    it('should require group name', async () => {
      const formData = createValidFormData();
      formData.set('name', '');

      const request = createFormDataRequest('http://localhost:3000/api/groups/submit', formData);
      const response = await POST(request);
      
      await assertValidationError(response);
    });

    it('should require group description with minimum length', async () => {
      const formData = createValidFormData();
      formData.set('description', '<p>Short</p>'); // Less than 50 characters

      const request = createFormDataRequest('http://localhost:3000/api/groups/submit', formData);
      const response = await POST(request);
      
      await assertValidationError(response);
    });

    it('should require at least one responsible person', async () => {
      const formData = createValidFormData();
      formData.set('responsiblePersons', JSON.stringify([]));

      const request = createFormDataRequest('http://localhost:3000/api/groups/submit', formData);
      const response = await POST(request);
      
      await assertValidationError(response);
    });

    it('should validate responsible person email format', async () => {
      const formData = createValidFormData();
      formData.set('responsiblePersons', JSON.stringify([
        { firstName: 'Test', lastName: 'User', email: 'not-an-email' }
      ]));

      const request = createFormDataRequest('http://localhost:3000/api/groups/submit', formData);
      const response = await POST(request);
      
      await assertValidationError(response);
    });
  });

  describe('File Upload Validation', () => {
    it('should validate logo file type', async () => {
      const invalidFile = new File(['test'], 'logo.exe', { type: 'application/x-msdownload' });
      const formData = createValidFormData();
      formData.append('logoFile', invalidFile);

      const request = createFormDataRequest('http://localhost:3000/api/groups/submit', formData);
      const response = await POST(request);
      
      await assertValidationError(response);
    });

    it('should validate logo file size', async () => {
      const oversizedFile = createMockImageFile('huge-logo.jpg', 6 * 1024 * 1024); // 6MB
      const formData = createValidFormData();
      formData.append('logoFile', oversizedFile);

      const request = createFormDataRequest('http://localhost:3000/api/groups/submit', formData);
      const response = await POST(request);
      
      await assertValidationError(response);
    });
  });

  describe('Data Format Validation', () => {
    it('should handle malformed JSON in responsible persons', async () => {
      const formData = createValidFormData();
      formData.set('responsiblePersons', 'invalid-json');

      const request = createFormDataRequest('http://localhost:3000/api/groups/submit', formData);
      const response = await POST(request);
      
      await assertValidationError(response);
    });
  });

});