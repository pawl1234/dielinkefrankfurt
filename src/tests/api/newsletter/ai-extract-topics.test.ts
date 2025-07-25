import { POST } from '@/app/api/admin/newsletter/ai/extract-topics/route';
import { getNewsletterSettings } from '@/lib/newsletter-service';
import { NextRequest } from 'next/server';
import { aiService } from '@/lib/ai-service';
import { DEFAULT_AI_MODEL } from '@/lib/ai-models';

// Mock dependencies
jest.mock('@/lib/newsletter-service');
jest.mock('@/lib/ai-service');
jest.mock('@/lib/api-auth', () => ({
  withAdminAuth: (handler: any) => handler,
}));
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockGetNewsletterSettings = getNewsletterSettings as jest.MockedFunction<typeof getNewsletterSettings>;
const mockAiService = aiService as jest.Mocked<typeof aiService>;

describe('/api/admin/newsletter/ai/extract-topics', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock newsletter settings
    mockGetNewsletterSettings.mockResolvedValue({
      anthropicApiKey: 'test-api-key',
      aiTopicExtractionPrompt: null,
      aiModel: null,
    } as any);
  });

  it('should extract topics successfully', async () => {
    const mockExtractedTopics = '• Climate action approved\n• Housing committee formed';
    
    mockAiService.extractTopics.mockResolvedValue(mockExtractedTopics);

    const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/extract-topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardProtocol: 'Board meeting discussed climate action and housing policies.',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.extractedTopics).toBe(mockExtractedTopics);
    expect(mockAiService.extractTopics).toHaveBeenCalledWith({
      boardProtocol: 'Board meeting discussed climate action and housing policies.',
      topThemes: '',
      previousIntro: undefined,
      topicExtractionPrompt: null,
    });
  });

  it('should use custom extraction prompt when provided', async () => {
    const customPrompt = 'Custom extraction prompt: {{boardProtocol}}';
    mockGetNewsletterSettings.mockResolvedValue({
      anthropicApiKey: 'test-api-key',
      aiTopicExtractionPrompt: customPrompt,
      aiModel: 'claude-3-opus-20240229',
    } as any);

    mockAiService.extractTopics.mockResolvedValue('• Topic extracted');

    const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/extract-topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardProtocol: 'Test protocol content',
      }),
    });

    await POST(request);

    expect(mockAiService.extractTopics).toHaveBeenCalledWith({
      boardProtocol: 'Test protocol content',
      topThemes: '',
      previousIntro: undefined,
      topicExtractionPrompt: customPrompt,
    });
  });

  it('should use default extraction prompt when none provided', async () => {
    mockAiService.extractTopics.mockResolvedValue('• Default extraction result');

    const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/extract-topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardProtocol: 'Test protocol content',
      }),
    });

    await POST(request);

    expect(mockAiService.extractTopics).toHaveBeenCalledWith({
      boardProtocol: 'Test protocol content',
      topThemes: '',
      previousIntro: undefined,
      topicExtractionPrompt: null,
    });
  });

  it('should return 400 when boardProtocol is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/extract-topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Vorstandsprotokoll ist erforderlich');
  });

  it('should return 400 when boardProtocol is empty', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/extract-topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardProtocol: '   ',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Vorstandsprotokoll ist erforderlich');
  });

  it('should return 400 when boardProtocol is too long', async () => {
    const longProtocol = 'a'.repeat(20001);
    
    const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/extract-topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardProtocol: longProtocol,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Vorstandsprotokoll zu lang (max. 20000 Zeichen)');
  });

  it('should return 500 when API key is not configured', async () => {
    mockAiService.extractTopics.mockRejectedValue(new Error('Anthropic API key not configured'));

    const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/extract-topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardProtocol: 'Test protocol',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Anthropic API key not configured');
  });

  it('should handle Anthropic API errors', async () => {
    mockAiService.extractTopics.mockRejectedValue(new Error('Ungültiger Anthropic API-Schlüssel. Bitte überprüfen Sie die Einstellungen.'));

    const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/extract-topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardProtocol: 'Test protocol',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Ungültiger Anthropic API-Schlüssel. Bitte überprüfen Sie die Einstellungen.');
  });

  it('should handle Anthropic rate limit errors', async () => {
    mockAiService.extractTopics.mockRejectedValue(new Error('API-Ratenlimit erreicht. Bitte versuchen Sie es später erneut.'));

    const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/extract-topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardProtocol: 'Test protocol',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.error).toBe('API-Ratenlimit erreicht. Bitte versuchen Sie es später erneut.');
  });

  it('should handle generic errors', async () => {
    mockAiService.extractTopics.mockRejectedValue(new Error('Network error'));

    const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/extract-topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardProtocol: 'Test protocol',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Network error');
  });

  it('should handle empty AI response', async () => {
    mockAiService.extractTopics.mockRejectedValue(new Error('Leere oder ungültige Antwort von der KI erhalten'));

    const request = new NextRequest('http://localhost:3000/api/admin/newsletter/ai/extract-topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardProtocol: 'Test protocol',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Leere oder ungültige Antwort von der KI erhalten');
  });
});