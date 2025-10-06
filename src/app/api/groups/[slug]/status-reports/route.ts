import { NextRequest, NextResponse } from 'next/server';
import { getStatusReportsByGroupSlug } from '@/lib/groups';

/**
 * GET /api/groups/[slug]/status-reports
 * 
 * Public endpoint for retrieving all active status reports for a specific group.
 * Returns only status reports with ACTIVE status, sorted by date (newest first).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let slug: string = '';
  try {
    const paramData = await params;
    slug = paramData.slug;
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Group slug is required' },
        { status: 400 }
      );
    }
    
    const statusReports = await getStatusReportsByGroupSlug(slug);
    
    return NextResponse.json(statusReports);
  } catch (error) {
    console.error(`Error fetching status reports for group ${slug}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch status reports' },
      { status: 500 }
    );
  }
}