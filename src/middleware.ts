import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Allow public paths
  if (path === '/') {
    return NextResponse.next();
  }
  
  // Get session token for authentication checks
  const session = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  
  // Handle API routes
  if (path.startsWith('/api/admin')) {
    // API authentication is handled by the withAdminAuth wrapper in each route
    // This middleware just ensures consistent behavior for API and UI routes
    if (!session || (session as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.next();
  }
  
  // Check authentication for admin UI paths
  if (path.startsWith('/admin')) {
    // Allow access to login page
    if (path === '/admin/login') {
      if (session) {
        // If already authenticated, redirect to admin dashboard
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.next();
    }
    
    // Check if authenticated for all other admin routes
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    
    // User is authenticated, allow access
    return NextResponse.next();
  }
  
  // Allow all other paths
  return NextResponse.next();
}

// Configure paths to match
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*' // Protect API admin routes
  ],
};