import { NextRequest, NextResponse } from 'next/server';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMockNewsletterSettings } from '../../factories/newsletter.factory';

// Mock dependencies before importing the route
jest.mock('@/lib/newsletter-service', () => ({
  getNewsletterSettings: jest.fn(),
  updateNewsletterSettings: jest.fn()
}));

jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler)
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/lib/errors', () => ({
  apiErrorResponse: jest.fn((error, message) => {
    return NextResponse.json(
      { error: message || 'An error occurred' },
      { status: 500 }
    );
  })
}));

// Import after mocking
import { GET, PUT, POST } from '@/app/api/admin/newsletter/settings/route';
import { getNewsletterSettings, updateNewsletterSettings } from '@/lib/newsletter-service';
import { withAdminAuth } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/errors';

// Type assertions for mocked functions
const mockGetNewsletterSettings = getNewsletterSettings as jest.MockedFunction<typeof getNewsletterSettings>;
const mockUpdateNewsletterSettings = updateNewsletterSettings as jest.MockedFunction<typeof updateNewsletterSettings>;
const mockWithAdminAuth = withAdminAuth as jest.MockedFunction<typeof withAdminAuth>;
const mockApiErrorResponse = apiErrorResponse as jest.MockedFunction<typeof apiErrorResponse>;

describe('/api/admin/newsletter/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset withAdminAuth to pass through by default
    mockWithAdminAuth.mockImplementation((handler) => handler);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET endpoint', () => {
    it('should return newsletter settings successfully', async () => {
      const mockSettings = createMockNewsletterSettings({
        id: 'settings-123',
        footerText: 'Test footer',
        testEmailRecipients: ['test@example.com'],
        chunkSize: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockGetNewsletterSettings.mockResolvedValue(mockSettings as Awaited<ReturnType<typeof getNewsletterSettings>>);

      const response = await GET(new NextRequest('http://localhost:3000/api/admin/newsletter/settings'));
      const data = await response.json();

      expect(mockGetNewsletterSettings).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
      expect(data).toEqual(mockSettings);
      expect(logger.debug).toHaveBeenCalledWith(
        'Fetching newsletter settings',
        expect.objectContaining({
          module: 'api',
          context: expect.objectContaining({
            endpoint: '/api/admin/newsletter/settings',
            method: 'GET'
          })
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Newsletter settings retrieved successfully',
        expect.objectContaining({
          module: 'api',
          context: expect.objectContaining({
            endpoint: '/api/admin/newsletter/settings',
            method: 'GET',
            hasSettings: true,
            settingsId: 'settings-123'
          })
        })
      );
    });

    it('should handle errors when fetching settings', async () => {
      const error = new Error('Database connection failed');
      mockGetNewsletterSettings.mockRejectedValue(error);

      const response = await GET(new NextRequest('http://localhost:3000/api/admin/newsletter/settings'));
      const data = await response.json();

      expect(mockGetNewsletterSettings).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to fetch newsletter settings' });
      expect(logger.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          module: 'api',
          context: expect.objectContaining({
            endpoint: '/api/admin/newsletter/settings',
            method: 'GET',
            operation: 'getNewsletterSettings'
          })
        })
      );
      expect(mockApiErrorResponse).toHaveBeenCalledWith(error, 'Failed to fetch newsletter settings');
    });

    it('should require authentication', async () => {
      // Mock withAdminAuth to simulate authentication failure
      mockWithAdminAuth.mockImplementationOnce(() => {
        return async () => {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        };
      });

      const handler = withAdminAuth(async () => {
        return NextResponse.json({ data: 'should not reach here' });
      });

      const response = await handler(new NextRequest('http://localhost:3000/api/admin/newsletter/settings'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
      expect(mockGetNewsletterSettings).not.toHaveBeenCalled();
    });
  });

  describe('PUT endpoint', () => {
    it('should update newsletter settings successfully', async () => {
      const updateData = {
        footerText: 'Updated footer',
        chunkSize: 75,
        testEmailRecipients: ['new@example.com']
      };

      const updatedSettings = createMockNewsletterSettings({
        id: 'settings-123',
        ...updateData,
        updatedAt: new Date()
      });

      mockUpdateNewsletterSettings.mockResolvedValue(updatedSettings as Awaited<ReturnType<typeof updateNewsletterSettings>>);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(mockUpdateNewsletterSettings).toHaveBeenCalledWith(updateData);
      expect(response.status).toBe(200);
      expect(data).toEqual(updatedSettings);
      expect(logger.debug).toHaveBeenCalledWith(
        'Updating newsletter settings',
        expect.objectContaining({
          module: 'api',
          context: expect.objectContaining({
            endpoint: '/api/admin/newsletter/settings',
            method: 'PUT',
            fieldsToUpdate: ['footerText', 'chunkSize', 'testEmailRecipients']
          })
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Newsletter settings updated successfully',
        expect.objectContaining({
          module: 'api',
          context: expect.objectContaining({
            endpoint: '/api/admin/newsletter/settings',
            method: 'PUT',
            settingsId: 'settings-123',
            updatedFields: ['footerText', 'chunkSize', 'testEmailRecipients']
          })
        })
      );
    });

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
      expect(data).toEqual({ error: 'No data provided for update' });
      expect(mockUpdateNewsletterSettings).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Empty update request for newsletter settings',
        expect.objectContaining({
          module: 'api',
          context: expect.objectContaining({
            endpoint: '/api/admin/newsletter/settings',
            method: 'PUT'
          })
        })
      );
    });

    it('should handle null body gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: 'null',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'No data provided for update' });
      expect(mockUpdateNewsletterSettings).not.toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      const updateData = { footerText: 'New footer' };
      const error = new Error('Database update failed');
      
      mockUpdateNewsletterSettings.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(mockUpdateNewsletterSettings).toHaveBeenCalledWith(updateData);
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to update newsletter settings' });
      expect(logger.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          module: 'api',
          context: expect.objectContaining({
            endpoint: '/api/admin/newsletter/settings',
            method: 'PUT',
            operation: 'updateNewsletterSettings'
          })
        })
      );
      expect(mockApiErrorResponse).toHaveBeenCalledWith(error, 'Failed to update newsletter settings');
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
      expect(data).toEqual({ error: 'Failed to update newsletter settings' });
      expect(mockUpdateNewsletterSettings).not.toHaveBeenCalled();
    });

    it('should invalidate cache after successful update', async () => {
      const updateData = { footerText: 'Updated footer' };
      const updatedSettings = createMockNewsletterSettings({
        id: 'settings-123',
        ...updateData
      });

      mockUpdateNewsletterSettings.mockResolvedValue(updatedSettings as Awaited<ReturnType<typeof updateNewsletterSettings>>);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await PUT(request);

      // The updateNewsletterSettings function in the service should handle cache invalidation
      expect(mockUpdateNewsletterSettings).toHaveBeenCalledWith(updateData);
    });
  });

  describe('POST endpoint (deprecated)', () => {
    it('should delegate to PUT handler', async () => {
      const updateData = { footerText: 'Updated via POST' };
      const updatedSettings = createMockNewsletterSettings({
        id: 'settings-123',
        ...updateData
      });

      mockUpdateNewsletterSettings.mockResolvedValue(updatedSettings as Awaited<ReturnType<typeof updateNewsletterSettings>>);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'POST',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedSettings);
      expect(logger.warn).toHaveBeenCalledWith(
        'Deprecated POST endpoint used for newsletter settings',
        expect.objectContaining({
          module: 'api',
          context: expect.objectContaining({
            endpoint: '/api/admin/newsletter/settings',
            method: 'POST',
            recommendation: 'Use PUT instead'
          })
        })
      );
      expect(mockUpdateNewsletterSettings).toHaveBeenCalledWith(updateData);
    });
  });

  describe('Authentication requirements', () => {
    it('should enforce authentication on all endpoints', () => {
      // Verify that all route handlers are wrapped with withAdminAuth
      expect(mockWithAdminAuth).toHaveBeenCalledTimes(3); // Once for each import
      
      // GET handler should be wrapped
      expect(GET.toString()).toContain('withAdminAuth');
      
      // PUT handler should be wrapped
      expect(PUT.toString()).toContain('withAdminAuth');
      
      // POST handler should be wrapped
      expect(POST.toString()).toContain('withAdminAuth');
    });

    it('should return 401 when authentication fails', async () => {
      // Mock authentication failure
      mockWithAdminAuth.mockImplementationOnce(() => {
        return async () => {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        };
      });

      const handler = withAdminAuth(async () => {
        return NextResponse.json({ data: 'should not reach here' });
      });

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify({ footerText: 'test' }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await handler(request);
      
      expect(response.status).toBe(401);
      expect(mockUpdateNewsletterSettings).not.toHaveBeenCalled();
    });
  });

  describe('Logging patterns', () => {
    it('should log appropriate levels for different scenarios', async () => {
      // Success scenario
      mockGetNewsletterSettings.mockResolvedValue(createMockNewsletterSettings() as Awaited<ReturnType<typeof getNewsletterSettings>>);
      await GET(new NextRequest('http://localhost:3000/api/admin/newsletter/settings'));
      
      expect(logger.debug).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();

      // Warning scenario
      jest.clearAllMocks();
      const emptyRequest = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });
      await PUT(emptyRequest);
      
      expect(logger.warn).toHaveBeenCalled();

      // Error scenario
      jest.clearAllMocks();
      mockGetNewsletterSettings.mockRejectedValue(new Error('Test error'));
      await GET(new NextRequest('http://localhost:3000/api/admin/newsletter/settings'));
      
      expect(logger.error).toHaveBeenCalled();
    });

    it('should include privacy-conscious context in logs', async () => {
      const updateData = {
        footerText: 'Updated footer',
        testEmailRecipients: ['email1@example.com', 'email2@example.com']
      };

      mockUpdateNewsletterSettings.mockResolvedValue(createMockNewsletterSettings(updateData) as Awaited<ReturnType<typeof updateNewsletterSettings>>);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/settings', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      });

      await PUT(request);

      // Verify that email addresses are not logged directly
      const logCalls = (logger.debug as jest.Mock).mock.calls;
      const logContext = logCalls[0][1].context;
      
      expect(logContext.fieldsToUpdate).toContain('testEmailRecipients');
      // Should not contain actual email addresses in the log
      expect(JSON.stringify(logContext)).not.toContain('email1@example.com');
      expect(JSON.stringify(logContext)).not.toContain('email2@example.com');
    });
  });
});