import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { subWeeks } from 'date-fns';

/**
 * GET /api/admin/newsletter/status-reports
 * 
 * Admin endpoint for getting status reports for the newsletter.
 * Returns status reports from the last 2 weeks, grouped by organization.
 * Groups are sorted alphabetically.
 * Authentication required.
 */
export const GET = withAdminAuth(async () => {
  try {
    // Get the date 2 weeks ago
    const twoWeeksAgo = subWeeks(new Date(), 2);
    
    // Get all active groups
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
              gte: twoWeeksAgo // Only reports from the last 2 weeks
            }
          },
          orderBy: {
            createdAt: 'desc' // Latest reports first
          }
        }
      }
    });
    
    // Filter out groups with no reports
    const statusReportsByGroup = groups
      .filter(group => group.statusReports.length > 0)
      .map(group => ({
        group: {
          id: group.id,
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
    
    return NextResponse.json({ statusReportsByGroup });
  } catch (error) {
    console.error('Error fetching status reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status reports' },
      { status: 500 }
    );
  }
});