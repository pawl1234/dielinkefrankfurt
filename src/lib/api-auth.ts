import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Verifies that the request is authenticated with admin privileges
 * Returns the NextResponse with an error if unauthorized, or null if authorized
 */
export async function verifyAdminAccess(request: NextRequest): Promise<NextResponse | null> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

/**
 * Type for API handler functions
 */
export type ApiHandler = (request: NextRequest) => Promise<NextResponse>;

/**
 * Wraps an API handler with admin authentication
 * If the user is not authenticated, returns a 401 response
 * Otherwise, calls the handler
 */
export function withAdminAuth(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest) => {
    const unauthorized = await verifyAdminAccess(request);
    if (unauthorized) {
      return unauthorized;
    }
    
    return handler(request);
  };
}

/**
 * Helper for returning a 500 error response with consistent formatting
 */
export function serverErrorResponse(message: string = 'Internal Server Error'): NextResponse {
  console.error(`Server error: ${message}`);
  return NextResponse.json(
    { error: message },
    { status: 500 }
  );
}