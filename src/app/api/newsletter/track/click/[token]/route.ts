import { NextRequest, NextResponse } from 'next/server';
import { recordLinkClick } from '@/lib/newsletter';
import { createFingerprint } from '@/lib/analytics';

/**
 * GET /api/newsletter/track/click/[token]
 * 
 * Tracks link clicks and redirects to the original URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { searchParams } = new URL(request.url);
  
  const encodedUrl = searchParams.get('url');
  const linkType = searchParams.get('type');
  const linkId = searchParams.get('id');
  
  // Validate required parameters
  if (!encodedUrl || !linkType) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }
  
  // Decode the URL
  let decodedUrl: string;
  try {
    decodedUrl = Buffer.from(encodedUrl, 'base64url').toString('utf8');
  } catch {
    return NextResponse.json(
      { error: 'Invalid URL encoding' },
      { status: 400 }
    );
  }
  
  // Validate URL to prevent open redirects
  try {
    const url = new URL(decodedUrl);
    
    // Build allowed hosts with proper hostname:port handling
    const allowedHosts = [];
    
    // Add production URL if available
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      allowedHosts.push(process.env.VERCEL_PROJECT_PRODUCTION_URL);
    }
    
    // Add localhost variants for development
    allowedHosts.push('localhost', '127.0.0.1');
    
    // Check if the URL's hostname is in our allowed list
    const isAllowedHost = allowedHosts.some(host => {
      return url.hostname === host || url.hostname.endsWith(`.${host}`);
    });
    
    // For localhost, also check if it's running on port 3000 (development)
    const isLocalhost = (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    const isCorrectPort = url.port === '3000' || (url.port === '' && url.protocol === 'http:');
    
    if (!isAllowedHost) {
      console.log('Rejected URL - invalid host:', decodedUrl, 'hostname:', url.hostname, 'port:', url.port);
      return NextResponse.json(
        { error: 'Invalid redirect URL' },
        { status: 400 }
      );
    }
    
    if (isLocalhost && !isCorrectPort) {
      console.log('Rejected URL - invalid port:', decodedUrl, 'hostname:', url.hostname, 'port:', url.port);
      return NextResponse.json(
        { error: 'Invalid redirect URL' },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid URL format' },
      { status: 400 }
    );
  }
  
  // Extract fingerprint from request headers and IP for unique tracking
  const fingerprint = createFingerprint(request);
  
  // Record the click asynchronously with fingerprint
  // Don't await to keep redirect fast
  recordLinkClick(token, decodedUrl, linkType, linkId || undefined, fingerprint);
  
  // Redirect to the original URL
  return NextResponse.redirect(decodedUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}