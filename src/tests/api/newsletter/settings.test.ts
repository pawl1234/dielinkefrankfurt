import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach } from '@jest/globals';

import { GET, PUT } from '@/app/api/admin/newsletter/settings/route';

describe('/api/admin/newsletter/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT endpoint', () => {
    it('should validate empty update requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No data provided for update');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });
  });
});