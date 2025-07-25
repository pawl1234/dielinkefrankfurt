import { POST } from '@/app/api/admin/newsletter/ai/refine/route';
import { NextRequest } from 'next/server';
import { AIRefinementRequest } from '@/types/api-types';
import { aiService } from '@/lib/ai-service';

// Mock dependencies
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

const mockAiService = aiService as jest.Mocked<typeof aiService>;

describe('AI Refinement API - /api/admin/newsletter/ai/refine', () => {
  const mockSession = {
    user: { email: 'admin@test.com', role: 'admin' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock valid admin token by default
    mockGetToken.mockResolvedValue({ role: 'admin' });
  });

  describe('POST', () => {
    it('should successfully refine generated text', async () => {
      const requestData: AIRefinementRequest = {
        conversationHistory: [
          {
            role: 'user',
            content: 'Generate intro with Climate demo on Saturday, Rent petition reaches 10,000 signatures'
          },
          {
            role: 'assistant', 
            content: 'Original generated text that needs refinement'
          }
        ],
        refinementInstructions: 'Make it more emotional and mention the new housing group speaker',
      };

      mockAiService.refineIntro.mockResolvedValue('Refined text with more emotion and housing group mention');

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/refine', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        generatedText: 'Refined text with more emotion and housing group mention',
        success: true,
      });
      expect(mockAiService.refineIntro).toHaveBeenCalledWith({
        generatedText: 'Original generated text that needs refinement',
        refinementRequest: 'Make it more emotional and mention the new housing group speaker',
        conversationHistory: requestData.conversationHistory,
      });
    });

    it('should work with multi-turn conversation', async () => {
      const requestData: AIRefinementRequest = {
        conversationHistory: [
          {
            role: 'user',
            content: 'Generate intro with New topics and New decisions'
          },
          {
            role: 'assistant', 
            content: 'First generated text'
          },
          {
            role: 'user',
            content: 'Make it more emotional'
          },
          {
            role: 'assistant',
            content: 'More emotional text'
          }
        ],
        refinementInstructions: 'Make it shorter',
      };

      mockAiService.refineIntro.mockResolvedValue('Shorter and better text');

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/refine', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.generatedText).toBe('Shorter and better text');
      expect(mockAiService.refineIntro).toHaveBeenCalledWith({
        generatedText: 'More emotional text', // Last assistant message
        refinementRequest: 'Make it shorter',
        conversationHistory: requestData.conversationHistory,
      });
    });

    it('should return 400 for missing conversation history', async () => {
      const requestData = {
        conversationHistory: [],
        refinementInstructions: 'Some instructions',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/refine', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Konversationshistorie ist erforderlich',
        success: false,
      });
    });

    it('should return 400 for invalid conversation history structure', async () => {
      const requestData = {
        conversationHistory: [
          { role: 'invalid', content: 'some content' }
        ],
        refinementInstructions: 'Some instructions',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/refine', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Ungültige Nachrichtenrolle in Konversationshistorie',
        success: false,
      });
    });

    it('should return 400 for conversation history exceeding max cycles', async () => {
      // Create conversation history with more than 22 messages (10 refinement cycles + initial)
      const longHistory = [];
      for (let i = 0; i < 24; i++) {
        longHistory.push({ 
          role: i % 2 === 0 ? 'user' : 'assistant', 
          content: `Message ${i}` 
        });
      }
      
      const requestData = {
        conversationHistory: longHistory,
        refinementInstructions: 'Some instructions',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/refine', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Maximale Anzahl an Verfeinerungszyklen erreicht',
        success: false,
      });
    });

    it('should return 400 for missing refinement instructions', async () => {
      const requestData = {
        conversationHistory: [
          { role: 'user', content: 'Original request' },
          { role: 'assistant', content: 'Generated text' }
        ],
        refinementInstructions: '',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/refine', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Verfeinerungsanweisungen sind erforderlich',
        success: false,
      });
    });

    it('should return 400 for too long refinement instructions', async () => {
      const requestData = {
        conversationHistory: [
          { role: 'user', content: 'Original request' },
          { role: 'assistant', content: 'Generated text' }
        ],
        refinementInstructions: 'a'.repeat(2001),
      };

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/refine', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Verfeinerungsanweisungen zu lang');
    });

    it('should return 400 for conversation history with missing content', async () => {
      const requestData = {
        conversationHistory: [
          { role: 'user', content: 'Valid message' },
          { role: 'assistant', content: '' } // Missing content
        ],
        refinementInstructions: 'Make it better',
      };

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/refine', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Ungültige Konversationshistorie');
    });



    it('should return 500 when API key is not configured', async () => {
      const requestData: AIRefinementRequest = {
        conversationHistory: [
          { role: 'user', content: 'Original request' },
          { role: 'assistant', content: 'Generated text' }
        ],
        refinementInstructions: 'Instructions',
      };

      mockAiService.refineIntro.mockRejectedValue(new Error('Anthropic API key not configured'));

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/refine', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Anthropic API key not configured');
    });

    it('should handle Anthropic rate limit errors', async () => {
      const requestData: AIRefinementRequest = {
        conversationHistory: [
          { role: 'user', content: 'Original request' },
          { role: 'assistant', content: 'Generated text' }
        ],
        refinementInstructions: 'Instructions',
      };

      mockAiService.refineIntro.mockRejectedValue(new Error('API-Ratenlimit erreicht. Bitte versuchen Sie es später erneut.'));

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/refine', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('API-Ratenlimit erreicht');
    });

    it('should handle general errors gracefully', async () => {
      const requestData: AIRefinementRequest = {
        conversationHistory: [
          { role: 'user', content: 'Original request' },
          { role: 'assistant', content: 'Generated text' }
        ],
        refinementInstructions: 'Instructions',
      };

      mockAiService.refineIntro.mockRejectedValue(new Error('Network error'));

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/refine', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Network error');
    });

    it('should return 401 when not authenticated', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/refine', {
        method: 'POST',
        body: JSON.stringify({ 
          conversationHistory: [
            { role: 'user', content: 'test' },
            { role: 'assistant', content: 'test' }
          ],
          refinementInstructions: 'test' 
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });
});