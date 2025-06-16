import { NextRequest, NextResponse } from 'next/server';
import { getToken, JWT } from 'next-auth/jwt';
import { AppError, apiErrorResponse, ErrorType } from './errors';

// Extended JWT interface with role
interface AdminJWT extends JWT {
  role?: string;
}

/**
 * Verifies that the request is authenticated with admin privileges
 * Returns the NextResponse with an error if unauthorized, or null if authorized
 */
export async function verifyAdminAccess(request: NextRequest): Promise<NextResponse | null> {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return AppError.authentication('Authentication token missing').toResponse();
    }
    
    if ((token as AdminJWT).role !== 'admin') {
      return AppError.authorization('Admin role required').toResponse();
    }

    return null;
  } catch (error) {
    console.error('Error verifying admin access:', error);
    return apiErrorResponse(error, 'Authentication error');
  }
}


/**
 * Type for API handler functions with generic context
 */
export type ApiHandler<TContext = unknown> = (request: NextRequest, context: TContext) => Promise<NextResponse>;

/**
 * Wraps an API handler with admin authentication
 * If the user is not authenticated, returns a 401 response
 * Otherwise, calls the handler
 * 
 * Uses generics to preserve the exact type signature of the wrapped handler
 */
export function withAdminAuth<TContext = unknown>(
  handler: (request: NextRequest, context: TContext) => Promise<NextResponse>
): (request: NextRequest, context: TContext) => Promise<NextResponse> {
  return async (request: NextRequest, context: TContext) => {
    try {
      const unauthorized = await verifyAdminAccess(request);
      if (unauthorized) {
        return unauthorized;
      }
      
      return await handler(request, context);
    } catch (error) {
      // In case of error in the handler, provide centralized error handling
      return apiErrorResponse(error);
    }
  };
}

/**
 * Helper for returning a 500 error response with consistent formatting
 * @deprecated Use apiErrorResponse from errors.ts instead
 */
export function serverErrorResponse(message: string = 'Internal Server Error'): NextResponse {
  console.error(`Server error: ${message}`);
  return new AppError(message, ErrorType.UNKNOWN, 500).toResponse();
}