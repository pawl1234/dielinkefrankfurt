import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const pathname = req.nextUrl.pathname;

      if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
        return token?.role === 'admin';
      }

      if (pathname.startsWith('/portal') || pathname.startsWith('/api/portal')) {
        return token?.role === 'admin' || token?.role === 'mitglied';
      }

      return !!token;
    },
  },
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    '/admin/:path*',
    '/portal/:path*',
    '/api/admin/:path*',
    '/api/portal/:path*',
  ],
};
