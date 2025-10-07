import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth';
import { apiErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db/prisma';
import { NewsletterAnalyticsResponse } from '@/types/newsletter-analytics';

/**
 * GET /api/admin/newsletter/analytics/[newsletterId]
 * 
 * Retrieves analytics data for a specific newsletter
 */
async function handleGetNewsletterAnalytics(
  request: NextRequest,
  { params }: { params: Promise<{ newsletterId: string }> }
): Promise<NextResponse> {
  try {
    const { newsletterId } = await params;

    // Debug logging
    logger.info('Fetching analytics for newsletter', { context: { newsletterId } });
    
    // Check if prisma is available
    if (!prisma || !prisma.newsletterAnalytics) {
      logger.error('Prisma client or newsletterAnalytics model not available');
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Get analytics with related data in a single optimized query
    const analytics = await prisma.newsletterAnalytics.findUnique({
      where: { newsletterId },
      include: {
        newsletter: {
          select: {
            id: true,
            subject: true,
            sentAt: true,
          },
        },
        linkClicks: {
          orderBy: { clickCount: 'desc' },
        },
      },
    });

    if (!analytics) {
      // Check if the newsletter exists
      const newsletter = await prisma.newsletterItem.findUnique({
        where: { id: newsletterId },
        select: { id: true, subject: true, status: true, sentAt: true }
      });
      
      if (!newsletter) {
        return NextResponse.json(
          { error: 'Newsletter not found' },
          { status: 404 }
        );
      }
      
      // Newsletter exists but no analytics - might be sent before analytics feature
      logger.warn('Analytics not found for newsletter', { 
        context: { 
          newsletterId, 
          newsletterStatus: newsletter.status,
          sentAt: newsletter.sentAt 
        } 
      });
      
      return NextResponse.json(
        { 
          error: 'Analytics not available for this newsletter',
          details: 'This newsletter may have been sent before analytics tracking was enabled'
        },
        { status: 404 }
      );
    }

    // Calculate open rates and engagement metrics
    const openRate = analytics.totalRecipients > 0
      ? (analytics.totalOpens / analytics.totalRecipients) * 100
      : 0;
    
    const uniqueOpenRate = analytics.totalRecipients > 0
      ? (analytics.uniqueOpens / analytics.totalRecipients) * 100
      : 0;
    
    const repeatOpens = Math.max(0, analytics.totalOpens - analytics.uniqueOpens);
    const repeatOpenRate = analytics.uniqueOpens > 0
      ? (repeatOpens / analytics.uniqueOpens) * 100
      : 0;
    
    const averageOpensPerRecipient = analytics.totalRecipients > 0
      ? analytics.totalOpens / analytics.totalRecipients
      : 0;


    // Format enhanced link performance data
    const linkPerformance = analytics.linkClicks?.map((click) => ({
      url: click.url,
      linkType: click.linkType,
      linkId: click.linkId,
      totalClicks: click.clickCount,
      uniqueClicks: click.uniqueClicks || 0,
      uniqueClickRate: click.clickCount > 0 
        ? ((click.uniqueClicks || 0) / click.clickCount) * 100 
        : 0,
      firstClick: click.firstClick,
      lastClick: click.lastClick,
    })) || [];

    const response: NewsletterAnalyticsResponse = {
      analytics: {
        id: analytics.id,
        newsletterId: analytics.newsletterId,
        totalRecipients: analytics.totalRecipients,
        totalOpens: analytics.totalOpens,
        uniqueOpens: analytics.uniqueOpens,
        pixelToken: analytics.pixelToken,
        createdAt: analytics.createdAt,
      },
      newsletter: analytics.newsletter || { id: '', subject: '', sentAt: null },
      openRate,
      uniqueOpenRate,
      repeatOpenRate,
      linkPerformance,
      engagementMetrics: {
        totalOpens: analytics.totalOpens,
        uniqueOpens: analytics.uniqueOpens,
        repeatOpens,
        averageOpensPerRecipient,
        totalLinkClicks: analytics.linkClicks?.reduce((sum: number, click) => sum + click.clickCount, 0) || 0,
        uniqueLinkClicks: analytics.linkClicks?.reduce((sum: number, click) => sum + (click.uniqueClicks || 0), 0) || 0,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching newsletter analytics:', { context: { error } });
    return apiErrorResponse(error, 'Failed to fetch newsletter analytics');
  }
}

export const GET = withAdminAuth(handleGetNewsletterAnalytics);