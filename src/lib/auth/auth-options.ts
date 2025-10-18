import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { findUserByCredentials } from './session';
import { logger } from '@/lib/logger';
import { UserRole } from '@/types/user';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      // Copy your existing configuration here
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          logger.warn('Authorization failed: Missing credentials', { module: 'auth' });
          return null;
        }

        try {
          return await findUserByCredentials(
            credentials.username,
            credentials.password
          );
        } catch (error) {
          logger.error('Error during authentication', { context: { error }, module: 'auth' });
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role as UserRole;
        token.isEnvironmentUser = (user as { isEnvironmentUser?: boolean }).isEnvironmentUser || false;
      }
      return token;
    },
    async session({ session, token }) {
        if (session.user) {
            session.user.id = token.id;
            session.user.role = token.role;
            session.user.username = token.username;
            session.user.isEnvironmentUser = token.isEnvironmentUser;
        }
        return session;
    }
  },
  pages: { signIn: '/login' },
  debug: process.env.NODE_ENV === 'development',
  session: { strategy: 'jwt' }
};