import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock all external dependencies
jest.mock('@/lib/prisma');
jest.mock('@/lib/newsletter-archive');
jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: jest.fn((handler) => handler)
}));
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Import modules after mocking
import prisma from '@/lib/prisma';
import { listSentNewsletters, getNewsletterById, archiveNewsletter } from '@/lib/newsletter-archive';

// Import API endpoints
import { GET as getArchives, POST as createArchive } from '@/app/api/admin/newsletter/archives/route';
import { GET as getArchiveById, DELETE as deleteArchive } from '@/app/api/admin/newsletter/archives/[id]/route';
import { GET as getDrafts, POST as createDraft } from '@/app/api/admin/newsletter/drafts/route';
import { GET as getDraftById, PUT as updateDraft, DELETE as deleteDraft } from '@/app/api/admin/newsletter/drafts/[id]/route';

// Mock types
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockListSentNewsletters = listSentNewsletters as jest.MockedFunction<typeof listSentNewsletters>;
const mockGetNewsletterById = getNewsletterById as jest.MockedFunction<typeof getNewsletterById>;
const mockArchiveNewsletter = archiveNewsletter as jest.MockedFunction<typeof archiveNewsletter>;

describe('Newsletter Archive Integration Tests', () => {
  // Mock data
  const mockNewsletterItem = {
    id: 'newsletter-123',
    content: '<html>Newsletter Content</html>',
    subject: 'Test Newsletter - December 2024',
    status: 'SENT',
    recipientCount: 150,
    sentAt: new Date('2024-12-20T10:00:00Z'),
    createdAt: new Date('2024-12-20T09:30:00Z'),
    updatedAt: new Date('2024-12-20T10:00:00Z'),
    settings: {
      fromEmail: 'newsletter@example.com',
      fromName: 'Test Newsletter',
      totalSent: 145,
      totalFailed: 5,
      chunkResults: [
        {
          sentCount: 50,
          failedCount: 0,
          completedAt: '2024-12-20T10:00:00Z',
          results: []
        },
        {
          sentCount: 50,
          failedCount: 2,
          completedAt: '2024-12-20T10:01:00Z',
          results: [
            { email: 'user1@example.com', success: false, error: 'Mailbox full' },
            { email: 'user2@example.com', success: false, error: 'Invalid recipient' }
          ]
        },
        {
          sentCount: 45,
          failedCount: 3,
          completedAt: '2024-12-20T10:02:00Z',
          results: [
            { email: 'user3@example.com', success: false, error: 'SMTP timeout' },
            { email: 'user4@example.com', success: false, error: 'Temporary failure' },
            { email: 'user5@example.com', success: false, error: 'Rejected by server' }
          ]
        }
      ],
      failedEmails: ['user1@example.com', 'user2@example.com', 'user3@example.com', 'user4@example.com', 'user5@example.com']
    }
  };

  const mockDraftItem = {
    id: 'draft-456',
    content: '<html>Draft Newsletter Content</html>',
    subject: 'Draft Newsletter - January 2025',
    status: 'DRAFT',
    recipientCount: 0,
    sentAt: null,
    createdAt: new Date('2024-12-21T14:00:00Z'),
    updatedAt: new Date('2024-12-21T14:30:00Z'),
    settings: {
      fromEmail: 'newsletter@example.com',
      fromName: 'Test Newsletter'
    }
  };

  const mockPaginatedResult = {
    items: [mockNewsletterItem],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockListSentNewsletters.mockResolvedValue(mockPaginatedResult);
    mockGetNewsletterById.mockResolvedValue(mockNewsletterItem);
    mockArchiveNewsletter.mockResolvedValue(mockNewsletterItem);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Newsletter Archive Management', () => {
    it('should list archived newsletters with pagination', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives?page=1&limit=10');

      const response = await getArchives(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].id).toBe('newsletter-123');
      expect(data.items[0].subject).toBe('Test Newsletter - December 2024');
      expect(data.items[0].status).toBe('SENT');
      expect(data.pagination.total).toBe(1);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.totalPages).toBe(1);

      expect(mockListSentNewsletters).toHaveBeenCalledWith({
        page: 1,
        limit: 10
      });
    });

    it('should list archived newsletters with search functionality', async () => {
      const searchResult = {
        ...mockPaginatedResult,
        items: [
          {
            ...mockNewsletterItem,
            subject: 'December Newsletter - Holiday Edition'
          }
        ]
      };

      mockListSentNewsletters.mockResolvedValue(searchResult);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives?search=December&page=1&limit=10');

      const response = await getArchives(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].subject).toContain('December');

      expect(mockListSentNewsletters).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'December'
      });
    });

    it('should retrieve individual archived newsletter with detailed information', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives/newsletter-123');
      const context = { params: Promise.resolve({ id: 'newsletter-123' }) };

      const response = await getArchiveById(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('newsletter-123');
      expect(data.subject).toBe('Test Newsletter - December 2024');
      expect(data.status).toBe('SENT');
      expect(data.recipientCount).toBe(150);
      expect(data.settings.totalSent).toBe(145);
      expect(data.settings.totalFailed).toBe(5);
      expect(data.settings.failedEmails).toHaveLength(5);

      expect(mockGetNewsletterById).toHaveBeenCalledWith('newsletter-123');
    });

    it('should handle failed recipients viewing through API', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives/newsletter-123');
      const context = { params: Promise.resolve({ id: 'newsletter-123' }) };

      const response = await getArchiveById(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Verify failed recipients information is available
      expect(data.settings.failedEmails).toEqual([
        'user1@example.com',
        'user2@example.com', 
        'user3@example.com',
        'user4@example.com',
        'user5@example.com'
      ]);

      // Verify chunk results contain detailed error information
      expect(data.settings.chunkResults).toHaveLength(3);
      expect(data.settings.chunkResults[1].results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: 'user1@example.com',
            success: false,
            error: 'Mailbox full'
          }),
          expect.objectContaining({
            email: 'user2@example.com',
            success: false,
            error: 'Invalid recipient'
          })
        ])
      );
    });

    it('should create new archive from completed newsletter sending', async () => {
      const archiveData = {
        content: '<html>Completed Newsletter</html>',
        subject: 'Weekly Newsletter - December 2024',
        recipientCount: 200,
        settings: {
          fromEmail: 'newsletter@example.com',
          fromName: 'Weekly Newsletter',
          totalSent: 195,
          totalFailed: 5,
          completedAt: new Date().toISOString()
        }
      };

      mockArchiveNewsletter.mockResolvedValue({
        ...mockNewsletterItem,
        ...archiveData,
        id: 'newsletter-new-archive'
      });

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives', {
        method: 'POST',
        body: JSON.stringify(archiveData)
      });

      const response = await createArchive(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('newsletter-new-archive');
      expect(data.subject).toBe('Weekly Newsletter - December 2024');
      expect(data.status).toBe('SENT');
      expect(data.recipientCount).toBe(200);

      expect(mockArchiveNewsletter).toHaveBeenCalledWith(archiveData);
    });

    it('should delete archived newsletter', async () => {
      mockPrisma.newsletterItem.delete.mockResolvedValue(mockNewsletterItem);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives/newsletter-123', {
        method: 'DELETE'
      });
      const context = { params: Promise.resolve({ id: 'newsletter-123' }) };

      const response = await deleteArchive(request, context);

      expect(response.status).toBe(204);

      expect(mockPrisma.newsletterItem.delete).toHaveBeenCalledWith({
        where: { id: 'newsletter-123' }
      });
    });
  });

  describe('Newsletter Draft Management', () => {
    it('should list newsletter drafts', async () => {
      mockPrisma.newsletterItem.findMany.mockResolvedValue([mockDraftItem]);
      mockPrisma.newsletterItem.count.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts?page=1&limit=10');

      const response = await getDrafts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].id).toBe('draft-456');
      expect(data.items[0].status).toBe('DRAFT');
      expect(data.items[0].sentAt).toBeNull();

      expect(mockPrisma.newsletterItem.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['DRAFT', 'SENDING'] }
        },
        orderBy: { updatedAt: 'desc' },
        skip: 0,
        take: 10
      });
    });

    it('should create new newsletter draft', async () => {
      const draftData = {
        content: '<html>New Draft Content</html>',
        subject: 'New Draft Newsletter',
        settings: {
          fromEmail: 'newsletter@example.com',
          fromName: 'Test Newsletter'
        }
      };

      mockPrisma.newsletterItem.create.mockResolvedValue({
        ...mockDraftItem,
        ...draftData,
        id: 'draft-new'
      });

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts', {
        method: 'POST',
        body: JSON.stringify(draftData)
      });

      const response = await createDraft(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('draft-new');
      expect(data.subject).toBe('New Draft Newsletter');
      expect(data.status).toBe('DRAFT');

      expect(mockPrisma.newsletterItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: '<html>New Draft Content</html>',
          subject: 'New Draft Newsletter',
          status: 'DRAFT',
          settings: expect.objectContaining({
            fromEmail: 'newsletter@example.com',
            fromName: 'Test Newsletter'
          })
        })
      });
    });

    it('should retrieve individual draft', async () => {
      mockPrisma.newsletterItem.findUnique.mockResolvedValue(mockDraftItem);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts/draft-456');
      const context = { params: Promise.resolve({ id: 'draft-456' }) };

      const response = await getDraftById(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('draft-456');
      expect(data.status).toBe('DRAFT');
      expect(data.sentAt).toBeNull();

      expect(mockPrisma.newsletterItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'draft-456' }
      });
    });

    it('should update draft newsletter', async () => {
      const updatedDraft = {
        ...mockDraftItem,
        subject: 'Updated Draft Newsletter',
        content: '<html>Updated Draft Content</html>',
        updatedAt: new Date()
      };

      mockPrisma.newsletterItem.update.mockResolvedValue(updatedDraft);

      const updateData = {
        subject: 'Updated Draft Newsletter',
        content: '<html>Updated Draft Content</html>'
      };

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts/draft-456', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      const context = { params: Promise.resolve({ id: 'draft-456' }) };

      const response = await updateDraft(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.subject).toBe('Updated Draft Newsletter');
      expect(data.content).toBe('<html>Updated Draft Content</html>');

      expect(mockPrisma.newsletterItem.update).toHaveBeenCalledWith({
        where: { id: 'draft-456' },
        data: expect.objectContaining({
          subject: 'Updated Draft Newsletter',
          content: '<html>Updated Draft Content</html>',
          updatedAt: expect.any(Date)
        })
      });
    });

    it('should delete draft newsletter', async () => {
      mockPrisma.newsletterItem.delete.mockResolvedValue(mockDraftItem);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/drafts/draft-456', {
        method: 'DELETE'
      });
      const context = { params: Promise.resolve({ id: 'draft-456' }) };

      const response = await deleteDraft(request, context);

      expect(response.status).toBe(204);

      expect(mockPrisma.newsletterItem.delete).toHaveBeenCalledWith({
        where: { id: 'draft-456' }
      });
    });
  });

  describe('Archive Search and Filtering', () => {
    it('should search archives by subject keywords', async () => {
      const searchResults = {
        items: [
          {
            ...mockNewsletterItem,
            subject: 'Holiday Newsletter - December 2024'
          },
          {
            ...mockNewsletterItem,
            id: 'newsletter-124',
            subject: 'Year-end Newsletter - December 2024'
          }
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      mockListSentNewsletters.mockResolvedValue(searchResults);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives?search=December%202024');

      const response = await getArchives(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
      expect(data.items[0].subject).toContain('December 2024');
      expect(data.items[1].subject).toContain('December 2024');

      expect(mockListSentNewsletters).toHaveBeenCalledWith({
        search: 'December 2024',
        page: 1,
        limit: 10
      });
    });

    it('should filter archives by date range', async () => {
      const dateFilterResults = {
        items: [mockNewsletterItem],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      mockListSentNewsletters.mockResolvedValue(dateFilterResults);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives?dateFrom=2024-12-01&dateTo=2024-12-31');

      const response = await getArchives(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);

      expect(mockListSentNewsletters).toHaveBeenCalledWith({
        dateFrom: '2024-12-01',
        dateTo: '2024-12-31',
        page: 1,
        limit: 10
      });
    });

    it('should filter archives by sending status', async () => {
      const statusFilterResults = {
        items: [
          {
            ...mockNewsletterItem,
            status: 'SENT_WITH_FAILURES',
            settings: {
              ...mockNewsletterItem.settings,
              totalSent: 140,
              totalFailed: 10
            }
          }
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      mockListSentNewsletters.mockResolvedValue(statusFilterResults);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives?status=SENT_WITH_FAILURES');

      const response = await getArchives(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].status).toBe('SENT_WITH_FAILURES');
      expect(data.items[0].settings.totalFailed).toBe(10);

      expect(mockListSentNewsletters).toHaveBeenCalledWith({
        status: 'SENT_WITH_FAILURES',
        page: 1,
        limit: 10
      });
    });

    it('should handle empty search results', async () => {
      const emptyResults = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      };

      mockListSentNewsletters.mockResolvedValue(emptyResults);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives?search=nonexistent');

      const response = await getArchives(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(0);
      expect(data.pagination.total).toBe(0);

      expect(mockListSentNewsletters).toHaveBeenCalledWith({
        search: 'nonexistent',
        page: 1,
        limit: 10
      });
    });
  });

  describe('Failed Recipients Management', () => {
    it('should provide detailed failed recipient information', async () => {
      const newsletterWithFailures = {
        ...mockNewsletterItem,
        status: 'SENT_WITH_FAILURES',
        settings: {
          ...mockNewsletterItem.settings,
          totalSent: 145,
          totalFailed: 5,
          failedEmails: ['user1@example.com', 'user2@example.com'],
          chunkResults: [
            {
              sentCount: 48,
              failedCount: 2,
              completedAt: '2024-12-20T10:00:00Z',
              results: [
                { email: 'user1@example.com', success: false, error: 'Mailbox full' },
                { email: 'user2@example.com', success: false, error: 'Invalid recipient' }
              ]
            }
          ]
        }
      };

      mockGetNewsletterById.mockResolvedValue(newsletterWithFailures);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives/newsletter-123');
      const context = { params: Promise.resolve({ id: 'newsletter-123' }) };

      const response = await getArchiveById(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.settings.failedEmails).toEqual(['user1@example.com', 'user2@example.com']);
      expect(data.settings.chunkResults[0].results).toEqual([
        { email: 'user1@example.com', success: false, error: 'Mailbox full' },
        { email: 'user2@example.com', success: false, error: 'Invalid recipient' }
      ]);
    });

    it('should show newsletter without failures correctly', async () => {
      const successfulNewsletter = {
        ...mockNewsletterItem,
        status: 'SENT',
        settings: {
          ...mockNewsletterItem.settings,
          totalSent: 150,
          totalFailed: 0,
          failedEmails: [],
          chunkResults: [
            {
              sentCount: 50,
              failedCount: 0,
              completedAt: '2024-12-20T10:00:00Z',
              results: []
            },
            {
              sentCount: 50,
              failedCount: 0,
              completedAt: '2024-12-20T10:01:00Z',
              results: []
            },
            {
              sentCount: 50,
              failedCount: 0,
              completedAt: '2024-12-20T10:02:00Z',
              results: []
            }
          ]
        }
      };

      mockGetNewsletterById.mockResolvedValue(successfulNewsletter);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives/newsletter-success');
      const context = { params: Promise.resolve({ id: 'newsletter-success' }) };

      const response = await getArchiveById(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('SENT');
      expect(data.settings.totalSent).toBe(150);
      expect(data.settings.totalFailed).toBe(0);
      expect(data.settings.failedEmails).toEqual([]);
    });
  });

  describe('Archive Export and Reporting', () => {
    it('should provide newsletter statistics for reporting', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives/newsletter-123');
      const context = { params: Promise.resolve({ id: 'newsletter-123' }) };

      const response = await getArchiveById(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Verify comprehensive statistics are available
      expect(data.recipientCount).toBe(150);
      expect(data.settings.totalSent).toBe(145);
      expect(data.settings.totalFailed).toBe(5);
      expect(data.sentAt).toBeDefined();
      expect(data.settings.chunkResults).toHaveLength(3);

      // Calculate success rate
      const successRate = (data.settings.totalSent / data.recipientCount) * 100;
      expect(successRate).toBeCloseTo(96.67, 2);
    });

    it('should handle newsletter export data format', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives/newsletter-123?format=export');
      const context = { params: Promise.resolve({ id: 'newsletter-123' }) };

      const response = await getArchiveById(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Verify all export-relevant data is present
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('subject');
      expect(data).toHaveProperty('content');
      expect(data).toHaveProperty('sentAt');
      expect(data).toHaveProperty('recipientCount');
      expect(data.settings).toHaveProperty('totalSent');
      expect(data.settings).toHaveProperty('totalFailed');
      expect(data.settings).toHaveProperty('chunkResults');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing newsletter gracefully', async () => {
      mockGetNewsletterById.mockRejectedValue(new Error('Newsletter not found'));

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives/nonexistent');
      const context = { params: Promise.resolve({ id: 'nonexistent' }) };

      const response = await getArchiveById(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });

    it('should handle database errors during listing', async () => {
      mockListSentNewsletters.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives');

      const response = await getArchives(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should validate archive creation data', async () => {
      const invalidData = {
        // Missing required fields
        content: '',
        subject: ''
      };

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/archives', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await createArchive(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });
});