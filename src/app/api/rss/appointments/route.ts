import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/rss/appointments
 * 
 * Provides an RSS feed of accepted appointments.
 * Returns XML formatted as RSS 2.0.
 */
export async function GET(request: NextRequest) {
  try {
    // Get the host for absolute URLs
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Get all accepted appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'accepted'
      },
      orderBy: {
        startDateTime: 'asc'
      },
      select: {
        id: true,
        title: true,
        teaser: true,
        startDateTime: true,
        city: true
      }
    });

    // Create RSS XML
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Die Linke Frankfurt - Termine</title>
    <link>${baseUrl}</link>
    <description>Alle genehmigten Termine der Linken Frankfurt</description>
    <language>de-de</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/rss/appointments" rel="self" type="application/rss+xml" />
    ${appointments.map(appointment => {
      // Create a valid pubDate
      const pubDate = new Date(appointment.startDateTime).toUTCString();
      
      // Create a safe description (escape HTML)
      const safeTeaser = appointment.teaser
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      
      // Create a safe title (escape HTML)
      const safeTitle = appointment.title
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      
      return `
    <item>
      <title>${safeTitle}</title>
      <description>${safeTeaser}</description>
      <link>${baseUrl}/termine/${appointment.id}</link>
      <guid isPermaLink="true">${baseUrl}/termine/${appointment.id}</guid>
      <pubDate>${pubDate}</pubDate>
      ${appointment.city ? `<category>${appointment.city}</category>` : ''}
    </item>`;
    }).join('')}
  </channel>
</rss>`;

    // Return the RSS feed with appropriate content type
    // Use text/xml instead of application/rss+xml to make browsers display it properly
    return new NextResponse(rssXml, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Cache-Control': 'max-age=3600, s-maxage=3600', // Cache for 1 hour
      }
    });
  } catch (_error) {
    console.error('Error generating RSS feed:', _error);
    // Return a plain text error message with 500 status
    return new NextResponse('Error generating RSS feed', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      }
    });
  }
}