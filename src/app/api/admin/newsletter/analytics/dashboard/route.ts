import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  getRecentSentNewslettersWithAnalytics,
  getOverallAnalyticsMetrics,
  getTotalLinkClicks
} from '@/lib/db/newsletter-operations';
import { NewsletterAnalyticsDashboardResponse } from '@/types/newsletter-analytics';

/**
 * GET /api/admin/newsletter/analytics/dashboard
 * 
 * Retrieves overall analytics dashboard data for newsletters
 */
async function handleGetAnalyticsDashboard(): Promise<NextResponse> {
  try {
    // Get recent newsletters with analytics
    const recentNewsletters = await getRecentSentNewslettersWithAnalytics(10);

    // Calculate metrics for recent newsletters using unique opens for clean statistics
    const recentNewslettersData = recentNewsletters.map((newsletter) => {
      const analytics = newsletter.analytics;
      const openRate = analytics && analytics.totalRecipients > 0
        ? (analytics.uniqueOpens / analytics.totalRecipients) * 100
        : 0;
      
      const clickCount = analytics
        ? analytics.linkClicks.reduce((sum, click) => sum + click.clickCount, 0)
        : 0;

      return {
        id: newsletter.id,
        subject: newsletter.subject,
        sentAt: newsletter.sentAt,
        recipientCount: newsletter.recipientCount,
        openRate,
        clickCount,
      };
    });

    // Calculate overall metrics with optimized aggregation queries
    const [overallMetrics, totalClicks] = await Promise.all([
      getOverallAnalyticsMetrics(),
      getTotalLinkClicks(),
    ]);

    const totalUniqueOpens = overallMetrics._sum.uniqueOpens || 0;
    const totalRecipients = overallMetrics._sum.totalRecipients || 0;
    const totalNewsletters = overallMetrics._count.id || 0;
    const totalClickCount = totalClicks._sum.clickCount || 0;

    const averageOpenRate = totalRecipients > 0
      ? (totalUniqueOpens / totalRecipients) * 100
      : 0;

    const response: NewsletterAnalyticsDashboardResponse = {
      recentNewsletters: recentNewslettersData,
      overallMetrics: {
        totalNewsletters,
        averageOpenRate,
        totalClicks: totalClickCount,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching analytics dashboard:', { context: { error } });
    return apiErrorResponse(error, 'Failed to fetch analytics dashboard');
  }
}

export const GET = handleGetAnalyticsDashboard;