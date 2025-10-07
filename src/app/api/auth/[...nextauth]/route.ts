// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Export handler functions with proper HTTP method names
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };