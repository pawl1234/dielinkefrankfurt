import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { processRecipientList } from '@/lib/newsletter-sending';

// Import after dependencies for proper mocking
import { POST } from '@/app/api/admin/newsletter/validate/route';

describe('/api/admin/newsletter/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock processRecipientList function (used by the actual route)
    (processRecipientList as jest.Mock).mockResolvedValue({
      valid: 2,
      invalid: 1,
      new: 1,
      existing: 1,
      invalidEmails: ['invalid-email']
    });
  });

  describe('POST', () => {
    it('should validate recipient list successfully', async () => {
      const emailText = 'user1@example.com\nuser2@example.com\ninvalid-email';

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/validate', {
        method: 'POST',
        body: JSON.stringify({ emailText }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        valid: 2,
        invalid: 1,
        new: 1,
        existing: 1,
        invalidEmails: ['invalid-email']
      });
      
      // Verify processRecipientList was called with the email text
      expect(processRecipientList).toHaveBeenCalledWith(emailText);
    });

    it('should return validation error when emailText is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/validate', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email recipient list is required');
    });

    it('should return validation error when emailText is empty string', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/validate', {
        method: 'POST',
        body: JSON.stringify({ emailText: '' }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email recipient list is required');
    });
  });
});