import { NextRequest, NextResponse } from 'next/server';
import { AIRefinementRequest, AIGenerationResponse } from '@/types/api-types';
import { logger } from '@/lib/logger';
import { aiService } from '@/lib/ai';
import { aiRefineTextSchema, zodToValidationResult } from '@/lib/validation';

/**
 * POST /api/admin/newsletter/ai/refine
 * 
 * Admin endpoint for refining generated newsletter intro text using AI.
 * Authentication handled by middleware.
 */
export async function POST(request: NextRequest) {
  try {
    const data: AIRefinementRequest = await request.json();

    // Validate with Zod schema
    const validation = await zodToValidationResult(aiRefineTextSchema, data);
    if (!validation.isValid) {
      logger.warn('Validation failed for AI refine text', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/ai/refine',
          method: 'POST',
          errors: validation.errors
        }
      });

      return NextResponse.json(
        { error: 'Validierungsfehler', errors: validation.errors, success: false, generatedText: '' } as AIGenerationResponse,
        { status: 400 }
      );
    }

    const validatedData = validation.data!;

    logger.debug('AI refinement request received', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/ai/refine',
        hasConversationHistory: !!validatedData.conversationHistory,
        conversationLength: validatedData.conversationHistory?.length || 0,
        hasInstructions: !!validatedData.refinementInstructions,
        instructionsLength: validatedData.refinementInstructions?.length || 0
      }
    });

    try {
      // Get last generated text from conversation history
      const lastAssistantMessage = validatedData.conversationHistory
        .slice()
        .reverse()
        .find(msg => msg.role === 'assistant');

      if (!lastAssistantMessage) {
        return NextResponse.json(
          { error: 'Kein generierter Text in der Konversationshistorie gefunden', success: false } as AIGenerationResponse,
          { status: 400 }
        );
      }

      // Refine text using AI service
      const refinedText = await aiService.refineIntro({
        generatedText: lastAssistantMessage.content,
        refinementRequest: validatedData.refinementInstructions,
        conversationHistory: validatedData.conversationHistory
      });

      return NextResponse.json({
        generatedText: refinedText,
        success: true
      } as AIGenerationResponse);
      
    } catch (error) {
      // Re-throw to handle in outer catch block
      throw error;
    }

  } catch (error) {
    logger.error(error as Error, {
      module: 'api',
      context: { 
        endpoint: '/api/admin/newsletter/ai/refine',
        operation: 'refineIntroText'
      }
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Fehler bei der Text-Verfeinerung. Bitte versuchen Sie es erneut.';
    const statusCode = errorMessage.includes('API-Schlüssel') ? 401 : 
                      errorMessage.includes('Ratenlimit') ? 429 : 500;
    
    return NextResponse.json(
      { error: errorMessage, success: false } as AIGenerationResponse,
      { status: statusCode }
    );
  }
}