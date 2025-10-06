import { cleanupOldAnalytics } from '@/lib/newsletter';
import { logger } from '@/lib/logger';

/**
 * Run analytics cleanup job
 * Deletes analytics data older than 1 year
 */
export async function runAnalyticsCleanup(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    logger.info('Starting analytics cleanup job');
    
    const deletedCount = await cleanupOldAnalytics();
    
    logger.info('Analytics cleanup completed', {
      context: {
        deletedCount,
      },
    });
    
    return {
      success: true,
      deletedCount,
    };
  } catch (error) {
    logger.error('Analytics cleanup failed', {
      context: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}