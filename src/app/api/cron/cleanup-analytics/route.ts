import { NextRequest, NextResponse } from 'next/server';
import { runAnalyticsCleanup } from '@/lib/analytics-cleanup';
import { logger } from '@/lib/logger';

/**
 * GET /api/cron/cleanup-analytics
 * 
 * Cron job endpoint to clean up old analytics data
 * Should be called daily via a cron service like Vercel Cron or GitHub Actions
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication for cron endpoints
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    logger.info('Analytics cleanup cron job triggered');
    
    const result = await runAnalyticsCleanup();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${result.deletedCount} analytics records`,
        deletedCount: result.deletedCount,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error in analytics cleanup cron job:', {
      context: { error },
    });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}