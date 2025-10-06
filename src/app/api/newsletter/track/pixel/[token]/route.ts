import { NextRequest, NextResponse } from 'next/server';
import { recordOpenEvent, TRANSPARENT_GIF_BUFFER } from '@/lib/newsletter';
import { createFingerprint } from '@/lib/analytics';

/**
 * GET /api/newsletter/track/pixel/[token]
 * 
 * Tracks newsletter opens by serving a 1x1 transparent GIF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Extract fingerprint from request headers and IP
  const fingerprint = createFingerprint(request);

  // Record the open event asynchronously with fingerprint
  // Don't await to keep response fast
  recordOpenEvent(token, fingerprint);

  // Return 1x1 transparent GIF
  return new NextResponse(TRANSPARENT_GIF_BUFFER, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': TRANSPARENT_GIF_BUFFER.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}