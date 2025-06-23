import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Import after mocking (mocks are in jest.setup.api.js)
import { POST } from '@/app/api/admin/newsletter/validate/route';
import { processRecipientList } from '@/lib/newsletter-sending';

const mockProcessRecipientList = processRecipientList as jest.MockedFunction<typeof processRecipientList>;

describe('/api/admin/newsletter/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST', () => {
    it('should validate recipient list successfully', async () => {
      const emailText = 'user1@example.com\nuser2@example.com\ninvalid-email';
      const mockValidationResult = {
        valid: 2,
        invalid: 1,
        new: 1,
        existing: 1,
        invalidEmails: ['invalid-email']
      };

      mockProcessRecipientList.mockResolvedValue(mockValidationResult);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/validate', {
        method: 'POST',
        body: JSON.stringify({ emailText })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockValidationResult);
      expect(mockProcessRecipientList).toHaveBeenCalledWith(emailText);
    });

    it('should return validation error when emailText is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/validate', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email recipient list is required');
      expect(mockProcessRecipientList).not.toHaveBeenCalled();
    });

    it('should return validation error when emailText is empty string', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/validate', {
        method: 'POST',
        body: JSON.stringify({ emailText: '' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email recipient list is required');
      expect(mockProcessRecipientList).not.toHaveBeenCalled();
    });

    it('should handle processing errors gracefully', async () => {
      const emailText = 'user@example.com';
      const error = new Error('Processing failed');

      mockProcessRecipientList.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/validate', {
        method: 'POST',
        body: JSON.stringify({ emailText })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to validate recipient list');
      expect(mockProcessRecipientList).toHaveBeenCalledWith(emailText);
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/validate', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to validate recipient list');
      expect(mockProcessRecipientList).not.toHaveBeenCalled();
    });
  });
});