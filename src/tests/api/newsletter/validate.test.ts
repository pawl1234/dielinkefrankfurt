import { NextRequest } from 'next/server';
import { describe, it, expect } from '@jest/globals';

import { POST } from '@/app/api/admin/newsletter/validate/route';

describe('/api/admin/newsletter/validate', () => {
  describe('POST', () => {
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