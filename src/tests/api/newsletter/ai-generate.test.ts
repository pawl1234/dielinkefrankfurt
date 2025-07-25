import { POST } from '@/app/api/admin/newsletter/ai/generate/route';
import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { AIGenerationRequest, AIGenerationWithTopicsRequest } from '@/types/api-types';
import { aiService } from '@/lib/ai-service';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    newsletterItem: {
      findFirst: jest.fn(),
    },
  },
}));
jest.mock('@/lib/ai-service');
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock next-auth JWT token for authentication
const mockGetToken = jest.fn();
jest.mock('next-auth/jwt', () => ({
  getToken: (...args: unknown[]) => mockGetToken(...args),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockAiService = aiService as jest.Mocked<typeof aiService>;

describe('AI Generation API - /api/admin/newsletter/ai/generate', () => {
  const mockSession = {
    user: { email: 'admin@test.com', role: 'admin' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock valid admin token by default
    mockGetToken.mockResolvedValue({ role: 'admin' });
  });

  describe('POST', () => {
    it('should successfully generate intro text', async () => {
      const requestData: AIGenerationRequest = {
        topThemes: 'Climate demo on Saturday, Rent petition reaches 10,000 signatures',
        boardProtocol: 'Decision: Support climate demo with own booth',
      };

      mockPrisma.newsletterItem.findFirst.mockResolvedValue(null);
      mockAiService.generateIntro.mockResolvedValue('Generated intro text here...');

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/generate', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        generatedText: 'Generated intro text here...',
        success: true,
      });
      expect(mockAiService.generateIntro).toHaveBeenCalledWith({
        topThemes: 'Climate demo on Saturday, Rent petition reaches 10,000 signatures',
        previousIntro: '',
        boardProtocol: 'Decision: Support climate demo with own booth',
        extractedTopics: undefined,
      });
    });

    it('should use previous newsletter intro when not provided', async () => {
      const requestData: AIGenerationRequest = {
        topThemes: 'New topics',
        boardProtocol: 'New decisions',
      };

      mockPrisma.newsletterItem.findFirst.mockResolvedValue({
        id: '1',
        subject: 'Previous Newsletter',
        introductionText: 'Previous intro text',
        content: null,
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: new Date(),
        recipientCount: 100,
        settings: null,
      });

      mockAiService.generateIntro.mockResolvedValue('Generated with previous context');

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/generate', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.newsletterItem.findFirst).toHaveBeenCalledWith({
        where: { status: 'sent' },
        orderBy: { sentAt: 'desc' },
        select: { introductionText: true },
      });
      expect(mockAiService.generateIntro).toHaveBeenCalledWith({
        topThemes: 'New topics',
        previousIntro: 'Previous intro text',
        boardProtocol: 'New decisions',
        extractedTopics: undefined,
      });
    });

    it('should return 400 for missing top themes', async () => {
      const requestData = {
        topThemes: '',
        boardProtocol: 'Some protocol',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/generate', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Top Themen sind erforderlich',
        success: false,
      });
    });

    it('should successfully generate intro text without board protocol', async () => {
      const requestData: AIGenerationRequest = {
        topThemes: 'Climate demo on Saturday, Rent petition reaches 10,000 signatures',
        // boardProtocol is now optional
      };

      mockPrisma.newsletterItem.findFirst.mockResolvedValue(null);
      mockAiService.generateIntro.mockResolvedValue('Generated intro text without board protocol');

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/generate', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        generatedText: 'Generated intro text without board protocol',
        success: true,
      });
      
      expect(mockAiService.generateIntro).toHaveBeenCalledWith({
        topThemes: 'Climate demo on Saturday, Rent petition reaches 10,000 signatures',
        previousIntro: '',
        boardProtocol: undefined,
        extractedTopics: undefined,
      });
    });

    it('should return 400 for missing top themes', async () => {
      const requestData = {
        topThemes: '',
        boardProtocol: 'Some protocol',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/generate', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Top Themen sind erforderlich',
        success: false,
      });
    });

    it('should return 400 for too long inputs', async () => {
      const requestData = {
        topThemes: 'a'.repeat(5001),
        boardProtocol: 'Some protocol',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/generate', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Top Themen zu lang');
    });

    it('should return 500 when API key is not configured', async () => {
      const requestData: AIGenerationRequest = {
        topThemes: 'Themes',
        boardProtocol: 'Protocol',
      };

      mockPrisma.newsletterItem.findFirst.mockResolvedValue(null);
      mockAiService.generateIntro.mockRejectedValue(new Error('Anthropic API key not configured'));

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/generate', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Anthropic API key not configured');
    });

    it('should handle Anthropic API errors gracefully', async () => {
      const requestData: AIGenerationRequest = {
        topThemes: 'Themes',
        boardProtocol: 'Protocol',
      };

      mockPrisma.newsletterItem.findFirst.mockResolvedValue(null);
      mockAiService.generateIntro.mockRejectedValue(new Error('Ungültiger Anthropic API-Schlüssel. Bitte überprüfen Sie die Einstellungen.'));

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/generate', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Ungültiger Anthropic API-Schlüssel. Bitte überprüfen Sie die Einstellungen.');
    });

    it('should return 401 when not authenticated', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/generate', {
        method: 'POST',
        body: JSON.stringify({ topThemes: 'test', boardProtocol: 'test' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should generate intro with extracted topics', async () => {
      const requestData: AIGenerationWithTopicsRequest = {
        topThemes: 'Climate demo on Saturday',
        extractedTopics: '• Housing committee formed\n• Climate policy approved',
      };

      mockPrisma.newsletterItem.findFirst.mockResolvedValue({
        introductionText: 'Previous intro',
      } as any);

      mockAiService.generateIntro.mockResolvedValue('Generated intro with extracted topics');

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/generate', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        generatedText: 'Generated intro with extracted topics',
        success: true,
      });
      
      expect(mockAiService.generateIntro).toHaveBeenCalledWith({
        topThemes: 'Climate demo on Saturday',
        previousIntro: 'Previous intro',
        boardProtocol: undefined,
        extractedTopics: '• Housing committee formed\n• Climate policy approved',
      });
    });

    it('should fallback to raw protocol when no extracted topics provided', async () => {
      const requestData: AIGenerationWithTopicsRequest = {
        topThemes: 'Climate demo on Saturday',
        boardProtocol: 'Housing committee formed, climate policy approved',
      };

      mockPrisma.newsletterItem.findFirst.mockResolvedValue({
        introductionText: 'Previous intro',
      } as any);

      mockAiService.generateIntro.mockResolvedValue('Generated intro with raw protocol');

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/generate', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        generatedText: 'Generated intro with raw protocol',
        success: true,
      });
      
      expect(mockAiService.generateIntro).toHaveBeenCalledWith({
        topThemes: 'Climate demo on Saturday',
        previousIntro: 'Previous intro',
        boardProtocol: 'Housing committee formed, climate policy approved',
        extractedTopics: undefined,
      });
    });

    it('should return 400 for too long extracted topics', async () => {
      const requestData: AIGenerationWithTopicsRequest = {
        topThemes: 'Climate demo',
        extractedTopics: 'a'.repeat(5001),
      };

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/generate', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Extrahierte Themen zu lang (max. 5000 Zeichen)',
        success: false,
      });
    });
  });
});