import { NextRequest, NextResponse } from 'next/server';
import { ApiHandler, SimpleRouteContext, AIGenerationWithTopicsRequest, AIGenerationResponse } from '@/types/api-types';
import { withAdminAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { aiService } from '@/lib/ai';
import prisma from '@/lib/db/prisma';

/**
 * POST /api/admin/newsletter/ai/generate
 * 
 * Admin endpoint for generating newsletter intro text using AI.
 * Authentication required.
 */
export const POST: ApiHandler<SimpleRouteContext> = withAdminAuth(async (request: NextRequest) => {
  try {
    const data: AIGenerationWithTopicsRequest = await request.json();
    
    logger.debug('AI generation request received', {
      module: 'api',
      context: { 
        endpoint: '/api/admin/newsletter/ai/generate',
        hasTopThemes: !!data.topThemes,
        hasBoardProtocol: !!data.boardProtocol,
        hasExtractedTopics: !!data.extractedTopics,
        topThemesLength: data.topThemes?.length || 0,
        boardProtocolLength: data.boardProtocol?.length || 0,
        extractedTopicsLength: data.extractedTopics?.length || 0
      }
    });

    // Validate input
    if (!data.topThemes?.trim()) {
      return NextResponse.json(
        { error: 'Top Themen sind erforderlich', success: false } as AIGenerationResponse,
        { status: 400 }
      );
    }
    
    // Validate input length
    if (data.topThemes.length > 5000) {
      return NextResponse.json(
        { error: 'Top Themen zu lang (max. 5000 Zeichen)', success: false } as AIGenerationResponse,
        { status: 400 }
      );
    }
    
    // Validate boardProtocol length if provided (now optional)
    if (data.boardProtocol && data.boardProtocol.length > 10000) {
      return NextResponse.json(
        { error: 'Vorstandsprotokoll zu lang (max. 10000 Zeichen)', success: false } as AIGenerationResponse,
        { status: 400 }
      );
    }
    
    // Validate extractedTopics length if provided
    if (data.extractedTopics && data.extractedTopics.length > 5000) {
      return NextResponse.json(
        { error: 'Extrahierte Themen zu lang (max. 5000 Zeichen)', success: false } as AIGenerationResponse,
        { status: 400 }
      );
    }

    // Get previous newsletter intro if not provided
    let previousIntro = data.previousIntro || '';
    if (!previousIntro) {
      try {
        const lastNewsletter = await prisma.newsletterItem.findFirst({
          where: { status: 'sent' },
          orderBy: { sentAt: 'desc' },
          select: { introductionText: true }
        });
        
        if (lastNewsletter?.introductionText) {
          previousIntro = lastNewsletter.introductionText;
          logger.debug('Found previous newsletter intro', {
            module: 'api',
            context: { 
              endpoint: '/api/admin/newsletter/ai/generate',
              previousIntroLength: previousIntro.length
            }
          });
        }
      } catch (error) {
        logger.warn('Failed to fetch previous newsletter intro', {
          module: 'api',
          context: { 
            endpoint: '/api/admin/newsletter/ai/generate',
            error: (error as Error).message
          }
        });
      }
    }

    try {
      // Generate intro using AI service
      const generatedText = await aiService.generateIntro({
        topThemes: data.topThemes,
        previousIntro,
        boardProtocol: data.boardProtocol,
        extractedTopics: data.extractedTopics
      });

      return NextResponse.json({
        generatedText,
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
        endpoint: '/api/admin/newsletter/ai/generate',
        operation: 'generateIntroText'
      }
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Fehler bei der KI-Generierung. Bitte versuchen Sie es erneut.';
    const statusCode = errorMessage.includes('API-Schlüssel') ? 401 : 
                      errorMessage.includes('Ratenlimit') ? 429 : 500;
    
    return NextResponse.json(
      { error: errorMessage, success: false } as AIGenerationResponse,
      { status: statusCode }
    );
  }
});