import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db/prisma';
import { subWeeks } from 'date-fns';
import type { StatusReport } from '@prisma/client';

interface GroupWithReports {
  group: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    metadata: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  reports: StatusReport[];
}

/**
 * GET /api/admin/newsletter/status-reports
 * 
 * Admin endpoint for getting status reports for the newsletter.
 * Returns status reports from the last 2 weeks, grouped by organization.
 * Groups are sorted alphabetically.
 * Authentication handled by middleware.
 * 
 * Query parameters:
 * - weeks: number (optional, default: 2) - Number of weeks back to fetch reports
 * 
 * Response:
 * - statusReportsByGroup: GroupWithReports[] - Array of groups with their recent reports
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const weeksParam = url.searchParams.get('weeks');
    const weeks = weeksParam ? parseInt(weeksParam, 10) : 2;
    
    // Validate weeks parameter
    if (weeks < 1 || weeks > 12) {
      logger.warn('Invalid weeks parameter for newsletter status reports', {
        context: { 
          operation: 'get_newsletter_status_reports',
          weeks 
        }
      });
      // Use default of 2 weeks if invalid
    }
    
    // Get the date N weeks ago
    const weeksAgo = subWeeks(new Date(), Math.min(Math.max(weeks, 1), 12));
    
    logger.info('Fetching newsletter status reports', {
      context: { 
        operation: 'get_newsletter_status_reports',
        weeks: Math.min(Math.max(weeks, 1), 12)
      }
    });
    
    // Get all active groups with their recent status reports
    const groups = await prisma.group.findMany({
      where: {
        status: 'ACTIVE'
      },
      orderBy: {
        name: 'asc' // Sort groups alphabetically
      },
      include: {
        statusReports: {
          where: {
            status: 'ACTIVE',
            createdAt: {
              gte: weeksAgo // Only reports from the specified time period
            }
          },
          orderBy: {
            createdAt: 'desc' // Latest reports first
          }
        }
      }
    });
    
    // Filter out groups with no reports and format response
    const statusReportsByGroup: GroupWithReports[] = groups
      .filter(group => group.statusReports.length > 0)
      .map(group => ({
        group: {
          id: Number(group.id),
          name: group.name,
          slug: group.slug,
          description: group.description,
          logoUrl: group.logoUrl,
          metadata: group.metadata,
          status: group.status,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt
        },
        reports: group.statusReports
      }));
    
    logger.info('Newsletter status reports fetched successfully', {
      context: {
        operation: 'get_newsletter_status_reports',
        groupsWithReports: statusReportsByGroup.length,
        totalReports: statusReportsByGroup.reduce((sum, group) => sum + group.reports.length, 0)
      }
    });
    
    return NextResponse.json({ statusReportsByGroup });
  } catch (error) {
    logger.error('Error fetching newsletter status reports', {
      context: {
        operation: 'get_newsletter_status_reports',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    return apiErrorResponse(error, 'Failed to fetch status reports');
  }
}