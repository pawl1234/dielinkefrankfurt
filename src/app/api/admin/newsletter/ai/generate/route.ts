import { NextRequest, NextResponse } from 'next/server';
import { AIGenerationWithTopicsRequest, AIGenerationResponse } from '@/types/api-types';
import { logger } from '@/lib/logger';
import { aiService } from '@/lib/ai';
import { getAllNewsletterItems } from '@/lib/db/newsletter-operations';
import { aiGenerateIntroSchema, zodToValidationResult } from '@/lib/validation';

/**
 * POST /api/admin/newsletter/ai/generate
 *
 * Admin endpoint for generating newsletter intro text using AI.
 * Authentication handled by middleware.
 */
export async function POST(request: NextRequest) {
  try {
    const data: AIGenerationWithTopicsRequest = await request.json();

    // Validate with Zod schema
    const validation = await zodToValidationResult(aiGenerateIntroSchema, data);
    if (!validation.isValid) {
      logger.warn('Validation failed for AI generate intro', {
        module: 'api',
        context: {
          endpoint: '/api/admin/newsletter/ai/generate',
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

    logger.debug('AI generation request received', {
      module: 'api',
      context: {
        endpoint: '/api/admin/newsletter/ai/generate',
        hasTopThemes: !!validatedData.topThemes,
        hasBoardProtocol: !!validatedData.boardProtocol,
        hasExtractedTopics: !!validatedData.extractedTopics,
        topThemesLength: validatedData.topThemes?.length || 0,
        boardProtocolLength: validatedData.boardProtocol?.length || 0,
        extractedTopicsLength: validatedData.extractedTopics?.length || 0
      }
    });

    // Get previous newsletter intro if not provided
    let previousIntro = validatedData.previousIntro || '';
    if (!previousIntro) {
      try {
        const [lastNewsletter] = await getAllNewsletterItems({
          status: 'sent',
          sortBy: 'sentAt',
          sortOrder: 'desc',
          limit: 1
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
        topThemes: validatedData.topThemes,
        previousIntro,
        boardProtocol: validatedData.boardProtocol,
        extractedTopics: validatedData.extractedTopics
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
}