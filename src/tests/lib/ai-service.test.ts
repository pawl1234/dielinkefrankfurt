import { AIService } from '@/lib/ai-service';
import prisma from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import logger from '@/lib/logger';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    newsletter: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@anthropic-ai/sdk');

jest.mock('@/lib/logger', () => {
  return {
    __esModule: true,
    default: {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    },
  };
});

jest.mock('@/lib/ai-models', () => ({
  DEFAULT_AI_MODEL: 'claude-3-opus-20240229',
}));

jest.mock('@/lib/ai-prompts', () => ({
  buildAIPrompt: jest.fn((systemPrompt, vorstandsPrompt, topThemes, boardProtocol, previousIntro) => {
    return `System: ${systemPrompt}\nThemes: ${topThemes}\nProtocol: ${boardProtocol || 'none'}\nPrevious: ${previousIntro || 'none'}`;
  }),
  buildAIPromptWithExtractedTopics: jest.fn((topThemes, extractedTopics, previousIntro) => {
    return `Themes: ${topThemes}\nExtracted: ${extractedTopics}\nPrevious: ${previousIntro || 'none'}`;
  }),
  buildTopicExtractionPrompt: jest.fn(),
  buildRefinementPrompt: jest.fn((generatedText, refinementRequest, conversationHistory) => {
    return `Refine: ${refinementRequest}\nText: ${generatedText}\nHistory: ${conversationHistory.length} messages`;
  }),
}));

describe('AIService', () => {
  let aiService: AIService;
  let mockAnthropicClient: jest.Mocked<Anthropic>;
  
  const mockSettings = {
    anthropicApiKey: 'test-api-key',
    aiModel: 'claude-3-opus-20240229',
    aiMaxTokens: 1000,
    aiTemperature: 0.7,
    aiTopicExtractionPrompt: 'Custom extraction prompt {{boardProtocol}}',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    aiService = new AIService();
    
    // Mock Anthropic client
    mockAnthropicClient = {
      messages: {
        create: jest.fn(),
      },
    } as any;
    
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => mockAnthropicClient);
  });

  describe('initialize', () => {
    it('should initialize with settings from database', async () => {
      (prisma.newsletter.findFirst as jest.Mock).mockResolvedValue(mockSettings);

      await aiService.initialize();

      expect(prisma.newsletter.findFirst).toHaveBeenCalled();
      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
      expect(logger.info).toHaveBeenCalledWith('AI service initialized', expect.any(Object));
    });

    it('should throw error if API key not configured', async () => {
      (prisma.newsletter.findFirst as jest.Mock).mockResolvedValue({});

      await expect(aiService.initialize()).rejects.toThrow('Anthropic API key not configured');
    });
  });

  describe('extractTopics', () => {
    beforeEach(async () => {
      (prisma.newsletter.findFirst as jest.Mock).mockResolvedValue(mockSettings);
      await aiService.initialize();
    });

    it('should extract topics from board protocol', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Extracted topics here' }],
      };
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse as any);

      const result = await aiService.extractTopics({
        boardProtocol: 'Board meeting notes',
        topThemes: 'Theme 1, Theme 2',
        topicExtractionPrompt: 'Extract topics: {{boardProtocol}}',
      });

      expect(result).toBe('Extracted topics here');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [{ role: 'user', content: 'Extract topics: Board meeting notes' }],
      });
    });

    it('should handle Anthropic API errors', async () => {
      const apiError = new Error('Unauthorized');
      apiError.constructor = { name: 'APIError' } as any;
      (apiError as any).status = 401;
      mockAnthropicClient.messages.create.mockRejectedValue(apiError);

      await expect(aiService.extractTopics({
        boardProtocol: 'Board meeting notes',
        topThemes: 'Theme 1',
      })).rejects.toThrow('Ungültiger Anthropic API-Schlüssel');
    });

    it('should handle rate limit errors', async () => {
      const apiError = new Error('Rate limited');
      apiError.constructor = { name: 'APIError' } as any;
      (apiError as any).status = 429;
      mockAnthropicClient.messages.create.mockRejectedValue(apiError);

      await expect(aiService.extractTopics({
        boardProtocol: 'Board meeting notes',
        topThemes: 'Theme 1',
      })).rejects.toThrow('API-Ratenlimit erreicht');
    });
  });

  describe('generateIntro', () => {
    beforeEach(async () => {
      (prisma.newsletter.findFirst as jest.Mock).mockResolvedValue(mockSettings);
      await aiService.initialize();
    });

    it('should generate intro with extracted topics', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Generated intro text' }],
      };
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse as any);

      const result = await aiService.generateIntro({
        topThemes: 'Theme 1, Theme 2',
        extractedTopics: 'Topic A, Topic B',
        previousIntro: 'Previous intro',
      });

      expect(result).toBe('Generated intro text');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        temperature: 0.7,
        messages: expect.any(Array),
      });
    });

    it('should generate intro with board protocol', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Generated intro text' }],
      };
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse as any);

      const result = await aiService.generateIntro({
        topThemes: 'Theme 1, Theme 2',
        boardProtocol: 'Board meeting notes',
        previousIntro: 'Previous intro',
      });

      expect(result).toBe('Generated intro text');
      expect(logger.info).toHaveBeenCalledWith(
        'Generating newsletter intro',
        expect.objectContaining({
          context: expect.objectContaining({
            hasProtocol: true,
            hasExtractedTopics: false,
          })
        })
      );
    });

    it('should generate intro with only topThemes (no board protocol)', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Generated intro without protocol' }],
      };
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse as any);

      const result = await aiService.generateIntro({
        topThemes: 'Theme 1, Theme 2',
        previousIntro: 'Previous intro',
      });

      expect(result).toBe('Generated intro without protocol');
      expect(logger.info).toHaveBeenCalledWith(
        'Generating newsletter intro',
        expect.objectContaining({
          context: expect.objectContaining({
            hasProtocol: false,
            hasExtractedTopics: false,
          })
        })
      );
    });
  });

  describe('refineIntro', () => {
    beforeEach(async () => {
      (prisma.newsletter.findFirst as jest.Mock).mockResolvedValue(mockSettings);
      await aiService.initialize();
    });

    it('should refine generated intro', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Refined intro text' }],
      };
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse as any);

      const conversationHistory = [
        { role: 'user', content: 'Generate intro' },
        { role: 'assistant', content: 'Original intro' },
      ];

      const result = await aiService.refineIntro({
        generatedText: 'Original intro',
        refinementRequest: 'Make it shorter',
        conversationHistory,
      });

      expect(result).toBe('Refined intro text');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        temperature: 0.7,
        messages: expect.any(Array),
      });
    });

    it('should log refinement details', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Refined text' }],
      };
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse as any);

      await aiService.refineIntro({
        generatedText: 'Original text',
        refinementRequest: 'Improve it',
        conversationHistory: [],
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Refining newsletter intro',
        expect.objectContaining({
          context: expect.objectContaining({
            refinementLength: 10,
            historyLength: 0,
          })
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle generic errors', async () => {
      (prisma.newsletter.findFirst as jest.Mock).mockResolvedValue(mockSettings);
      await aiService.initialize();
      
      const genericError = new Error('Network error');
      mockAnthropicClient.messages.create.mockRejectedValue(genericError);

      await expect(aiService.generateIntro({
        topThemes: 'Theme 1',
        boardProtocol: 'Protocol',
      })).rejects.toThrow('Network error');
    });

    it('should handle non-Error objects', async () => {
      (prisma.newsletter.findFirst as jest.Mock).mockResolvedValue(mockSettings);
      await aiService.initialize();
      
      mockAnthropicClient.messages.create.mockRejectedValue('String error');

      await expect(aiService.generateIntro({
        topThemes: 'Theme 1',
        boardProtocol: 'Protocol',
      })).rejects.toThrow('Unbekannter Fehler bei der KI-Operation');
    });
  });
});