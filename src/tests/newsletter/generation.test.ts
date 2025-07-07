import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach } from '@jest/globals';

import { POST } from '@/app/api/admin/newsletter/generate/route';

describe('Newsletter Generation API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST endpoint', () => {
    it('should validate required subject field', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate', {
        method: 'POST',
        body: JSON.stringify({
          introductionText: '<p>Introduction without subject</p>'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Subject is required');
    });

    it('should validate subject length', async () => {
      const longSubject = 'a'.repeat(201); // Over 200 characters

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate', {
        method: 'POST',
        body: JSON.stringify({
          subject: longSubject,
          introductionText: '<p>Test introduction</p>'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Subject must be 200 characters or less');
    });

    it('should reject empty subject string', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/generate', {
        method: 'POST',
        body: JSON.stringify({
          subject: '   ', // Whitespace only
          introductionText: '<p>Test introduction</p>'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Subject is required');
    });
  });
});