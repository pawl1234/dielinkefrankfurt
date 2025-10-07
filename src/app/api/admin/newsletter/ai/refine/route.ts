import { NextRequest, NextResponse } from 'next/server';
import { ApiHandler, SimpleRouteContext, AIRefinementRequest, AIGenerationResponse } from '@/types/api-types';
import { withAdminAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { aiService } from '@/lib/ai';

/**
 * POST /api/admin/newsletter/ai/refine
 * 
 * Admin endpoint for refining generated newsletter intro text using AI.
 * Authentication required.
 */
export const POST: ApiHandler<SimpleRouteContext> = withAdminAuth(async (request: NextRequest) => {
  try {
    const data: AIRefinementRequest = await request.json();
    
    logger.debug('AI refinement request received', {
      module: 'api',
      context: { 
        endpoint: '/api/admin/newsletter/ai/refine',
        hasConversationHistory: !!data.conversationHistory,
        conversationLength: data.conversationHistory?.length || 0,
        hasInstructions: !!data.refinementInstructions,
        instructionsLength: data.refinementInstructions?.length || 0
      }
    });

    // Validate input
    if (!data.conversationHistory || data.conversationHistory.length === 0) {
      return NextResponse.json(
        { error: 'Konversationshistorie ist erforderlich', success: false } as AIGenerationResponse,
        { status: 400 }
      );
    }
    
    if (!data.refinementInstructions?.trim()) {
      return NextResponse.json(
        { error: 'Verfeinerungsanweisungen sind erforderlich', success: false } as AIGenerationResponse,
        { status: 400 }
      );
    }
    
    // Validate conversation history structure
    for (const message of data.conversationHistory) {
      if (!message.role || !message.content) {
        return NextResponse.json(
          { error: 'Ungültige Konversationshistorie', success: false } as AIGenerationResponse,
          { status: 400 }
        );
      }
      if (!['user', 'assistant'].includes(message.role)) {
        return NextResponse.json(
          { error: 'Ungültige Nachrichtenrolle in Konversationshistorie', success: false } as AIGenerationResponse,
          { status: 400 }
        );
      }
    }
    
    // Validate refinement instructions length 
    if (data.refinementInstructions.length > 2000) {
      return NextResponse.json(
        { error: 'Verfeinerungsanweisungen zu lang (max. 2000 Zeichen)', success: false } as AIGenerationResponse,
        { status: 400 }
      );
    }
    
    // Validate conversation history isn't too long (max 10 refinement cycles = 22 messages max)
    if (data.conversationHistory.length > 22) {
      return NextResponse.json(
        { error: 'Maximale Anzahl an Verfeinerungszyklen erreicht', success: false } as AIGenerationResponse,
        { status: 400 }
      );
    }

    try {
      // Get last generated text from conversation history
      const lastAssistantMessage = data.conversationHistory
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
        refinementRequest: data.refinementInstructions,
        conversationHistory: data.conversationHistory
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
});