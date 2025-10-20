import { NextRequest, NextResponse } from 'next/server';
import { AITopicExtractionRequest, AITopicExtractionResponse } from '@/types/api-types';
import { logger } from '@/lib/logger';
import { getNewsletterSettings } from '@/lib/newsletter';
import { aiService } from '@/lib/ai';

/**
 * POST /api/admin/newsletter/ai/extract-topics
 * 
 * Admin endpoint for extracting topics from Vorstandsprotokoll using AI.
 * Authentication handled by middleware.
 */
export async function POST(request: NextRequest) {
  try {
    const data: AITopicExtractionRequest = await request.json();
    
    logger.debug('AI topic extraction request received', {
      module: 'api',
      context: { 
        endpoint: '/api/admin/newsletter/ai/extract-topics',
        boardProtocolLength: data.boardProtocol?.length || 0
      }
    });

    // Validate input
    if (!data.boardProtocol?.trim()) {
      return NextResponse.json(
        { error: 'Vorstandsprotokoll ist erforderlich', success: false } as AITopicExtractionResponse,
        { status: 400 }
      );
    }
    
    // Validate input length
    if (data.boardProtocol.length > 20000) {
      return NextResponse.json(
        { error: 'Vorstandsprotokoll zu lang (max. 20000 Zeichen)', success: false } as AITopicExtractionResponse,
        { status: 400 }
      );
    }

    // Get newsletter settings for custom prompt
    const settings = await getNewsletterSettings();
    
    try {
      // Extract topics using AI service
      const extractedTopics = await aiService.extractTopics({
        boardProtocol: data.boardProtocol,
        topThemes: '',
        previousIntro: undefined,
        topicExtractionPrompt: settings.aiTopicExtractionPrompt
      });

      return NextResponse.json({
        extractedTopics,
        success: true
      } as AITopicExtractionResponse);
      
    } catch (error) {
      // Re-throw to handle in outer catch block
      throw error;
    }

  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: { 
        endpoint: '/api/admin/newsletter/ai/extract-topics',
        operation: 'extractTopics'
      }
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Fehler bei der Themen-Extraktion. Bitte versuchen Sie es erneut.';
    const statusCode = errorMessage.includes('API-Schlüssel') ? 401 : 
                      errorMessage.includes('Ratenlimit') ? 429 : 500;
    
    return NextResponse.json(
      { error: errorMessage, success: false } as AITopicExtractionResponse,
      { status: statusCode }
    );
  }
}