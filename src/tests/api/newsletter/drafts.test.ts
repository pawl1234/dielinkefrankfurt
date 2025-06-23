import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Import after mocking (mocks are in jest.setup.api.js)
import { GET, POST } from '@/app/api/admin/newsletter/drafts/route';
import { listDraftNewsletters, saveDraftNewsletter } from '@/lib/newsletter-service';

const mockListDraftNewsletters = listDraftNewsletters as jest.MockedFunction<typeof listDraftNewsletters>;
const mockSaveDraftNewsletter = saveDraftNewsletter as jest.MockedFunction<typeof saveDraftNewsletter>;

describe('/api/admin/newsletter/drafts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET', () => {
    it('should list draft newsletters with default pagination', async () => {
      const mockDrafts = {
        items: [
          {
            id: 'draft-1',
            subject: 'Draft Newsletter 1',
            introductionText: 'Intro text 1',
            content: null,
            status: 'draft',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            sentAt: null,
            recipientCount: null,
            settings: null
          },
          {
            id: 'draft-2',
            subject: 'Draft Newsletter 2',
            introductionText: 'Intro text 2',
            content: '<html>Content</html>',
            status: 'draft',
            createdAt: new Date('2024-01-02'),
            updatedAt: new Date('2024-01-02'),
            sentAt: null,
            recipientCount: null,
            settings: null
          }
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      mockListDraftNewsletters.mockResolvedValue(mockDrafts);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockDrafts);
      expect(mockListDraftNewsletters).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: ''
      });
    });

    it('should list draft newsletters with custom pagination', async () => {
      const mockDrafts = {
        items: [],
        total: 25,
        page: 3,
        limit: 5,
        totalPages: 5
      };

      mockListDraftNewsletters.mockResolvedValue(mockDrafts);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts?page=3&limit=5');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockDrafts);
      expect(mockListDraftNewsletters).toHaveBeenCalledWith({
        page: 3,
        limit: 5,
        search: ''
      });
    });

    it('should list draft newsletters with search query', async () => {
      const mockDrafts = {
        items: [
          {
            id: 'draft-1',
            subject: 'Special Newsletter',
            introductionText: 'Special intro',
            content: null,
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
            sentAt: null,
            recipientCount: null,
            settings: null
          }
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      mockListDraftNewsletters.mockResolvedValue(mockDrafts);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts?search=special');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockDrafts);
      expect(mockListDraftNewsletters).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'special'
      });
    });

    it('should handle service errors gracefully', async () => {
      mockListDraftNewsletters.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch draft newsletters');
    });

    it('should validate pagination parameters', async () => {
      const mockDrafts = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      };

      mockListDraftNewsletters.mockResolvedValue(mockDrafts);

      // Test with invalid pagination values
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts?page=-1&limit=0');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockListDraftNewsletters).toHaveBeenCalledWith({
        page: 1, // Should be normalized to minimum 1
        limit: 1, // Should be normalized to minimum 1
        search: ''
      });
    });
  });

  describe('POST', () => {
    const mockDraftNewsletter = {
      id: 'new-draft-123',
      subject: 'New Draft Newsletter',
      introductionText: 'This is a new draft',
      content: null,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      sentAt: null,
      recipientCount: null,
      settings: null
    };

    it('should create a new draft newsletter successfully', async () => {
      mockSaveDraftNewsletter.mockResolvedValue(mockDraftNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'New Draft Newsletter',
          introductionText: 'This is a new draft'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockDraftNewsletter);
      expect(mockSaveDraftNewsletter).toHaveBeenCalledWith({
        subject: 'New Draft Newsletter',
        introductionText: 'This is a new draft'
      });
    });

    it('should create draft with content and settings', async () => {
      const requestData = {
        subject: 'Draft with Content',
        introductionText: 'Intro text',
        content: '<html>Generated content</html>',
        settings: { chunkSize: 25 }
      };

      const mockDraftWithContent = {
        ...mockDraftNewsletter,
        subject: 'Draft with Content',
        content: '<html>Generated content</html>',
        settings: JSON.stringify({ chunkSize: 25 })
      };

      mockSaveDraftNewsletter.mockResolvedValue(mockDraftWithContent);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockDraftWithContent);
      expect(mockSaveDraftNewsletter).toHaveBeenCalledWith(requestData);
    });

    it('should return validation error when subject is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts', {
        method: 'POST',
        body: JSON.stringify({
          introductionText: 'This is a new draft'
          // Missing subject
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Subject and introduction text are required');
      expect(mockSaveDraftNewsletter).not.toHaveBeenCalled();
    });

    it('should return validation error when introductionText is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Test Newsletter'
          // Missing introductionText
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Subject and introduction text are required');
      expect(mockSaveDraftNewsletter).not.toHaveBeenCalled();
    });

    it('should return validation error when both fields are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Subject and introduction text are required');
      expect(mockSaveDraftNewsletter).not.toHaveBeenCalled();
    });

    it('should handle service validation errors', async () => {
      const validationError = {
        name: 'NewsletterValidationError',
        message: 'Subject too long',
        toResponse: jest.fn().mockReturnValue({
          json: () => Promise.resolve({ error: 'Subject too long', type: 'NEWSLETTER' }),
          status: 400
        })
      };

      mockSaveDraftNewsletter.mockRejectedValue(validationError);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'A'.repeat(300), // Very long subject
          introductionText: 'Test intro'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create draft newsletter');
    });

    it('should handle database errors gracefully', async () => {
      mockSaveDraftNewsletter.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Test Newsletter',
          introductionText: 'Test intro'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create draft newsletter');
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create draft newsletter');
      expect(mockSaveDraftNewsletter).not.toHaveBeenCalled();
    });

    it('should trim whitespace from subject and introductionText', async () => {
      const trimmedNewsletter = {
        ...mockDraftNewsletter,
        subject: 'Trimmed Subject',
        introductionText: 'Trimmed introduction'
      };

      mockSaveDraftNewsletter.mockResolvedValue(trimmedNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts', {
        method: 'POST',
        body: JSON.stringify({
          subject: '  Trimmed Subject  ',
          introductionText: '  Trimmed introduction  '
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockSaveDraftNewsletter).toHaveBeenCalledWith({
        subject: 'Trimmed Subject',
        introductionText: 'Trimmed introduction'
      });
    });
  });
});