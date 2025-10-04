import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/prisma';
import { 
  buildAIPrompt, 
  buildAIPromptWithExtractedTopics,
  buildRefinementPrompt
} from '@/lib/ai-prompts';
import { DEFAULT_AI_MODEL } from '@/lib/ai-models';
import logger from '@/lib/logger';

interface AIServiceConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface TopicExtractionParams {
  boardProtocol: string;
  topThemes: string;
  previousIntro?: string;
  topicExtractionPrompt?: string;
}

interface GenerateIntroParams {
  topThemes: string;
  previousIntro?: string;
  boardProtocol?: string;
  extractedTopics?: string;
}

interface RefineIntroParams {
  generatedText: string;
  refinementRequest: string;
  conversationHistory: Array<{ role: string; content: string }>;
}

export class AIService {
  private client: Anthropic | null = null;
  private config: AIServiceConfig;

  constructor(config?: Partial<AIServiceConfig>) {
    this.config = {
      apiKey: '',
      model: DEFAULT_AI_MODEL,
      maxTokens: 1000,
      temperature: 0.7,
      ...config
    };
  }

  /**
   * Initialize the AI service with settings from database
   */
  async initialize(): Promise<void> {
    const settings = await prisma.newsletter.findFirst();
    if (!settings?.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    this.config.apiKey = settings.anthropicApiKey;
    this.config.model = settings.aiModel || this.config.model;
    // Use default values for maxTokens and temperature as they're not in the schema
    this.config.maxTokens = this.config.maxTokens;
    this.config.temperature = this.config.temperature;

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
    });

    logger.info('AI service initialized', {
      context: {
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature
      }
    });
  }

  /**
   * Extract topics from board protocol
   */
  async extractTopics(params: TopicExtractionParams): Promise<string> {
    if (!this.client) {
      await this.initialize();
    }

    const { boardProtocol, topicExtractionPrompt } = params;

    logger.info('Extracting topics from board protocol', {
      context: {
        protocolLength: boardProtocol.length,
        hasCustomPrompt: !!topicExtractionPrompt
      }
    });

    // Get the prompt template from settings or use default
    const settings = await prisma.newsletter.findFirst();
    const promptTemplate = topicExtractionPrompt || settings?.aiTopicExtractionPrompt || 
      'Analysiere das folgende Vorstandsprotokoll und extrahiere die wichtigsten Themen und Beschlüsse.\n\nVorstandsprotokoll:\n{{boardProtocol}}';
    
    // Replace placeholder with actual protocol
    const prompt = promptTemplate.replace('{{boardProtocol}}', boardProtocol);

    if (process.env.NODE_ENV === 'development') {
      logger.debug('Topic extraction prompt', { context: { prompt } });
    }

    try {
      const message = await this.client!.messages.create({
        model: this.config.model!,
        max_tokens: 1000, // Smaller for extraction
        temperature: 0.3, // Lower for more focused extraction
        messages: [{ role: 'user', content: prompt }],
      });

      const extractedTopics = (message.content[0] as Anthropic.TextBlock).text;
      
      logger.info('Topics extracted successfully', {
        context: {
          extractedLength: extractedTopics.length
        }
      });

      return extractedTopics;
    } catch (error) {
      logger.error('Failed to extract topics', { context: { error } });
      throw this.handleAnthropicError(error);
    }
  }

  /**
   * Generate newsletter intro
   */
  async generateIntro(params: GenerateIntroParams): Promise<string> {
    if (!this.client) {
      await this.initialize();
    }

    const { topThemes, previousIntro, boardProtocol, extractedTopics } = params;

    logger.info('Generating newsletter intro', {
      context: {
        hasProtocol: !!boardProtocol,
        hasExtractedTopics: !!extractedTopics,
        hasPreviousIntro: !!previousIntro
      }
    });

    let prompt: string;
    
    // Get settings for custom prompts
    const settings = await prisma.newsletter.findFirst();
    const mainPrompt = settings?.aiSystemPrompt || 
      'Schreibe ein motivierendes Intro für den Newsletter der Partei DIE LINKE im Kreisverband Frankfurt.';
    
    if (extractedTopics) {
      // Use extracted topics approach (preferred when topics are pre-extracted)
      prompt = buildAIPromptWithExtractedTopics(mainPrompt, topThemes, extractedTopics, previousIntro || null);
    } else if (boardProtocol) {
      // Use board protocol approach (when raw protocol is provided)
      const vorstandsPrompt = settings?.aiVorstandsprotokollPrompt || null;
      prompt = buildAIPrompt(mainPrompt, vorstandsPrompt, topThemes, boardProtocol, previousIntro || null);
    } else {
      // Generate with only top themes (no board protocol)
      const vorstandsPrompt = null; // No board protocol prompt needed
      prompt = buildAIPrompt(mainPrompt, vorstandsPrompt, topThemes, null, previousIntro || null);
    }

    if (process.env.NODE_ENV === 'development') {
      logger.debug('Generation prompt', { 
        context: {
          promptLength: prompt.length,
          promptPreview: prompt.substring(0, 200) + '...'
        }
      });
    }

    try {
      const message = await this.client!.messages.create({
        model: this.config.model!,
        max_tokens: this.config.maxTokens!,
        temperature: this.config.temperature!,
        messages: [{ role: 'user', content: prompt }],
      });

      const generatedText = (message.content[0] as Anthropic.TextBlock).text;
      
      logger.info('Newsletter intro generated successfully', {
        context: {
          generatedLength: generatedText.length
        }
      });

      return generatedText;
    } catch (error) {
      logger.error('Failed to generate intro', { context: { error } });
      throw this.handleAnthropicError(error);
    }
  }

  /**
   * Refine generated intro
   */
  async refineIntro(params: RefineIntroParams): Promise<string> {
    if (!this.client) {
      await this.initialize();
    }

    const { refinementRequest, conversationHistory } = params;

    logger.info('Refining newsletter intro', {
      context: {
        refinementLength: refinementRequest.length,
        historyLength: conversationHistory.length
      }
    });

    const prompt = buildRefinementPrompt(refinementRequest);

    if (process.env.NODE_ENV === 'development') {
      logger.debug('Refinement prompt', { 
        context: {
          promptLength: prompt.length
        }
      });
    }

    try {
      const message = await this.client!.messages.create({
        model: this.config.model!,
        max_tokens: this.config.maxTokens!,
        temperature: this.config.temperature!,
        messages: [{ role: 'user', content: prompt }],
      });

      const refinedText = (message.content[0] as Anthropic.TextBlock).text;
      
      logger.info('Newsletter intro refined successfully', {
        context: {
          refinedLength: refinedText.length
        }
      });

      return refinedText;
    } catch (error) {
      logger.error('Failed to refine intro', { context: { error } });
      throw this.handleAnthropicError(error);
    }
  }

  /**
   * Handle Anthropic API errors
   */
  private handleAnthropicError(error: unknown): Error {
    if (error && typeof error === 'object' && error.constructor && error.constructor.name === 'APIError') {
      const apiError = error as { status?: number; message?: string };
      if (apiError.status === 401) {
        return new Error('Ungültiger Anthropic API-Schlüssel. Bitte überprüfen Sie die Einstellungen.');
      }
      if (apiError.status === 429) {
        return new Error('API-Ratenlimit erreicht. Bitte versuchen Sie es später erneut.');
      }
      return new Error(`Anthropic API Fehler: ${apiError.message || 'Unbekannt'}`);
    }
    
    if (error instanceof Error) {
      return error;
    }
    
    return new Error('Unbekannter Fehler bei der KI-Operation');
  }
}

// Export singleton instance
export const aiService = new AIService();